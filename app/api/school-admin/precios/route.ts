import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener precios actuales de la organización
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que sea SCHOOL_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para acceder a esta sección' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    // Obtener precios de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        costoBasico: true,
        costoAvanzado: true,
        costoLiderato: true,
      },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      precios: {
        costoBasico: organization.costoBasico || 0,
        costoAvanzado: organization.costoAvanzado || 0,
        costoLiderato: organization.costoLiderato || 0,
      },
    });
  } catch (error) {
    logger.error('Error fetching precios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los precios' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar precios
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que sea SCHOOL_ADMIN
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { costoBasico, costoAvanzado, costoLiderato } = body;

    // Validar que los precios sean números válidos
    if (
      typeof costoBasico !== 'number' ||
      typeof costoAvanzado !== 'number' ||
      typeof costoLiderato !== 'number' ||
      costoBasico < 0 ||
      costoAvanzado < 0 ||
      costoLiderato < 0
    ) {
      return NextResponse.json(
        { success: false, error: 'Los precios deben ser números válidos y mayores o iguales a 0' },
        { status: 400 }
      );
    }

    // Actualizar precios en la organización
    const updatedOrganization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        costoBasico,
        costoAvanzado,
        costoLiderato,
      },
      select: {
        costoBasico: true,
        costoAvanzado: true,
        costoLiderato: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Precios actualizados correctamente',
      precios: updatedOrganization,
    });
  } catch (error) {
    logger.error('Error updating precios:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar los precios' },
      { status: 500 }
    );
  }
}
