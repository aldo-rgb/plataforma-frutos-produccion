import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// PATCH - Actualizar estado de un registro
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; registrationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN' && session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { productId, registrationId } = await params;
    const body = await request.json();
    const { status } = body;

    // Validar status
    const validStatuses = ['REGISTERED', 'CONFIRMED', 'ATTENDED', 'NO_SHOW', 'CANCELLED'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ success: false, error: 'Estado inválido' }, { status: 400 });
    }

    // Verificar que el registro existe y pertenece al producto
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        id: parseInt(registrationId),
        productId: parseInt(productId),
      },
      include: {
        product: {
          select: { organizationId: true },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ success: false, error: 'Registro no encontrado' }, { status: 404 });
    }

    // Verificar permisos de organización
    if (session.user.rol === 'SCHOOL_ADMIN') {
      const admin = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true },
      });

      if (admin?.organizationId !== registration.product.organizationId) {
        return NextResponse.json({ success: false, error: 'Sin acceso' }, { status: 403 });
      }
    }

    // Preparar datos de actualización
    const updateData: any = { status };

    if (status === 'CONFIRMED' && !registration.confirmedAt) {
      updateData.confirmedAt = new Date();
    }

    if (status === 'ATTENDED' && !registration.attendedAt) {
      updateData.attendedAt = new Date();
    }

    // Actualizar registro
    const updated = await prisma.eventRegistration.update({
      where: { id: parseInt(registrationId) },
      data: updateData,
    });

    return NextResponse.json({ success: true, registration: updated });
  } catch (error) {
    console.error('Error updating registration:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar un registro
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string; registrationId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN' && session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { productId, registrationId } = await params;

    // Verificar que el registro existe
    const registration = await prisma.eventRegistration.findFirst({
      where: {
        id: parseInt(registrationId),
        productId: parseInt(productId),
      },
      include: {
        product: {
          select: { organizationId: true },
        },
      },
    });

    if (!registration) {
      return NextResponse.json({ success: false, error: 'Registro no encontrado' }, { status: 404 });
    }

    // Verificar permisos de organización
    if (session.user.rol === 'SCHOOL_ADMIN') {
      const admin = await prisma.usuario.findUnique({
        where: { id: parseInt(session.user.id) },
        select: { organizationId: true },
      });

      if (admin?.organizationId !== registration.product.organizationId) {
        return NextResponse.json({ success: false, error: 'Sin acceso' }, { status: 403 });
      }
    }

    // Eliminar registro y decrementar contador
    await prisma.$transaction([
      prisma.eventRegistration.delete({
        where: { id: parseInt(registrationId) },
      }),
      prisma.schoolProduct.update({
        where: { id: parseInt(productId) },
        data: {
          currentEnrollment: {
            decrement: 1,
          },
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting registration:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
