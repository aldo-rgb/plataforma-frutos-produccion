import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    console.log('🔵 [CHECKOUT] Iniciando procesamiento de pago...');
    
    const session = await getServerSession(authOptions);
    console.log('🔵 [CHECKOUT] Sesión:', session?.user?.email);

    if (!session?.user) {
      console.log('❌ [CHECKOUT] No hay sesión');
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    console.log('🔵 [CHECKOUT] Usuario:', { id: user?.id, rol: user?.rol, orgId: user?.organizationId });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      console.log('❌ [CHECKOUT] Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, paymentMethod } = body;
    console.log('🔵 [CHECKOUT] Datos recibidos:', { orderId, paymentMethod });

    if (!orderId || !paymentMethod) {
      console.log('❌ [CHECKOUT] Datos incompletos');
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    console.log('🔵 [CHECKOUT] Buscando orden...');
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    console.log('🔵 [CHECKOUT] Orden encontrada:', order ? `ID: ${order.id}, Status: ${order.status}` : 'NO ENCONTRADA');

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Esta orden ya ha sido procesada' }, { status: 400 });
    }

    // Obtener paymentData existente
    let existingPaymentData: any = {};
    try {
      if (order.paymentData) {
        if (typeof order.paymentData === 'string') {
          existingPaymentData = JSON.parse(order.paymentData);
        } else {
          existingPaymentData = order.paymentData;
        }
      }
    } catch (error) {
      console.error('Error parseando paymentData:', error);
    }

    // Marcar orden como completada (simulación de pago)
    const updatedOrder = await prisma.licenseOrder.update({
      where: { id: orderId },
      data: {
        status: 'COMPLETED',
        paymentMethod: paymentMethod,
        paidAt: new Date(),
        paymentData: {
          ...(typeof existingPaymentData === 'object' ? existingPaymentData : {}),
          method: paymentMethod,
          status: 'completed',
          paidAt: new Date().toISOString(),
          transactionId: `${paymentMethod.toUpperCase()}-${orderId.slice(0, 8)}-${Date.now()}`,
        },
      },
    });

    console.log('✅ Pago de visión completado:', {
      orderId: updatedOrder.id,
      paymentMethod,
      amount: updatedOrder.amount,
    });

    // 🎯 ASIGNAR MENTORES A LA VISIÓN Y ACREDITAR LLAMADAS
    if (existingPaymentData.type === 'VISION_MENTOR_PAYMENT') {
      const visionId = existingPaymentData.visionId;
      const mentorAssignments = existingPaymentData.mentorAssignments || [];
      const totalStudents = existingPaymentData.totalStudents || 0;

      console.log('📋 Procesando asignaciones:', {
        visionId,
        mentorAssignments: mentorAssignments.length,
        totalStudents,
      });

      // 1. Asignar cada mentor a la visión (si no está ya asignado)
      for (const assignment of mentorAssignments) {
        const { mentorId, studentCount } = assignment;

        console.log(`🔍 Procesando mentor ID: ${mentorId}`);

        // El mentorId ya es el usuario ID, no el perfil mentor ID
        // Verificar si ya está asignado
        const existingAssignment = await prisma.visionMentor.findFirst({
          where: {
            visionId: visionId,
            mentorId: mentorId,
          },
        });

        if (!existingAssignment) {
          // Crear asignación
          await prisma.visionMentor.create({
            data: {
              visionId: visionId,
              mentorId: mentorId,
              asignadoPorId: user.id,
            },
          });
          console.log(`✅ Mentor ${mentorId} asignado a visión ${visionId}`);
        } else {
          console.log(`ℹ️ Mentor ${mentorId} ya estaba asignado a visión ${visionId}`);
        }
      }

      // 2. Acreditar llamadas a la organización
      // Calcular total de llamadas: totalStudents × 18 llamadas por paquete
      const callsPerStudent = 18; // 18 llamadas por paquete de mentoría
      const totalCalls = totalStudents * callsPerStudent;

      console.log('💰 Acreditando llamadas:', {
        totalStudents,
        callsPerStudent,
        totalCalls,
        amount: updatedOrder.amount,
      });

      // Buscar o crear registro de créditos para esta organización
      let schoolCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: user.organizationId!,
          isActive: true,
        },
      });

      if (schoolCredit) {
        // Actualizar créditos existentes
        schoolCredit = await prisma.schoolCredit.update({
          where: { id: schoolCredit.id },
          data: {
            totalPurchased: schoolCredit.totalPurchased + totalCalls,
            totalPaid: schoolCredit.totalPaid + updatedOrder.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
            updatedAt: new Date(),
          },
        });
      } else {
        // Crear nuevo registro de créditos
        schoolCredit = await prisma.schoolCredit.create({
          data: {
            organizationId: user.organizationId!,
            planType: 'STANDARD',
            totalPurchased: totalCalls,
            totalAllocated: 0,
            unitPrice: updatedOrder.amount / totalCalls,
            totalPaid: updatedOrder.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
            isActive: true,
            notes: `Llamadas de mentoría para visión ${visionId} - Orden ${orderId}`,
            updatedAt: new Date(),
          },
        });
      }

      console.log('✅ Llamadas acreditadas:', {
        totalCalls,
        totalPurchased: schoolCredit.totalPurchased,
      });

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        mentorsAssigned: mentorAssignments.length,
        callsCredits: totalCalls,
        totalCredits: schoolCredit.totalPurchased,
        message: 'Pago procesado, mentores asignados y llamadas acreditadas exitosamente',
      });
    }

    return NextResponse.json({
      success: true,
      order: updatedOrder,
      message: 'Pago procesado exitosamente',
    });
  } catch (error: any) {
    console.error('❌ Error procesando pago de visión:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar el pago',
        details: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
