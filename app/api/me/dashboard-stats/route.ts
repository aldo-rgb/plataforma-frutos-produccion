import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener enrollment de visión
    const visionEnrollment = await prisma.vision_enrollments.findFirst({
      where: { userId: usuario.id },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
            plWeekend1StartDate: true,
            plWeekend3EndDate: true,
          }
        }
      }
    });

    // Obtener participación en visión (para gamechangers, participantes)
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: { participanteId: usuario.id },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true,
            advancedStartDate: true,
            advancedEndDate: true,
            plWeekend1StartDate: true,
            plWeekend3EndDate: true,
          }
        }
      }
    });

    // Verificar si tiene paquete de sesiones (Lobo Solitario)
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: usuario.id,
          status: 'COMPLETED'
        },
        remainingSessions: { gt: 0 },
        isActive: true
      }
    });

    // Determinar el nivel actual del usuario
    let currentLevel: 'BASIC' | 'ADVANCED' | 'PL' | 'LOBO_SOLITARIO' = 'LOBO_SOLITARIO';
    
    // Obtener el nivel del enrollment si existe
    if (visionEnrollment?.level) {
      currentLevel = visionEnrollment.level as 'BASIC' | 'ADVANCED' | 'PL';
    } else if (usuario.currentVisionLevel) {
      currentLevel = usuario.currentVisionLevel as 'BASIC' | 'ADVANCED' | 'PL';
    } else if (visionParticipante) {
      // Si tiene VisionParticipante pero no nivel específico, es BASIC por defecto
      currentLevel = 'BASIC';
    } else if (packageCredits) {
      // Usuario con paquete de sesiones = Lobo Solitario
      currentLevel = 'LOBO_SOLITARIO';
    }

    const vision = visionEnrollment?.Vision || visionParticipante?.Vision;
    const now = new Date();

    // Calcular información del siguiente nivel
    let nextMilestone = null;
    
    if (currentLevel === 'BASIC' && vision) {
      // Para BASIC: siguiente es ADVANCED
      const advancedStartDate = vision.advancedStartDate;
      const hasAdvancedAccess = visionEnrollment?.level === 'ADVANCED' || 
                                visionEnrollment?.level === 'PL' ||
                                usuario.graduatedFromBasic;
      
      // Verificar si ha pagado advanced (tiene ticket ADVANCED o superior)
      const advancedTicket = await prisma.ticket.findFirst({
        where: {
          ownerId: usuario.id,
          level: { in: ['ADVANCED', 'PL'] },
          status: 'ACTIVE'
        }
      });

      // Calcular progreso: días hasta el fin de semana Avanzado
      let progressPercent = 0;
      if (vision.startDate && advancedStartDate) {
        const totalDays = Math.ceil((new Date(advancedStartDate).getTime() - new Date(vision.startDate).getTime()) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((now.getTime() - new Date(vision.startDate).getTime()) / (1000 * 60 * 60 * 24));
        progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
      }

      nextMilestone = {
        name: 'Programa Avanzado',
        deadline: advancedStartDate,
        isLocked: !advancedTicket && !hasAdvancedAccess,
        progressPercent,
        lockReason: !advancedTicket ? 'Requiere pago' : undefined,
      };
    } else if (currentLevel === 'ADVANCED' && vision) {
      // Para ADVANCED: siguiente es PL
      const plStartDate = vision.plWeekend1StartDate;
      
      // Verificar si ha pagado PL (tiene ticket PL)
      const plTicket = await prisma.ticket.findFirst({
        where: {
          ownerId: usuario.id,
          level: 'PL',
          status: 'ACTIVE'
        }
      });

      // Calcular progreso: % de tareas completadas en ADVANCED
      const carta = await prisma.cartaFrutos.findFirst({
        where: { usuarioId: usuario.id }
      });

      let progressPercent = 0;
      if (carta) {
        const metas = await prisma.meta.findMany({
          where: { cartaId: carta.id },
          include: {
            Accion: {
              include: {
                TaskInstance: {
                  where: { usuarioId: usuario.id }
                }
              }
            }
          }
        });

        let totalTasks = 0;
        let completedTasks = 0;
        metas.forEach(meta => {
          meta.Accion.forEach(accion => {
            totalTasks += accion.TaskInstance?.length || 0;
            completedTasks += accion.TaskInstance?.filter(t => t.status === 'COMPLETED').length || 0;
          });
        });
        
        progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      }

      nextMilestone = {
        name: 'Programa de Liderato',
        deadline: plStartDate,
        isLocked: !plTicket,
        progressPercent,
        lockReason: !plTicket ? 'Requiere compromiso PL' : undefined,
      };
    } else if (currentLevel === 'PL' && vision) {
      // Para PL: progreso hacia graduación
      const plEndDate = vision.plWeekend3EndDate;
      const plStartDate = vision.plWeekend1StartDate;

      let progressPercent = 0;
      if (plStartDate && plEndDate) {
        const totalDays = Math.ceil((new Date(plEndDate).getTime() - new Date(plStartDate).getTime()) / (1000 * 60 * 60 * 24));
        const elapsedDays = Math.ceil((now.getTime() - new Date(plStartDate).getTime()) / (1000 * 60 * 60 * 24));
        progressPercent = Math.min(100, Math.max(0, Math.round((elapsedDays / totalDays) * 100)));
      }

      // Calcular semana actual de 12 (o según duración real)
      let currentWeek = 1;
      if (plStartDate) {
        const daysSinceStart = Math.ceil((now.getTime() - new Date(plStartDate).getTime()) / (1000 * 60 * 60 * 24));
        currentWeek = Math.max(1, Math.min(12, Math.ceil(daysSinceStart / 7)));
      }

      nextMilestone = {
        name: 'Graduación',
        deadline: plEndDate,
        isLocked: false,
        progressPercent,
        currentWeek,
        totalWeeks: 12,
      };
    } else if (currentLevel === 'LOBO_SOLITARIO') {
      // Lobo Solitario: progreso basado en hábitos completados
      const completedHabits = await prisma.taskInstance.count({
        where: {
          usuarioId: usuario.id,
          status: 'COMPLETED',
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } // Últimos 30 días
        }
      });

      const totalHabits = await prisma.taskInstance.count({
        where: {
          usuarioId: usuario.id,
          createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) }
        }
      });

      const progressPercent = totalHabits > 0 ? Math.round((completedHabits / totalHabits) * 100) : 0;

      nextMilestone = {
        name: 'Maestría Personal',
        deadline: null,
        isLocked: false,
        progressPercent,
      };
    }

    // Obtener buddy si está en ADVANCED
    let buddyInfo = null;
    if (currentLevel === 'ADVANCED') {
      // Buscar si tiene buddy asignado (esto depende de tu modelo, adaptar según esquema)
      // Por ahora retornamos null
      buddyInfo = null;
    }

    // Obtener stats de tribu si está en PL
    let tribeStats = null;
    if (currentLevel === 'PL') {
      const invitedCount = await prisma.usuario.count({
        where: { invitedBy: usuario.id }
      });

      tribeStats = {
        invitedCount,
        enrolledCount: invitedCount, // Simplificado, se puede mejorar
      };
    }

    // Badge asset basado en nivel
    const badgeAssets = {
      BASIC: 'icon_seed_cyan',
      ADVANCED: 'icon_rocket_purple',
      PL: 'icon_crown_gold',
      LOBO_SOLITARIO: 'icon_wolf_gray',
    };

    return NextResponse.json({
      success: true,
      data: {
        userId: usuario.id,
        userName: usuario.nombre,
        currentLevelInfo: {
          levelName: currentLevel,
          badgeAsset: badgeAssets[currentLevel],
          nextMilestone,
        },
        visionInfo: vision ? {
          id: vision.id,
          nombre: vision.nombre,
          startDate: vision.startDate,
          endDate: vision.endDate,
        } : null,
        buddyInfo,
        tribeStats,
        isLoboSolitario: currentLevel === 'LOBO_SOLITARIO',
        hasVision: !!vision,
      }
    });

  } catch (error) {
    console.error('Error en dashboard-stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
