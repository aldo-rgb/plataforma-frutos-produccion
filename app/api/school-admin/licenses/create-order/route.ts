import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    logger.debug('🔍 Session data:', { 
      exists: !!session, 
      userId: session?.user?.id, 
      email: session?.user?.email,
      rol: session?.user?.rol 
    });

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const { quantity, unitPrice, totalAmount, organizationId } = body;

    if (!quantity || !unitPrice || !totalAmount || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que la organización es la del usuario
    if (user.organizationId !== organizationId) {
      return NextResponse.json(
        { success: false, error: 'Organización no autorizada' },
        { status: 403 }
      );
    }

    // Verificar que la organización existe
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Crear la orden de licencias (sin método de pago aún)
    const order = await prisma.licenseOrder.create({
      data: {
        id: randomUUID(),
        organizationId,
        requestedBy: user.id,
        quantity,
        tier: 'STANDARD',
        amount: totalAmount,
        status: 'PENDING',
        paymentMethod: 'transfer', // Valor temporal, se actualizará al seleccionar método
        paymentData: {
          unitPrice,
          createdAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    logger.debug('✅ Orden de licencias creada:', {
      orderId: order.id,
      quantity: order.quantity,
      amount: order.amount,
      organization: organization.name,
    });

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        quantity: order.quantity,
        amount: order.amount,
        status: order.status,
      },
      message: 'Orden creada exitosamente',
    });
  } catch (error) {
    logger.error('Error al crear orden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear la orden',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
