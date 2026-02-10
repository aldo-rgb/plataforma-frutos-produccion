import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addWeeks, startOfDay, setHours, setMinutes } from 'date-fns';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/**
 * GET /api/program/enroll
 * Obtiene información del enrollment activo y la visión del usuario
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener información del usuario incluyendo tier y mentor asignado
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        tier: true, 
        rol: true,
        assignedMentorId: true,
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            imagen: true
          }
        }
      }
    });

    // Obtener enrollment activo
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            imagen: true
          }
        },
        _count: {
          select: {
            CallBooking: true
          }
        }
      }
    });

    if (!enrollment) {
      // 🆕 Si no tiene enrollment, verificar si tiene paquete de Lobo Solitario activo
      const packageCredits = await prisma.packageSessionCredits.findFirst({
        where: {
          MentorPackageOrder: {
            usuarioId: session.user.id,
            status: 'COMPLETED'
          },
          remainingSessions: {
            gt: 0
          },
          isActive: true,
          OR: [
            { expiresAt: null },
            { expiresAt: { gt: new Date() } }
          ]
        },
        include: {
          MentorPackageOrder: {
            select: {
              mentorId: true,
              Usuario_MentorPackageOrder_mentorIdToUsuario: {
                select: {
                  id: true,
                  nombre: true,
                  profileImage: true,
                  imagen: true
                }
              }
            }
          }
        }
      });

      const loboMentor = packageCredits?.MentorPackageOrder?.Usuario_MentorPackageOrder_mentorIdToUsuario;
      
      if (packageCredits && loboMentor) {
        // Usuario tiene Lobo Solitario activo
        // Verificar si ya tiene sesiones agendadas (CallBooking sin programEnrollmentId)
        const scheduledSessions = await prisma.callBooking.findMany({
          where: {
            studentId: session.user.id,
            mentorId: packageCredits.MentorPackageOrder.mentorId,
            programEnrollmentId: null, // Sesiones de Lobo Solitario no tienen enrollment
            status: {
              in: ['PENDING', 'CONFIRMED']
            }
          },
          orderBy: {
            scheduledAt: 'asc'
          },
          take: 2 // Solo las primeras 2 para identificar el patrón semanal
        });

        const needsScheduling = scheduledSessions.length === 0;
        
        // Si ya tiene sesiones, extraer el patrón de días/horas
        let scheduledPattern = null;
        if (scheduledSessions.length >= 2) {
          scheduledPattern = {
            slot1: {
              dayOfWeek: scheduledSessions[0].scheduledAt.getDay(),
              time: scheduledSessions[0].scheduledAt.toTimeString().slice(0, 5)
            },
            slot2: {
              dayOfWeek: scheduledSessions[1].scheduledAt.getDay(),
              time: scheduledSessions[1].scheduledAt.toTimeString().slice(0, 5)
            }
          };
        }
        
        return NextResponse.json({
          hasEnrollment: false,
          hasLoboSolitario: true,
          needsScheduling: needsScheduling,
          scheduledPattern: scheduledPattern,
          message: needsScheduling ? 'Necesitas agendar tus sesiones semanales' : 'Programa Lobo Solitario activo',
          userTier: usuario?.tier || 'FREE',
          userRole: usuario?.rol,
          mentor: {
            id: loboMentor.id,
            nombre: loboMentor.nombre,
            profileImage: loboMentor.profileImage || loboMentor.imagen || '/default-avatar.svg'
          },
          stats: {
            totalWeeks: 9, // Lobo Solitario = 9 semanas (63 días)
            totalSessions: 18, // 9 semanas × 2 sesiones/semana
            remainingSessions: packageCredits.remainingSessions,
            completedSessions: packageCredits.usedSessions,
            maxMissedAllowed: 3,
            missedCalls: 0
          },
          packageInfo: {
            totalSessions: packageCredits.totalSessions,
            remainingSessions: packageCredits.remainingSessions,
            usedSessions: packageCredits.usedSessions,
            expiresAt: packageCredits.expiresAt
          }
        });
      }
      
      // 🆕 Si no tiene enrollment ni Lobo Solitario, pero tiene mentor asignado
      // Este es el caso de participantes de visión que ya tienen mentor pero aún no han iniciado su programa
      const assignedMentor = usuario?.Usuario_Usuario_assignedMentorIdToUsuario;
      if (assignedMentor) {
        // Buscar la visión del usuario desde VisionParticipante
        const visionParticipante = await prisma.visionParticipante.findFirst({
          where: { participanteId: session.user.id },
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                startDate: true,
                endDate: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        });

        // Calcular semanas y sesiones desde las fechas de la visión
        let totalWeeks = 10; // Default para visiones
        let visionData = null;
        
        if (visionParticipante?.Vision) {
          const vision = visionParticipante.Vision;
          visionData = {
            id: vision.id,
            nombre: vision.nombre,
            startDate: vision.startDate,
            endDate: vision.endDate
          };
          
          if (vision.startDate && vision.endDate) {
            const start = new Date(vision.startDate);
            const end = new Date(vision.endDate);
            const diffMs = end.getTime() - start.getTime();
            const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
            totalWeeks = Math.ceil(diffDays / 7);
          }
        }

        const totalSessions = totalWeeks * 2;

        return NextResponse.json({ 
          hasEnrollment: false,
          hasLoboSolitario: false,
          hasMentorAssigned: true,
          needsScheduling: true,
          message: 'Tienes un mentor asignado. Agenda tus sesiones para iniciar tu programa.',
          userTier: usuario?.tier || 'FREE',
          userRole: usuario?.rol,
          mentor: {
            id: assignedMentor.id,
            nombre: assignedMentor.nombre,
            profileImage: assignedMentor.profileImage || assignedMentor.imagen || '/default-avatar.svg'
          },
          vision: visionData,
          stats: {
            totalWeeks: totalWeeks,
            totalSessions: totalSessions,
            remainingSessions: totalSessions,
            completedSessions: 0,
            maxMissedAllowed: 3,
            missedCalls: 0
          }
        });
      }
      
      return NextResponse.json({ 
        hasEnrollment: false,
        message: 'No tienes un programa activo',
        userTier: usuario?.tier || 'FREE',
        userRole: usuario?.rol
      });
    }

    // Verificar si el enrollment tiene sesiones ACTIVAS agendadas
    // Solo contar sesiones que no estén canceladas
    const totalActiveSessions = await prisma.callBooking.count({
      where: {
        programEnrollmentId: enrollment.id,
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      }
    });

    // Calcular cuántas sesiones debería tener
    const now = new Date();
    const endDate = enrollment.cycleEndDate ? new Date(enrollment.cycleEndDate) : null;
    const startDate = enrollment.cycleStartDate ? new Date(enrollment.cycleStartDate) : null;

    let totalWeeks = enrollment.totalWeeks || 8;
    let remainingWeeks = 0;

    if (endDate && startDate) {
      const totalMs = endDate.getTime() - startDate.getTime();
      totalWeeks = Math.ceil(totalMs / (7 * 24 * 60 * 60 * 1000));

      if (endDate > now) {
        const remainingMs = endDate.getTime() - now.getTime();
        remainingWeeks = Math.ceil(remainingMs / (7 * 24 * 60 * 60 * 1000));
      }
    }

    const expectedTotalSessions = totalWeeks * 2; // 2 sesiones por semana

    // Si el enrollment está ACTIVE pero tiene MENOS sesiones activas de las esperadas,
    // significa que el mentor fue cambiado y necesita reagendar las sesiones faltantes
    if (totalActiveSessions < expectedTotalSessions) {
      // Obtener información del mentor para mostrar en frontend
      // Primero intentar del enrollment, si no existe usar el assignedMentor del usuario
      const mentor = enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario || 
                     usuario?.Usuario_Usuario_assignedMentorIdToUsuario;

      // Buscar visión del usuario
      const visionParticipante = await prisma.visionParticipante.findFirst({
        where: {
          participanteId: session.user.id
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              startDate: true,
              endDate: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      });
      
      return NextResponse.json({
        hasEnrollment: false,
        needsReschedule: true,
        message: totalActiveSessions === 0 
          ? 'Tu mentor fue actualizado. Por favor agenda tus sesiones.'
          : `Tienes ${totalActiveSessions} de ${expectedTotalSessions} sesiones agendadas. Completa tu agenda.`,
        enrollmentId: enrollment.id,
        vision: visionParticipante?.Vision || null,
        userTier: usuario?.tier || 'FREE',
        userRole: usuario?.rol,
        mentor: mentor ? {
          id: mentor.id,
          nombre: mentor.nombre,
          profileImage: mentor.profileImage || mentor.imagen || '/default-avatar.svg'
        } : null,
        stats: {
          totalWeeks,
          remainingWeeks,
          totalSessions: expectedTotalSessions,
          activeSessions: totalActiveSessions,
          missingSessions: expectedTotalSessions - totalActiveSessions,
          completedSessions: 0,
          remainingSessions: expectedTotalSessions,
          missedCalls: 0,
          maxMissedAllowed: enrollment.maxMissedAllowed || 3
        }
      });
    }

    // Contar sesiones completadas
    const completedSessions = await prisma.callBooking.count({
      where: {
        programEnrollmentId: enrollment.id,
        status: 'COMPLETED'
      }
    });

    const remainingSessions = totalActiveSessions - completedSessions;

    // Buscar visión del usuario a través de VisionParticipante
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: {
        participanteId: session.user.id
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // Obtener información del mentor
    // Primero intentar del enrollment, si no existe usar el assignedMentor del usuario
    const mentor = enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario || 
                   usuario?.Usuario_Usuario_assignedMentorIdToUsuario;

    return NextResponse.json({
      hasEnrollment: true,
      enrollment: {
        id: enrollment.id,
        cycleType: enrollment.cycleType,
        startDate: enrollment.cycleStartDate,
        endDate: enrollment.cycleEndDate,
        status: enrollment.status
      },
      vision: visionParticipante?.Vision || null,
      userTier: usuario?.tier || 'FREE',
      userRole: usuario?.rol,
      mentor: mentor ? {
        id: mentor.id,
        nombre: mentor.nombre,
        profileImage: mentor.profileImage || mentor.imagen || '/default-avatar.svg'
      } : null,
      stats: {
        totalWeeks,
        remainingWeeks,
        totalSessions,
        completedSessions,
        remainingSessions,
        missedCalls: enrollment.missedCallsCount || 0,
        maxMissedAllowed: enrollment.maxMissedAllowed || 3
      }
    });

  } catch (error) {
    logger.error('Error en GET /api/program/enroll:', error);
    return NextResponse.json({ 
      error: 'Error al obtener información del programa' 
    }, { status: 500 });
  }
}

/**
 * POST /api/program/enroll
 * Inscribe al usuario en el programa intensivo de 17 semanas
 * Genera automáticamente 34 sesiones (2 por semana)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { mentorId, slot1, slot2, totalWeeks = 8 } = body;

    logger.debug('📥 POST /api/program/enroll - Datos recibidos:', {
      userId: session.user.id,
      mentorId,
      slot1,
      slot2,
      totalWeeks
    });

    // ===== VALIDACIÓN 1: LICENCIA, PAQUETE O MENTOR ASIGNADO (VISIÓN) =====
    // Verificar que el usuario tenga una licencia activa O un paquete de Lobo Solitario O mentor asignado por visión
    const activeLicense = await prisma.licenseAssignment.findFirst({
      where: {
        userId: session.user.id,
        isActive: true
      }
    });

    // Verificar si tiene paquete de Lobo Solitario activo
    const activePackage = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: session.user.id,
          status: 'COMPLETED'
        },
        remainingSessions: {
          gt: 0
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      }
    });

    // Verificar si tiene mentor asignado por visión (participante de visión)
    const userWithMentor = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        id: true, 
        assignedMentorId: true,
        VisionParticipante: {
          include: {
            Vision: true
          }
        }
      }
    });
    
    const hasMentorAssigned = userWithMentor?.assignedMentorId != null;
    const isVisionParticipant = hasMentorAssigned && userWithMentor?.VisionParticipante && userWithMentor.VisionParticipante.length > 0;

    // Si no tiene licencia NI paquete activo NI mentor asignado, rechazar
    if (!activeLicense && !activePackage && !hasMentorAssigned) {
      return NextResponse.json({ 
        error: 'No tienes una licencia activa. Contacta a tu coordinador para obtener acceso al programa.' 
      }, { status: 403 });
    }

    // Si tiene licencia, verificar que no haya expirado
    if (activeLicense && activeLicense.expiresAt) {
      const expirationDate = new Date(activeLicense.expiresAt);
      const now = new Date();
      
      if (expirationDate < now) {
        return NextResponse.json({ 
          error: 'Tu licencia ha expirado. Contacta a tu coordinador para renovarla.' 
        }, { status: 403 });
      }
    }

    // Log apropiado según el tipo de acceso
    if (activeLicense) {
      logger.debug('✅ Usuario tiene licencia activa:', {
        userId: session.user.id,
        licenseCode: activeLicense.licenseCode,
        expiresAt: activeLicense.expiresAt
      });
    } else if (hasMentorAssigned) {
      logger.debug('✅ Usuario tiene mentor asignado (participante de visión):', {
        userId: session.user.id,
        assignedMentorId: userWithMentor?.assignedMentorId,
        visionCount: userWithMentor?.VisionParticipante?.length || 0
      });
    } else if (activePackage) {
      logger.debug('✅ Usuario tiene paquete Lobo Solitario activo:', {
        userId: session.user.id,
        remainingSessions: activePackage.remainingSessions,
        totalSessions: activePackage.totalSessions
      });
    }

    // ===== VALIDACIÓN 2: DATOS REQUERIDOS =====
    // Validaciones
    if (!mentorId || !slot1 || !slot2) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos (mentorId, slot1, slot2)' 
      }, { status: 400 });
    }

    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      return NextResponse.json({ 
        error: 'Los dos horarios deben ser en días diferentes' 
      }, { status: 400 });
    }

    if (!slot1.time || !slot2.time) {
      return NextResponse.json({ 
        error: 'Falta especificar las horas de los slots' 
      }, { status: 400 });
    }

    // Verificar si ya tiene un programa activo
    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: session.user.id,
        status: 'ACTIVE'
      }
    });

    // Si tiene enrollment activo, lo reutilizaremos (las llamadas se eliminarán y recrearán)
    if (existingEnrollment) {
      logger.debug(`📋 Usuario tiene enrollment existente ID=${existingEnrollment.id}. Se reutilizará y reagendará.`);
    }

    // Si tiene enrollment sin sesiones (mentor fue cambiado), reutilizarlo
    const enrollmentToUse = existingEnrollment;

    // Función auxiliar para obtener la próxima fecha de un día de la semana
    const getNextDayOfWeek = (startDate: Date, targetDayOfWeek: number, weeksOffset: number): Date => {
      const currentDay = startDate.getDay();
      let daysUntilTarget = targetDayOfWeek - currentDay;
      
      if (daysUntilTarget < 0) {
        daysUntilTarget += 7;
      }
      
      const targetDate = new Date(startDate);
      targetDate.setDate(targetDate.getDate() + daysUntilTarget + (weeksOffset * 7));
      
      return startOfDay(targetDate);
    };

    // Función para parsear hora (HH:mm) y crear DateTime
    const createScheduledDateTime = (baseDate: Date, timeString: string): Date => {
      const [hours, minutes] = timeString.split(':').map(Number);
      return setMinutes(setHours(baseDate, hours), minutes);
    };

    const startDate = new Date();
    const endDate = addWeeks(startDate, totalWeeks);

    // Determinar si es Lobo Solitario (tiene paquete pero no licencia NI mentor asignado por visión)
    const isLoboSolitario = !activeLicense && !hasMentorAssigned && activePackage;
    
    logger.debug('📊 Tipo de usuario:', {
      activeLicense: !!activeLicense,
      activePackage: !!activePackage,
      hasMentorAssigned,
      isVisionParticipant,
      isLoboSolitario
    });

    // Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      let enrollment = null;
      
      // Si el usuario ya tiene llamadas PENDING con este mentor, eliminarlas primero
      // para evitar conflictos con el constraint único (mentorId, scheduledAt)
      const deletedBookings = await tx.callBooking.deleteMany({
        where: {
          studentId: session.user.id,
          status: { in: ['PENDING', 'CONFIRMED'] },
          type: 'DISCIPLINE'
        }
      });
      
      if (deletedBookings.count > 0) {
        logger.debug(`🗑️ Eliminadas ${deletedBookings.count} llamadas previas para reagendamiento`);
      }
      
      // Solo crear/reutilizar enrollment si NO es Lobo Solitario
      if (!isLoboSolitario) {
        if (enrollmentToUse) {
          // Reagendando: reutilizar enrollment existente y actualizar mentor si cambió
          logger.debug('🔄 Reutilizando enrollment existente para reagendar:', enrollmentToUse.id);
          enrollment = await tx.programEnrollment.update({
            where: { id: enrollmentToUse.id },
            data: {
              mentorId: Number(mentorId),
              // Reiniciar para nuevo ciclo
              startDate,
              endDate,
              totalWeeks,
              missedCallsCount: 0 // Reiniciar strikes al reagendar
            }
          });
        } else {
                  // Nuevo enrollment
          logger.debug('✨ Creando nuevo enrollment');
          enrollment = await tx.programEnrollment.create({
            data: {
              userId: session.user.id,
              mentorId: Number(mentorId),
              startDate,
              endDate,
              totalWeeks,
              missedCallsCount: 0,
              maxMissedAllowed: 3,
              status: 'ACTIVE'
            }
          });
        }
        logger.debug(`✅ Program Enrollment creado: ID=${enrollment.id}`);
      } else {
        logger.debug('📦 Lobo Solitario: No se crea ProgramEnrollment');
      }

      // 2. Generar las sesiones (2 por semana x N semanas)
      const bookings: any[] = [];
      const usedTimes = new Set<string>(); // Track para evitar duplicados

      for (let week = 0; week < totalWeeks; week++) {
        // Slot 1
        const slot1Date = getNextDayOfWeek(startDate, slot1.dayOfWeek, week);
        const slot1DateTime = createScheduledDateTime(slot1Date, slot1.time);
        const slot1Key = `${Number(mentorId)}-${slot1DateTime.toISOString()}`;

        logger.debug(`Week ${week + 1} Slot 1: ${slot1DateTime.toISOString()} (Day: ${DIAS_SEMANA[slot1.dayOfWeek]} ${slot1.time})`);

        if (usedTimes.has(slot1Key)) {
          logger.error(`⚠️ DUPLICADO DETECTADO: ${slot1Key}`);
          throw new Error(`Fecha duplicada detectada: ${slot1DateTime.toISOString()}`);
        }
        usedTimes.add(slot1Key);

        bookings.push({
          mentorId: Number(mentorId),
          studentId: session.user.id,
          scheduledAt: slot1DateTime,
          weekNumber: week + 1,
          programEnrollmentId: enrollment?.id || null,
          type: 'DISCIPLINE',
          status: 'PENDING',
          attendanceStatus: 'PENDING',
          duration: 15
        });

        // Slot 2
        const slot2Date = getNextDayOfWeek(startDate, slot2.dayOfWeek, week);
        const slot2DateTime = createScheduledDateTime(slot2Date, slot2.time);
        const slot2Key = `${Number(mentorId)}-${slot2DateTime.toISOString()}`;

        logger.debug(`Week ${week + 1} Slot 2: ${slot2DateTime.toISOString()} (Day: ${DIAS_SEMANA[slot2.dayOfWeek]} ${slot2.time})`);

        if (usedTimes.has(slot2Key)) {
          logger.error(`⚠️ DUPLICADO DETECTADO: ${slot2Key}`);
          throw new Error(`Fecha duplicada detectada: ${slot2DateTime.toISOString()}`);
        }
        usedTimes.add(slot2Key);

        bookings.push({
          mentorId: Number(mentorId),
          studentId: session.user.id,
          scheduledAt: slot2DateTime,
          weekNumber: week + 1,
          programEnrollmentId: enrollment?.id || null,
          type: 'DISCIPLINE',
          status: 'PENDING',
          attendanceStatus: 'PENDING',
          duration: 15
        });
      }

      // 3. Crear todos los bookings de una vez
      await tx.callBooking.createMany({
        data: bookings
      });

      logger.debug(`✅ ${bookings.length} sesiones creadas${enrollment ? ` para programa ${enrollment.id}` : ' para Lobo Solitario'}`);

      // 4. Obtener la próxima sesión
      const nextSession = await tx.callBooking.findFirst({
        where: {
          studentId: session.user.id,
          mentorId: Number(mentorId),
          programEnrollmentId: enrollment?.id || null,
          scheduledAt: { gte: new Date() }
        },
        orderBy: { scheduledAt: 'asc' }
      });

      return {
        enrollment,
        bookingsCreated: bookings.length,
        nextSession
      };
    });

    // 5. Marcar como leídas todas las notificaciones de MENTOR_ASSIGNMENT del usuario
    try {
      const notificacionesActualizadas = await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          type: 'MENTOR_ASSIGNMENT',
          isRead: false
        },
        data: {
          isRead: true
        }
      });

      if (notificacionesActualizadas.count > 0) {
        logger.debug(`📬 Marcadas ${notificacionesActualizadas.count} notificaciones como leídas`);
      }
    } catch (notifError) {
      logger.warn('⚠️ No se pudieron marcar las notificaciones como leídas:', notifError);
      // No fallar la operación principal si falla la actualización de notificaciones
    }

    return NextResponse.json({
      success: true,
      message: '¡Inscripción exitosa! Tu programa de 17 semanas ha comenzado.',
      enrollmentId: result.enrollment.id,
      bookingsCreated: result.bookingsCreated,
      totalWeeks,
      nextSession: result.nextSession ? {
        date: result.nextSession.scheduledAt.toISOString().split('T')[0],
        time: result.nextSession.scheduledAt.toISOString().split('T')[1].substring(0, 5),
        weekNumber: result.nextSession.weekNumber
      } : null
    });

  } catch (error) {
    logger.error('❌ Error en program/enroll:', error);
    return NextResponse.json({ 
      error: 'Error al inscribir en el programa',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
