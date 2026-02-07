import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import logger from '@/lib/logger';

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-06-20',
});

export async function POST(req: NextRequest) {
  try {
    logger.debug('🔵 [CHECKOUT] Iniciando procesamiento de pago...');
    
    const session = await getServerSession(authOptions);
    logger.debug('🔵 [CHECKOUT] Sesión:', session?.user?.email);

    if (!session?.user) {
      logger.debug('❌ [CHECKOUT] No hay sesión');
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    logger.debug('🔵 [CHECKOUT] Usuario:', { id: user?.id, rol: user?.rol, orgId: user?.organizationId });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      logger.debug('❌ [CHECKOUT] Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, paymentMethod, codeId, discount } = body;
    logger.debug('🔵 [CHECKOUT] Datos recibidos:', { orderId, paymentMethod, codeId, discount });

    if (!orderId || !paymentMethod) {
      logger.debug('❌ [CHECKOUT] Datos incompletos');
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    logger.debug('🔵 [CHECKOUT] Buscando orden...');
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    logger.debug('🔵 [CHECKOUT] Orden encontrada:', order ? `ID: ${order.id}, Status: ${order.status}` : 'NO ENCONTRADA');

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
      logger.error('Error parseando paymentData:', error);
    }

    // 🎫 SI ES PAGO CON CÓDIGO, PROCESAR DIRECTAMENTE
    if (paymentMethod === 'code' && codeId) {
      logger.debug('🎫 [CHECKOUT] Procesando pago con código...');
      
      // Verificar y marcar el código como usado
      const codigoAcceso = await prisma.codigoAcceso.findUnique({
        where: { id: codeId },
      });

      if (!codigoAcceso || codigoAcceso.estado !== 'DISPONIBLE') {
        return NextResponse.json({ 
          error: 'El código ya no está disponible' 
        }, { status: 400 });
      }

      // Marcar código como canjeado
      await prisma.codigoAcceso.update({
        where: { id: codeId },
        data: {
          estado: 'CANJEADO',
          canjeadoPorId: user.id,
          canjeadoEn: new Date(),
          updatedAt: new Date(),
        },
      });

      // Completar la orden con descuento aplicado
      const finalAmount = discount ? Math.max(0, order.amount - discount) : 0;
      
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'code',
          paidAt: new Date(),
          amount: finalAmount,
          paymentData: {
            ...(typeof existingPaymentData === 'object' ? existingPaymentData : {}),
            method: 'code',
            status: 'completed',
            paidAt: new Date().toISOString(),
            codeId: codeId,
            codeApplied: codigoAcceso.codigo,
            originalAmount: order.amount,
            discount: discount || order.amount,
            callsFromCode: codigoAcceso.cantidadLlamadas,
          },
        },
      });

      logger.debug('✅ Pago con código completado:', {
        orderId: updatedOrder.id,
        codeUsed: codigoAcceso.codigo,
        discount,
        finalAmount,
      });

      // Procesar asignación de mentores para pago con código
      if (existingPaymentData.type === 'VISION_MENTOR_PAYMENT') {
        const visionId = existingPaymentData.visionId;
        const mentorAssignments = existingPaymentData.mentorAssignments || [];
        const totalStudents = existingPaymentData.totalStudents || 0;

        // Asignar mentores
        for (const assignment of mentorAssignments) {
          const { mentorId } = assignment;
          const existingAssignment = await prisma.visionMentor.findFirst({
            where: { visionId, mentorId },
          });

          if (!existingAssignment) {
            await prisma.visionMentor.create({
              data: {
                visionId,
                mentorId,
                asignadoPorId: user.id,
              },
            });
          }
        }

        // Acreditar llamadas
        const callsPerStudent = 18;
        const totalCalls = totalStudents * callsPerStudent;

        let schoolCredit = await prisma.schoolCredit.findFirst({
          where: { organizationId: user.organizationId!, isActive: true },
        });

        if (schoolCredit) {
          schoolCredit = await prisma.schoolCredit.update({
            where: { id: schoolCredit.id },
            data: {
              totalPurchased: schoolCredit.totalPurchased + totalCalls,
              totalPaid: schoolCredit.totalPaid + finalAmount,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(),
            },
          });
        } else {
          schoolCredit = await prisma.schoolCredit.create({
            data: {
              organizationId: user.organizationId!,
              planType: 'STANDARD',
              totalPurchased: totalCalls,
              totalAllocated: 0,
              unitPrice: finalAmount > 0 ? finalAmount / totalCalls : 0,
              totalPaid: finalAmount,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              isActive: true,
              notes: `Llamadas de mentoría (código ${codigoAcceso.codigo}) - Orden ${orderId}`,
              updatedAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          success: true,
          order: updatedOrder,
          mentorsAssigned: mentorAssignments.length,
          callsCredits: totalCalls,
          codeUsed: codigoAcceso.codigo,
          message: 'Pago con código procesado, mentores asignados y llamadas acreditadas',
        });
      }

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        codeUsed: codigoAcceso.codigo,
        message: 'Pago con código procesado exitosamente',
      });
    }

    // 🔵 SI ES STRIPE, CREAR SESIÓN DE CHECKOUT REAL
    if (paymentMethod === 'stripe' && process.env.STRIPE_SECRET_KEY) {
      logger.debug('🔵 [CHECKOUT] Creando sesión de Stripe Checkout...');
      
      try {
        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'mxn',
                product_data: {
                  name: `Mentorías - ${existingPaymentData.visionName || 'Visión'}`,
                  description: `${existingPaymentData.totalStudents || order.quantity} estudiantes × 18 llamadas`,
                },
                unit_amount: Math.round(order.amount * 100), // Stripe usa centavos
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.NEXTAUTH_URL}/api/school-admin/visiones/stripe-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones/payment?orderId=${orderId}&payment=cancelled`,
          metadata: {
            orderId: orderId,
            visionId: existingPaymentData.visionId?.toString() || '',
            userId: user.id.toString(),
            organizationId: user.organizationId?.toString() || '',
          },
        });

        logger.debug('✅ [CHECKOUT] Sesión de Stripe creada:', checkoutSession.id);

        return NextResponse.json({
          success: true,
          requiresRedirect: true,
          checkoutUrl: checkoutSession.url,
          sessionId: checkoutSession.id,
        });
      } catch (stripeError: any) {
        logger.error('❌ [CHECKOUT] Error de Stripe:', stripeError);
        return NextResponse.json({
          error: 'Error al crear sesión de pago con Stripe',
          details: stripeError.message,
        }, { status: 500 });
      }
    }

    // Para PayPal y MercadoPago, simular pago (por ahora)
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

    logger.debug('✅ Pago de visión completado:', {
      orderId: updatedOrder.id,
      paymentMethod,
      amount: updatedOrder.amount,
    });

    // 🎯 ASIGNAR MENTORES A LA VISIÓN Y ACREDITAR LLAMADAS
    if (existingPaymentData.type === 'VISION_MENTOR_PAYMENT') {
      const visionId = existingPaymentData.visionId;
      const mentorAssignments = existingPaymentData.mentorAssignments || [];
      const totalStudents = existingPaymentData.totalStudents || 0;

      logger.debug('📋 Procesando asignaciones:', {
        visionId,
        mentorAssignments: mentorAssignments.length,
        totalStudents,
      });

      // 1. Asignar cada mentor a la visión (si no está ya asignado)
      for (const assignment of mentorAssignments) {
        const { mentorId, studentCount } = assignment;

        logger.debug(`🔍 Procesando mentor ID: ${mentorId}`);

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
          logger.debug(`✅ Mentor ${mentorId} asignado a visión ${visionId}`);
        } else {
          logger.debug(`ℹ️ Mentor ${mentorId} ya estaba asignado a visión ${visionId}`);
        }
      }

      // 2. Acreditar llamadas a la organización
      // Calcular total de llamadas: totalStudents × 18 llamadas por paquete
      const callsPerStudent = 18; // 18 llamadas por paquete de mentoría
      const totalCalls = totalStudents * callsPerStudent;

      logger.debug('💰 Acreditando llamadas:', {
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

      logger.debug('✅ Llamadas acreditadas:', {
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
    logger.error('❌ Error procesando pago de visión:', error);
    return NextResponse.json(
      {
        error: 'Error al procesar el pago',
        details: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
