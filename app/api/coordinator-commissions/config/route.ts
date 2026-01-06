import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

// GET - Obtener configuración de comisiones de una visión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar que el usuario sea admin, director o coordinador de la visión
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        Vision: {
          where: { id: parseInt(visionId) }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const isAdmin = user.rol === 'admin' || user.rol === 'director';
    const isCoordinator = user.Vision.length > 0;

    if (!isAdmin && !isCoordinator) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Obtener o crear configuración
    let config = await prisma.coordinatorCommissionConfig.findUnique({
      where: { visionId: parseInt(visionId) },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            organizationId: true
          }
        },
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    // Si no existe, crear una con valores por defecto
    if (!config && isAdmin) {
      const vision = await prisma.vision.findUnique({
        where: { id: parseInt(visionId) }
      });

      if (!vision) {
        return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
      }

      config = await prisma.coordinatorCommissionConfig.create({
        data: {
          visionId: parseInt(visionId),
          organizationId: vision.organizationId!,
          createdBy: user.id,
          updatedAt: new Date()
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              organizationId: true
            }
          },
          Organization: {
            select: {
              id: true,
              name: true
            }
          }
        }
      });
    }

    return NextResponse.json({
      success: true,
      config
    });

  } catch (error: any) {
    console.error('Error obteniendo config de comisiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuración', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración de comisiones
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      visionId,
      basicSeatedRate,
      advanceSeatedRate,
      plStartRate,
      plGuestRate,
      plGradRate
    } = body;

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar que el usuario sea admin o director
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Solo admin/director pueden modificar tarifas' }, { status: 403 });
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Actualizar o crear configuración
    const config = await prisma.coordinatorCommissionConfig.upsert({
      where: { visionId: parseInt(visionId) },
      update: {
        basicSeatedRate: basicSeatedRate ? parseFloat(basicSeatedRate) : undefined,
        advanceSeatedRate: advanceSeatedRate ? parseFloat(advanceSeatedRate) : undefined,
        plStartRate: plStartRate ? parseFloat(plStartRate) : undefined,
        plGuestRate: plGuestRate ? parseFloat(plGuestRate) : undefined,
        plGradRate: plGradRate ? parseFloat(plGradRate) : undefined,
        updatedAt: new Date()
      },
      create: {
        visionId: parseInt(visionId),
        organizationId: vision.organizationId!,
        basicSeatedRate: basicSeatedRate ? parseFloat(basicSeatedRate) : 300,
        advanceSeatedRate: advanceSeatedRate ? parseFloat(advanceSeatedRate) : 500,
        plStartRate: plStartRate ? parseFloat(plStartRate) : 400,
        plGuestRate: plGuestRate ? parseFloat(plGuestRate) : 400,
        plGradRate: plGradRate ? parseFloat(plGradRate) : 400,
        createdBy: user.id,
        updatedAt: new Date()
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada exitosamente',
      config
    });

  } catch (error: any) {
    console.error('Error actualizando config de comisiones:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: error.message },
      { status: 500 }
    );
  }
}
