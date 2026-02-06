import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { nanoid } from 'nanoid';
import logger from '@/lib/logger';

/**
 * 💳 Crear orden de pago para asignación de mentores en visión
 * POST /api/school-admin/visiones/[id]/create-payment-order
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Sin organización asociada' }, { status: 400 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    
    logger.debug('📦 Body recibido:', JSON.stringify(body, null, 2));
    
    const { 
      totalAmount, 
      totalStudents, 
      mentorAssignments,
      useWalletBalance,
      walletDeduction,
      netPayment 
    } = body;

    // Validar campos requeridos
    if (!totalAmount || totalAmount <= 0) {
      return NextResponse.json({ 
        error: 'El monto total es requerido y debe ser mayor a 0',
        received: { totalAmount, totalStudents }
      }, { status: 400 });
    }

    if (!totalStudents || totalStudents <= 0) {
      return NextResponse.json({ 
        error: 'El número de estudiantes es requerido y debe ser mayor a 0' 
      }, { status: 400 });
    }

    // Validar que la visión existe y pertenece a la organización
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        organizationId: user.organizationId,
      },
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Crear orden de pago (reutilizando la tabla LicenseOrder con un campo especial)
    const orderId = `VISION-${nanoid(12)}`;
    const now = new Date();
    
    const order = await prisma.licenseOrder.create({
      data: {
        id: orderId,
        organizationId: user.organizationId,
        requestedBy: user.id,
        quantity: totalStudents, // Cantidad de estudiantes
        tier: 'STANDARD', // No aplica pero es requerido
        amount: totalAmount,
        paymentMethod: 'transfer', // Se actualizará al seleccionar método de pago
        status: 'PENDING',
        updatedAt: now,
        paymentData: {
          type: 'VISION_MENTOR_PAYMENT',
          visionId,
          visionName: vision.nombre,
          totalStudents,
          mentorAssignments,
          useWalletBalance,
          walletDeduction,
          netPayment,
          createdAt: now.toISOString(),
        },
      },
    });

    return NextResponse.json({
      success: true,
      orderId: order.id,
      amount: totalAmount,
      netPayment,
      message: 'Orden de pago creada exitosamente',
    });

  } catch (error: any) {
    logger.error('❌ Error creando orden de pago:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear la orden de pago',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
