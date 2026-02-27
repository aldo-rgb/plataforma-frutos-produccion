import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/school-admin/comisiones/config
 * 
 * Obtiene las configuraciones de comisiones de todas las visiones de la organización
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar que sea SCHOOL_ADMIN o ADMINISTRADOR
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true, organizationId: true }
    });

    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'];
    if (!user || !allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    // Obtener visiones de la organización
    const visiones = await prisma.vision.findMany({
      where: user.organizationId ? { organizationId: user.organizationId } : {},
      select: { id: true, nombre: true }
    });

    // Obtener o crear configuraciones para cada visión
    const configs = await Promise.all(
      visiones.map(async (vision) => {
        let config = await prisma.coordinator_commission_config.findUnique({
          where: { visionId: vision.id }
        });

        // Si no existe, crear con valores por defecto
        if (!config) {
          config = await prisma.coordinator_commission_config.create({
            data: {
              visionId: vision.id,
              organizationId: user.organizationId || 1,
              createdBy: userId,
              updatedAt: new Date()
            }
          });
        }

        // Usar valores por defecto si los nuevos campos no existen aún
        const advanceComboRate = (config as any).advanceComboRate ? Number((config as any).advanceComboRate) : 700;
        const plWeek3Rate = (config as any).plWeek3Rate ? Number((config as any).plWeek3Rate) : 400;

        return {
          id: config.id,
          visionId: vision.id,
          visionName: vision.nombre,
          basicSeatedRate: Number(config.basicSeatedRate),
          advanceSeatedRate: Number(config.advanceSeatedRate),
          advanceComboRate,
          plStartRate: Number(config.plStartRate),
          plWeek3Rate,
          plGuestRate: Number(config.plGuestRate),
          plGradRate: Number(config.plGradRate),
          isActive: config.isActive
        };
      })
    );

    return NextResponse.json({
      success: true,
      configs
    });

  } catch (error) {
    console.error('Error en GET /api/school-admin/comisiones/config:', error);
    return NextResponse.json(
      { error: 'Error al obtener configuraciones', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/school-admin/comisiones/config
 * 
 * Actualiza la configuración de comisiones de una visión
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar permisos
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'];
    if (!user || !allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const {
      visionId,
      basicSeatedRate,
      advanceSeatedRate,
      advanceComboRate,
      plStartRate,
      plWeek3Rate,
      plGuestRate,
      plGradRate
    } = body;

    if (!visionId) {
      return NextResponse.json({ error: 'visionId es requerido' }, { status: 400 });
    }

    // Construir objeto de actualización dinámicamente
    const updateData: any = {
      updatedAt: new Date()
    };

    if (basicSeatedRate !== undefined) updateData.basicSeatedRate = basicSeatedRate;
    if (advanceSeatedRate !== undefined) updateData.advanceSeatedRate = advanceSeatedRate;
    if (advanceComboRate !== undefined) updateData.advanceComboRate = advanceComboRate;
    if (plStartRate !== undefined) updateData.plStartRate = plStartRate;
    if (plWeek3Rate !== undefined) updateData.plWeek3Rate = plWeek3Rate;
    if (plGuestRate !== undefined) updateData.plGuestRate = plGuestRate;
    if (plGradRate !== undefined) updateData.plGradRate = plGradRate;

    // Actualizar configuración
    const updatedConfig = await prisma.coordinator_commission_config.update({
      where: { visionId },
      data: updateData
    });

    // Usar valores por defecto si los nuevos campos no existen
    const resultAdvanceComboRate = (updatedConfig as any).advanceComboRate ? Number((updatedConfig as any).advanceComboRate) : advanceComboRate || 700;
    const resultPlWeek3Rate = (updatedConfig as any).plWeek3Rate ? Number((updatedConfig as any).plWeek3Rate) : plWeek3Rate || 400;

    return NextResponse.json({
      success: true,
      config: {
        id: updatedConfig.id,
        visionId: updatedConfig.visionId,
        basicSeatedRate: Number(updatedConfig.basicSeatedRate),
        advanceSeatedRate: Number(updatedConfig.advanceSeatedRate),
        advanceComboRate: resultAdvanceComboRate,
        plStartRate: Number(updatedConfig.plStartRate),
        plWeek3Rate: resultPlWeek3Rate,
        plGuestRate: Number(updatedConfig.plGuestRate),
        plGradRate: Number(updatedConfig.plGradRate)
      }
    });

  } catch (error) {
    console.error('Error en PUT /api/school-admin/comisiones/config:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración', details: String(error) },
      { status: 500 }
    );
  }
}
