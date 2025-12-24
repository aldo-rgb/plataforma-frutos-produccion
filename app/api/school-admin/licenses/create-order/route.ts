import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        Organization_Organization_directorIdToUsuario: true,
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

    // Verificar que la organización pertenece al director
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization || organization.directorId !== user.id) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada o no autorizada' },
        { status: 403 }
      );
    }

    // Crear la orden de licencias
    const order = await prisma.licenseOrder.create({
      data: {
        organizationId,
        requestedBy: user.id,
        quantity,
        tier: 'STANDARD',
        amount: totalAmount,
        status: 'PENDING',
        paymentData: {
          unitPrice,
          createdAt: new Date().toISOString(),
        },
      },
    });

    console.log('✅ Orden de licencias creada:', {
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
    console.error('Error al crear orden:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al crear la orden',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
