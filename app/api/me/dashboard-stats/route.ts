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
      where: { email: session.user.email },
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener enrollment de visión (incluyendo attendanceStatus para detectar DROP)
    const visionEnrollments = await prisma.vision_enrollments.findMany({
      where: { 
        userId: usuario.id,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      },
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

    // NUEVO: Determinar el nivel REAL basado en asistencia (attendanceStatus = 'ATTENDED')
    // El usuario solo puede estar en un nivel si ha ASISTIDO a ese nivel
    // Prioridad: PL > ADVANCED > BASIC (pero solo si tienen asistencia)
    const levelPriority: Record<string, number> = { 'PL': 3, 'ADVANCED': 2, 'BASIC': 1 };
    
    // Primero, buscar el enrollment con attendanceStatus = 'ATTENDED' de nivel más alto
    const attendedEnrollments = visionEnrollments.filter(e => e.attendanceStatus === 'ATTENDED');
    const sortedAttendedEnrollments = attendedEnrollments.sort((a, b) => 
      (levelPriority[b.level] || 0) - (levelPriority[a.level] || 0)
    );
    
    // El enrollment principal para mostrar el nivel es el de mayor nivel CON asistencia
    // Si no tiene asistencia en ninguno, usar el de mayor nivel inscrito (para mostrar progreso)
    let visionEnrollment = sortedAttendedEnrollments[0] || null;
    
    // Si no tiene ninguno con asistencia, usar el enrollment más alto para referencia de visión
    if (!visionEnrollment && visionEnrollments.length > 0) {
      const sortedAll = visionEnrollments.sort((a, b) => 
        (levelPriority[b.level] || 0) - (levelPriority[a.level] || 0)
      );
      visionEnrollment = sortedAll[0];
    }

    // Verificar si el usuario está marcado como DROP
    const isDropped = visionEnrollment?.attendanceStatus === 'DROP';

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

    // Determinar el nivel actual del usuario basado en ASISTENCIA
    // El nivel real es el más alto donde el usuario tiene attendanceStatus = 'ATTENDED'
    let currentLevel: 'BASIC' | 'ADVANCED' | 'PL' | 'LOBO_SOLITARIO' = 'LOBO_SOLITARIO';
    
    // El nivel se determina por el enrollment con ASISTENCIA de mayor nivel
    const highestAttendedEnrollment = sortedAttendedEnrollments[0];
    
    if (highestAttendedEnrollment?.level) {
      // Tiene asistencia en algún nivel - ese es su nivel actual
      currentLevel = highestAttendedEnrollment.level as 'BASIC' | 'ADVANCED' | 'PL';
    } else if (visionEnrollment?.level) {
      // No tiene asistencia pero está inscrito
      // Para usuarios de nivel PL (liderato), respetar su nivel ya que son graduados
      // Para BASIC/ADVANCED, mostrar el nivel inscrito también
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
      
      // Verificar si ha pagado PL (tiene ticket PL con pago completo)
      const plTicket = await prisma.ticket.findFirst({
        where: {
          ownerId: usuario.id,
          level: 'PL',
          status: 'ACTIVE',
          paymentStatus: 'PAID' // Solo cuenta como desbloqueado si está completamente pagado
        }
      });
      
      // Verificar si tiene ticket PL con pago parcial (ya apartó pero no ha pagado completo)
      const plTicketPartial = await prisma.ticket.findFirst({
        where: {
          ownerId: usuario.id,
          level: 'PL',
          status: 'ACTIVE',
          paymentStatus: 'PARTIAL'
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
        isLocked: !plTicket && !plTicketPartial, // Bloqueado solo si no tiene ningún ticket PL
        progressPercent,
        lockReason: !plTicket && !plTicketPartial ? 'Requiere compromiso PL' : undefined,
        hasPendingPLPayment: !!plTicketPartial, // Si tiene ticket PL con pago parcial
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
    let tribeLogoUrl = null;
    let tribeName = null;
    let tribeMission = null;
    
    if (currentLevel === 'PL' && vision) {
      const invitedCount = await prisma.usuario.count({
        where: { invitedBy: usuario.id }
      });

      // Obtener logo de tribu, misión y nombre de la visión
      const visionWithLogo = await prisma.vision.findUnique({
        where: { id: vision.id },
        select: { 
          tribeLogoUrl: true,
          tribeMission: true,
          nombre: true
        }
      });

      tribeStats = {
        invitedCount,
        enrolledCount: invitedCount, // Simplificado, se puede mejorar
      };
      
      tribeLogoUrl = visionWithLogo?.tribeLogoUrl || null;
      tribeMission = visionWithLogo?.tribeMission || null;
      tribeName = visionWithLogo?.nombre || null;
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
        userEmail: usuario.email,
        referralCode: usuario.referralCode,
        organizationId: usuario.organizationId,
        organizationName: visionEnrollment?.Vision?.nombre || vision?.nombre,
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
        tribeLogoUrl,
        tribeMission,
        tribeName,
        isLoboSolitario: currentLevel === 'LOBO_SOLITARIO',
        hasVision: !!vision,
        isDropped, // Indica si el usuario fue marcado como DROP
        isGraduated: usuario.isGraduated || false, // Para mostrar entrenamientos en lugar de BuddySystem
      }
    });

  } catch (error) {
    logger.error('Error en dashboard-stats:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
