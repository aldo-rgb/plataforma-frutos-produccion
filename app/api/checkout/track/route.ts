import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';

// POST - Registrar inicio de checkout (para detectar abandonos)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { 
      visionId, 
      email, 
      phone, 
      firstName, 
      lastName, 
      originalPrice,
      // Nuevos campos para guardar datos de registro completos
      registrationData,
      password 
    } = body;

    if (!visionId || !email || !originalPrice) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Obtener la visión y organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Organization: {
          select: {
            id: true,
            anticiposEnabled: true,
          },
        },
      },
    });

    if (!vision || !vision.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Si anticipos no están habilitados, no registrar
    const org = (vision as any).Organization;
    if (!org?.anticiposEnabled) {
      return NextResponse.json({
        success: true,
        message: 'Anticipos no habilitados, checkout no registrado',
        checkoutId: null,
      });
    }

    const userId = session?.user?.id ? 
      (typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id) : 
      null;

    // Hashear password si viene
    let passwordHash = null;
    if (password) {
      passwordHash = await bcrypt.hash(password, 10);
    }

    // Verificar si ya existe un checkout activo para este email y visión
    const existingCheckout = await prisma.abandonedCheckout.findFirst({
      where: {
        email: email,
        visionId: visionId,
        status: 'IN_CHECKOUT',
      },
    });

    if (existingCheckout) {
      // Actualizar timestamp para reiniciar el contador de 5 min
      await prisma.abandonedCheckout.update({
        where: { id: existingCheckout.id },
        data: {
          checkoutStartedAt: new Date(),
          userId: userId || existingCheckout.userId,
          firstName: firstName || existingCheckout.firstName,
          lastName: lastName || existingCheckout.lastName,
          phone: phone || existingCheckout.phone,
          // Actualizar datos de registro si vienen
          ...(registrationData && { registrationData }),
          ...(passwordHash && { passwordHash }),
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Checkout actualizado',
        checkoutId: existingCheckout.id,
      });
    }

    // Crear nuevo registro de checkout
    const checkout = await prisma.abandonedCheckout.create({
      data: {
        id: `chk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        userId: userId,
        email: email,
        phone: phone || null,
        firstName: firstName || null,
        lastName: lastName || null,
        visionId: visionId,
        organizationId: vision.organizationId,
        originalPrice: originalPrice,
        status: 'IN_CHECKOUT',
        checkoutStartedAt: new Date(),
        // Guardar datos de registro para crear usuario después
        registrationData: registrationData || null,
        passwordHash: passwordHash,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Checkout registrado',
      checkoutId: checkout.id,
    });
  } catch (error: any) {
    logger.error('Error registering checkout:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar estado del checkout (completado o cancelado)
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { checkoutId, status, ticketId } = body;

    if (!checkoutId) {
      return NextResponse.json(
        { success: false, error: 'checkoutId requerido' },
        { status: 400 }
      );
    }

    const validStatuses = ['CONVERTED_ANTICIPO', 'CONVERTED_FULL', 'EXPIRED'];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado inválido' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    
    if (status === 'CONVERTED_FULL' || status === 'CONVERTED_ANTICIPO') {
      updateData.status = status;
      updateData.convertedAt = new Date();
      if (ticketId) {
        updateData.ticketId = ticketId;
      }
    } else if (status === 'EXPIRED') {
      updateData.status = 'EXPIRED';
    }

    const updated = await prisma.abandonedCheckout.update({
      where: { id: checkoutId },
      data: updateData,
    });

    return NextResponse.json({
      success: true,
      message: 'Checkout actualizado',
      checkout: updated,
    });
  } catch (error: any) {
    logger.error('Error updating checkout:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar checkout (cuando se completa el pago normalmente)
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutId = searchParams.get('checkoutId');
    const email = searchParams.get('email');
    const visionId = searchParams.get('visionId');

    if (checkoutId) {
      await prisma.abandonedCheckout.delete({
        where: { id: checkoutId },
      });
    } else if (email && visionId) {
      // Eliminar por email y visionId (cuando no tenemos el ID)
      await prisma.abandonedCheckout.deleteMany({
        where: {
          email: email,
          visionId: parseInt(visionId),
          status: 'IN_CHECKOUT',
        },
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'checkoutId o (email + visionId) requeridos' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Checkout eliminado',
    });
  } catch (error: any) {
    logger.error('Error deleting checkout:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
