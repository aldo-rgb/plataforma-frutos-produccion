import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addWeeks, startOfDay, setHours, setMinutes } from 'date-fns';

export const dynamic = 'force-dynamic';

const DIAS_SEMANA = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

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

    if (existingEnrollment) {
      return NextResponse.json({ 
        error: 'Ya tienes un programa activo. Complétalo antes de inscribirte a otro.' 
      }, { status: 409 });
    }

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
      // 1. Crear el enrollment
      const enrollment = await tx.programEnrollment.create({
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
