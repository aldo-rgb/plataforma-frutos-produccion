import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/coordinator/gc-calls-monitor
 * Obtiene las llamadas de los Game Changers organizadas por átomo
 * Para coordinadores de básico y avanzado
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const coordinator = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true 
      },
    });

    if (!coordinator) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que sea coordinador, trainer o admin
    const allowedRoles = ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'ADMINISTRADOR', 'SUPER_ADMIN'];
    if (!allowedRoles.includes(coordinator.rol)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'today';

    // Definir el rango de fechas según el filtro
    let dateFilter: any = {};
    
    // Para 'today', buscar llamadas de las últimas 24 horas
    const now = new Date();
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log('📊 Filtro de fecha:', {
      filter,
      now: now.toISOString(),
      yesterday: yesterday.toISOString(),
    });

    if (filter === 'today') {
      // Llamadas de las últimas 24 horas
      dateFilter = {
        attemptedAt: {
          gte: yesterday,
        },
      };
    } else if (filter === 'risk') {
      dateFilter = {
        OR: [
          { completed: false },
          { potentialRating: { lte: 2 } },
        ],
      };
    }

    // Construir filtro de organización
    // Admins y superAdmins pueden ver todas las organizaciones
    const isAdmin = ['ADMINISTRADOR', 'SUPER_ADMIN'].includes(coordinator.rol);
    const organizationFilter: any = isAdmin || !coordinator.organizationId
      ? {} // Sin filtro de organización para admins o si no tiene org
      : { organizationId: coordinator.organizationId };

    console.log('📊 Monitor GC Calls - Filtros:', {
      coordinatorId: coordinator.id,
      rol: coordinator.rol,
      organizationId: coordinator.organizationId,
      isAdmin,
      filter,
    });

    // Obtener visiones con entrenamientos activos (no terminados)
    // Filtrar también por organización si no es admin
    const productFilter: any = {
      isActive: true,
      trainingStatus: { not: 'COMPLETED' }
    };
    
    // Si es TRAINER, filtrar solo por los productos donde él es trainer
    if (coordinator.rol === 'TRAINER') {
      productFilter.trainerId = coordinator.id;
    }
    // Si no es admin, filtrar por organización
    else if (!isAdmin && coordinator.organizationId) {
      productFilter.organizationId = coordinator.organizationId;
    }

    console.log('📊 Product filter:', productFilter);

    // Helper para obtener fecha UTC sin hora
    const getDateOnlyUTC = (date: Date) => {
      return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
    };
    const todayUTC = getDateOnlyUTC(now);

    // Obtener productos y determinar cuál está EN CURSO (por fechas)
    const allProducts = await prisma.schoolProduct.findMany({
      where: productFilter,
      select: { 
        id: true, 
        visionId: true, 
        levelType: true,
        startDate: true,
        endDate: true
      }
    });

    // Filtrar solo los productos que están en curso HOY
    const productosEnCurso = allProducts.filter(p => {
      if (!p.startDate) return false;
      const start = new Date(p.startDate);
      const startDateOnly = getDateOnlyUTC(start);
      const end = p.endDate ? new Date(p.endDate) : new Date('2099-12-31');
      const endDateOnly = getDateOnlyUTC(end);
      
      // Está en curso si hoy está dentro del rango de fechas
      return todayUTC >= startDateOnly && todayUTC <= endDateOnly;
    });

    console.log('📊 Productos en curso hoy:', productosEnCurso.map(p => ({ id: p.id, level: p.levelType, visionId: p.visionId })));

    // Obtener los niveles activos y visionIds
    const nivelesActivos = productosEnCurso.map(p => p.levelType);
    const visionIdsActivas = [...new Set(productosEnCurso.filter(v => v.visionId).map(v => v.visionId!))];

    console.log('📊 Visiones activas encontradas:', visionIdsActivas, 'Niveles:', nivelesActivos);

    // Si no hay visiones activas, retornar vacío
    if (visionIdsActivas.length === 0) {
      return NextResponse.json({
        success: true,
        atoms: [],
        summary: {
          totalAtoms: 0,
          totalCalls: 0,
          completedCalls: 0,
          missedCalls: 0,
          avgRating: 0,
        },
      });
    }

    // Obtener solo átomos de visiones con entrenamientos activos Y del nivel correcto
    const squads = await prisma.smallGroup.findMany({
      where: {
        ...organizationFilter,
        isActive: true,
        visionId: { in: visionIdsActivas },
        // Filtrar por el nivel del entrenamiento en curso
        level: { in: nivelesActivos as any }
      },
      include: {
        leader: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
          },
        },
        members: {
          where: { isActive: true },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    console.log('📊 Squads encontrados:', squads.length, 'para niveles:', nivelesActivos);

    // Si no hay squads, retornar vacío
    if (squads.length === 0) {
      return NextResponse.json({
        success: true,
        atoms: [],
        summary: {
          totalAtoms: 0,
          totalCalls: 0,
          completedCalls: 0,
          missedCalls: 0,
          avgRating: 0,
        },
      });
    }

    // Para cada átomo, obtener los intentos de llamada
    const atomsWithAttempts = await Promise.all(
      squads.map(async (squad) => {
        try {
          const attempts = await (prisma as any).gCCallAttempt.findMany({
            where: {
              squadId: squad.id,
              ...dateFilter,
            },
            include: {
              participant: {
                select: {
                  id: true,
                  nombre: true,
                  imagen: true,
                },
              },
            },
            orderBy: { attemptedAt: 'desc' },
            take: 20, // Limitar para no sobrecargar
          });

          // Calcular estadísticas
          const completedCalls = attempts.filter((a: any) => a.completed).length;
          const missedCalls = attempts.filter((a: any) => !a.completed).length;
          const ratingsWithValue = attempts.filter((a: any) => a.potentialRating);
          const avgRating = ratingsWithValue.length > 0
            ? ratingsWithValue.reduce((sum: number, a: any) => sum + (a.potentialRating || 0), 0) / ratingsWithValue.length
            : 0;

          return {
            id: squad.id,
            name: squad.name,
            level: squad.level,
            gameChanger: squad.leader,
            membersCount: squad.members.length,
            attempts: attempts.map((a: any) => ({
              id: a.id,
            participantId: a.participantId,
            completed: a.completed,
            potentialRating: a.potentialRating,
            notes: a.notes,
            attemptNumber: a.attemptNumber,
            trainingDay: a.trainingDay,
            attemptedAt: a.attemptedAt.toISOString(),
            participant: a.participant,
          })),
          stats: {
            totalCalls: attempts.length,
            completedCalls,
            missedCalls,
            avgRating,
          },
        };
        } catch (err) {
          console.error(`Error fetching attempts for squad ${squad.id}:`, err);
          return {
            id: squad.id,
            name: squad.name,
            level: squad.level,
            gameChanger: squad.leader,
            membersCount: squad.members.length,
            attempts: [],
            stats: {
              totalCalls: 0,
              completedCalls: 0,
              missedCalls: 0,
              avgRating: 0,
            },
          };
        }
      })
    );

    // Filtrar átomos que tengan llamadas o mostrar todos
    // Para 'today', siempre mostrar todos los átomos aunque no tengan llamadas
    const filteredAtoms = atomsWithAttempts;

    console.log('📊 Átomos con intentos:', atomsWithAttempts.filter(a => a.attempts.length > 0).length);
    console.log('📊 Total átomos:', filteredAtoms.length);
    
    // Calcular totales globales
    const globalStats = {
      totalCalls: filteredAtoms.reduce((sum, a) => sum + a.stats.totalCalls, 0),
      completedCalls: filteredAtoms.reduce((sum, a) => sum + a.stats.completedCalls, 0),
      missedCalls: filteredAtoms.reduce((sum, a) => sum + a.stats.missedCalls, 0),
    };
    console.log('📊 Stats globales:', globalStats);

    // Ordenar por cantidad de llamadas (más activos primero)
    filteredAtoms.sort((a, b) => b.stats.totalCalls - a.stats.totalCalls);

    return NextResponse.json({
      success: true,
      atoms: filteredAtoms,
      filter,
    });

  } catch (error) {
    console.error('Error fetching GC calls monitor:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
