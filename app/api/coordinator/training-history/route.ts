import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/coordinator/training-history
 * Obtiene el historial de entrenamientos COMPLETADOS o CANCELADOS para coordinadores
 * Solo muestra entrenamientos que ya finalizaron
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true,
        nombre: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo coordinadores pueden acceder
    const allowedRoles = ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'COORDINADOR', 'SCHOOL_ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(usuario.rol)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    // Construir filtro base - SOLO entrenamientos COMPLETADOS o CANCELLED
    const isAdmin = ['ADMINISTRADOR', 'SUPER_ADMIN'].includes(usuario.rol);
    
    let whereClause: any = {
      isActive: true,
      trainingStatus: { in: ['COMPLETED', 'CANCELLED'] }
    };

    // Filtrar por organización si no es admin
    if (!isAdmin && usuario.organizationId) {
      whereClause.organizationId = usuario.organizationId;
    }

    // Obtener productos/entrenamientos
    const productos = await prisma.schoolProduct.findMany({
      where: whereClause,
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true
          }
        },
        Organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        },
        Trainer: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        _count: {
          select: {
            CheckInRecord: true
          }
        }
      },
      orderBy: [
        { finishedAt: 'desc' }, // Más recientes primero
        { endDate: 'desc' }
      ]
    });

    // Obtener estadísticas adicionales por producto
    const productStats = await Promise.all(productos.map(async (p) => {
      // Contar inscritos en la visión
      let inscritosCount = 0;
      if (p.visionId) {
        // Mapear levelType a VisionLevel
        const levelMap: Record<string, 'BASIC' | 'ADVANCED' | 'PL'> = {
          'BASIC': 'BASIC',
          'ADVANCED': 'ADVANCED',
          'PL': 'PL',
          'NONE': 'BASIC'
        };
        const level = levelMap[p.levelType || 'BASIC'] || 'BASIC';
        
        inscritosCount = await prisma.vision_enrollments.count({
          where: {
            visionId: p.visionId,
            level: level,
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
          }
        });
      }

      // Contar átomos (SmallGroups)
      let atomosCount = 0;
      if (p.visionId) {
        const levelMap: Record<string, 'BASIC' | 'ADVANCED' | 'PL'> = {
          'BASIC': 'BASIC',
          'ADVANCED': 'ADVANCED',
          'PL': 'PL',
          'NONE': 'BASIC'
        };
        const sgLevel = levelMap[p.levelType || 'BASIC'] || 'BASIC';
        
        atomosCount = await prisma.smallGroup.count({
          where: {
            visionId: p.visionId,
            level: sgLevel,
            isActive: true
          }
        });
      }

      return {
        productId: p.id,
        inscritos: inscritosCount,
        checkedIn: p._count.CheckInRecord,
        atomos: atomosCount
      };
    }));

    // Crear mapa de estadísticas
    const statsMap = new Map(productStats.map(s => [s.productId, s]));

    // Formatear respuesta
    const entrenamientos = productos.map(p => {
      const stats = statsMap.get(p.id) || { inscritos: 0, checkedIn: 0, atomos: 0 };
      const now = new Date();
      
      // Determinar estado visual
      let estado = 'PROXIMO';
      if (p.trainingStatus === 'COMPLETED') {
        estado = 'COMPLETADO';
      } else if (p.startDate && p.endDate) {
        const start = new Date(p.startDate);
        const end = new Date(p.endDate);
        if (now >= start && now <= end) {
          estado = 'EN_CURSO';
        } else if (now > end) {
          estado = 'FINALIZADO_SIN_CERRAR';
        }
      }

      return {
        id: p.id,
        name: p.name,
        levelType: p.levelType,
        trainingStatus: p.trainingStatus,
        estado,
        startDate: p.startDate,
        endDate: p.endDate,
        finishedAt: p.finishedAt,
        vision: p.Vision,
        organization: p.Organization,
        trainer: p.Trainer,
        inscritos: stats.inscritos,
        checkedIn: stats.checkedIn,
        atomos: stats.atomos
      };
    });

    // Calcular totales
    const totales = {
      total: entrenamientos.length,
      activos: entrenamientos.filter(e => e.estado === 'EN_CURSO').length,
      proximos: entrenamientos.filter(e => e.estado === 'PROXIMO').length,
      completados: entrenamientos.filter(e => e.estado === 'COMPLETADO').length,
      pendientesCierre: entrenamientos.filter(e => e.estado === 'FINALIZADO_SIN_CERRAR').length,
      totalInscritos: entrenamientos.reduce((sum, e) => sum + e.inscritos, 0),
      totalCheckedIn: entrenamientos.reduce((sum, e) => sum + e.checkedIn, 0),
      totalAtomos: entrenamientos.reduce((sum, e) => sum + e.atomos, 0)
    };

    return NextResponse.json({
      success: true,
      entrenamientos,
      totales,
      usuario: {
        nombre: usuario.nombre,
        rol: usuario.rol
      }
    });

  } catch (error) {
    logger.error('Error obteniendo historial de entrenamientos:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error al obtener historial' 
    }, { status: 500 });
  }
}
