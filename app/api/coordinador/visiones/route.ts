import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    // Roles válidos de coordinador y admin
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'SCHOOL_ADMIN'];
    
    // Permitir tanto coordinadores como SCHOOL_ADMIN que actúan como coordinadores
    if (!usuario || !allowedRoles.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    logger.debug('🔍 Buscando visiones para coordinador:', {
      usuarioId: usuario.id,
      coordinadorId: usuario.id,
      email: usuario.email,
      nombre: usuario.nombre,
      rol: usuario.rol,
      organizationId: usuario.organizationId
    });

    // Buscar visiones donde el usuario está asignado como staff coordinador
    const visionStaff = await prisma.visionStaff.findMany({
      where: {
        userId: usuario.id,
        role: {
          in: ['BASIC_COORDINATOR', 'ADVANCED_COORDINATOR', 'PL_COORDINATOR']
        }
      },
      select: {
        visionId: true
      }
    });

    const visionIds = visionStaff.map(vs => vs.visionId);

    logger.debug('📋 Visiones asignadas en VisionStaff:', visionIds);

    // Construir condiciones de búsqueda
    const orConditions: any[] = [
      { coordinadorId: usuario.id },
      { id: { in: visionIds.length > 0 ? visionIds : [0] } }
    ];

    // Para rol COORDINADOR, también incluir visiones de su organización
    if (usuario.rol === 'COORDINADOR' && usuario.organizationId) {
      orConditions.push({ organizationId: usuario.organizationId });
      logger.debug('📋 Incluyendo visiones de organización:', usuario.organizationId);
    }

    // Obtener visiones donde el coordinador es el coordinador asignado
    // O donde está asignado en VisionStaff
    // O donde pertenece a la misma organización (solo para COORDINADOR)
    const visiones = await prisma.vision.findMany({
      where: {
        OR: orConditions
      },
      include: {
        _count: {
          select: {
            VisionGameChanger: true,
            // Contar SOLO participantes de Liderato (PL) activos
            vision_enrollments: {
              where: {
                level: 'PL',
                enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Transformar los datos para mantener compatibilidad con el widget
    const visionesConConteo = visiones.map(v => ({
      ...v,
      _count: {
        VisionParticipante: v._count.vision_enrollments, // Usar el conteo de enrollments
        VisionGameChanger: v._count.VisionGameChanger
      }
    }));

    // Obtener productos con check-in activo para cada visión
    // Incluir productos que están IN_PROGRESS o cuya fecha de inicio es hoy/ayer (ventana de check-in)
    const visionIdsFound = visionesConConteo.map(v => v.id);
    const now = new Date();
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(23, 59, 59, 999);

    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        visionId: { in: visionIdsFound },
        isActive: true,
        OR: [
          { trainingStatus: 'IN_PROGRESS' },
          // También incluir productos cuya fecha de inicio está en la ventana de check-in
          {
            startDate: {
              gte: yesterday,
              lte: tomorrow
            },
            trainingStatus: { not: 'COMPLETED' }
          }
        ]
      },
      select: {
        id: true,
        name: true,
        visionId: true,
        levelType: true,
        trainingStatus: true,
        startDate: true
      }
    });

    // Mapear productos activos por visionId
    const productsByVision = activeProducts.reduce((acc, p) => {
      if (!acc[p.visionId!]) acc[p.visionId!] = [];
      acc[p.visionId!].push(p);
      return acc;
    }, {} as Record<number, typeof activeProducts>);

    // Agregar productos a las visiones
    const visionesConProductos = visionesConConteo.map(v => ({
      ...v,
      activeProducts: productsByVision[v.id] || []
    }));

    logger.debug('✅ Visiones encontradas:', visionesConProductos.length);
    if (visionesConProductos.length > 0) {
      logger.debug('📋 Lista de visiones:', visionesConProductos.map(v => ({
        id: v.id,
        nombre: v.nombre,
        coordinadorId: v.coordinadorId,
        participantes: v._count.VisionParticipante,
        activeProducts: v.activeProducts.length
      })));
    }

    return NextResponse.json({
      success: true,
      visiones: visionesConProductos
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo visiones del coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener visiones',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
