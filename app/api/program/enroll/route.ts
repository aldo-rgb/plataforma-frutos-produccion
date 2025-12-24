import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addWeeks, startOfDay, setHours, setMinutes } from 'date-fns';

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
            CallBookings: true
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ 
        hasEnrollment: false,
        message: 'No tienes un programa activo'
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

    let totalWeeks = enrollment.totalWeeks || 17;
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
      const mentor = enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario;

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
    const mentor = enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario;

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
    console.error('Error en GET /api/program/enroll:', error);
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
    const { mentorId, slot1, slot2, totalWeeks = 17 } = body;

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

    // Si tiene enrollment, verificar cuántas sesiones ACTIVAS tiene
    if (existingEnrollment) {
      const activeSessionsCount = await prisma.callBooking.count({
        where: {
          programEnrollmentId: existingEnrollment.id,
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        }
      });

      // Calcular cuántas sesiones debería tener
      let expectedSessions = (existingEnrollment.totalWeeks || 17) * 2;
      
      // Si tiene todas las sesiones activas agendadas, no puede crear más
      if (activeSessionsCount >= expectedSessions) {
        return NextResponse.json({ 
          error: 'Ya tienes un programa activo con sesiones agendadas. Complétalo antes de inscribirte a otro.' 
        }, { status: 409 });
      }
      
      // Si tiene menos sesiones de las esperadas, puede completarlas
      console.log(`✅ Usuario tiene ${activeSessionsCount} de ${expectedSessions} sesiones. Puede completar.`);
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

    // Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear o reutilizar el enrollment
      let enrollment;
      
      if (enrollmentToUse) {
        // Reagendando: reutilizar enrollment existente y actualizar mentor si cambió
        console.log('🔄 Reutilizando enrollment existente para reagendar:', enrollmentToUse.id);
        enrollment = await tx.programEnrollment.update({
          where: { id: enrollmentToUse.id },
          data: {
            mentorId: Number(mentorId),
            // Mantener las fechas originales del ciclo
            startDate: enrollmentToUse.startDate || startDate,
            endDate: enrollmentToUse.endDate || endDate,
            totalWeeks: enrollmentToUse.totalWeeks || totalWeeks
          }
        });
      } else {
        // Nuevo enrollment
        console.log('✨ Creando nuevo enrollment');
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

      console.log(`✅ Program Enrollment creado: ID=${enrollment.id}`);

      // 2. Generar las 34 sesiones (2 por semana x 17 semanas)
      const bookings: any[] = [];
      const usedTimes = new Set<string>(); // Track para evitar duplicados

      for (let week = 0; week < totalWeeks; week++) {
        // Slot 1
        const slot1Date = getNextDayOfWeek(startDate, slot1.dayOfWeek, week);
        const slot1DateTime = createScheduledDateTime(slot1Date, slot1.time);
        const slot1Key = `${Number(mentorId)}-${slot1DateTime.toISOString()}`;

        console.log(`Week ${week + 1} Slot 1: ${slot1DateTime.toISOString()} (Day: ${DIAS_SEMANA[slot1.dayOfWeek]} ${slot1.time})`);

        if (usedTimes.has(slot1Key)) {
          console.error(`⚠️ DUPLICADO DETECTADO: ${slot1Key}`);
          throw new Error(`Fecha duplicada detectada: ${slot1DateTime.toISOString()}`);
        }
        usedTimes.add(slot1Key);

        bookings.push({
          mentorId: Number(mentorId),
          studentId: session.user.id,
          scheduledAt: slot1DateTime,
          weekNumber: week + 1,
          programEnrollmentId: enrollment.id,
          type: 'DISCIPLINE',
          status: 'PENDING',
          attendanceStatus: 'PENDING',
          duration: 15
        });

        // Slot 2
        const slot2Date = getNextDayOfWeek(startDate, slot2.dayOfWeek, week);
        const slot2DateTime = createScheduledDateTime(slot2Date, slot2.time);
        const slot2Key = `${Number(mentorId)}-${slot2DateTime.toISOString()}`;

        console.log(`Week ${week + 1} Slot 2: ${slot2DateTime.toISOString()} (Day: ${DIAS_SEMANA[slot2.dayOfWeek]} ${slot2.time})`);

        if (usedTimes.has(slot2Key)) {
          console.error(`⚠️ DUPLICADO DETECTADO: ${slot2Key}`);
          throw new Error(`Fecha duplicada detectada: ${slot2DateTime.toISOString()}`);
        }
        usedTimes.add(slot2Key);

        bookings.push({
          mentorId: Number(mentorId),
          studentId: session.user.id,
          scheduledAt: slot2DateTime,
          weekNumber: week + 1,
          programEnrollmentId: enrollment.id,
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

      console.log(`✅ ${bookings.length} sesiones creadas para programa ${enrollment.id}`);

      // 4. Obtener la próxima sesión
      const nextSession = await tx.callBooking.findFirst({
        where: {
          programEnrollmentId: enrollment.id,
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
    console.error('❌ Error en program/enroll:', error);
    return NextResponse.json({ 
      error: 'Error al inscribir en el programa',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 });
  }
}
