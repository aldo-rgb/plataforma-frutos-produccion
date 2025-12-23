import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { addDays } from 'date-fns';

// GET: Obtener suscripción activa del estudiante
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const studentId = Number(session.user.id);

    const subscription = await prisma.disciplineSubscription.findUnique({
      where: { studentId },
      include: {
        mentor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!subscription) {
      return NextResponse.json({ 
        hasSubscription: false 
      });
    }

    // Calcular próxima llamada
    const now = new Date();
    const dayOfWeek = now.getDay(); // 0 = Domingo, 1 = Lunes, etc.
    const currentTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

    let nextCallDay: number | null = null;
    let nextCallTime: string | null = null;
    let isToday = false;

    // Verificar si toca hoy
    if (dayOfWeek === subscription.day1 && currentTime < subscription.time1) {
      nextCallDay = subscription.day1;
      nextCallTime = subscription.time1;
      isToday = true;
    } else if (dayOfWeek === subscription.day2 && currentTime < subscription.time2) {
      nextCallDay = subscription.day2;
      nextCallTime = subscription.time2;
      isToday = true;
    } else {
      // Calcular próxima llamada
      const daysToCheck = [subscription.day1, subscription.day2].sort();
      
      for (const day of daysToCheck) {
        if (day > dayOfWeek || (day === dayOfWeek && currentTime < (day === subscription.day1 ? subscription.time1 : subscription.time2))) {
          nextCallDay = day;
          nextCallTime = day === subscription.day1 ? subscription.time1 : subscription.time2;
          break;
        }
      }
      
      // Si no encontró en esta semana, tomar el primer día de la próxima semana
      if (!nextCallDay) {
        nextCallDay = daysToCheck[0];
        nextCallTime = nextCallDay === subscription.day1 ? subscription.time1 : subscription.time2;
      }
    }

    // Calcular fecha completa de próxima llamada
    let daysUntilNext = 0;
    if (!isToday) {
      if (nextCallDay! > dayOfWeek) {
        daysUntilNext = nextCallDay! - dayOfWeek;
      } else {
        daysUntilNext = 7 - dayOfWeek + nextCallDay!;
      }
    }

    const nextCallDate = addDays(now, daysUntilNext);

    return NextResponse.json({
      hasSubscription: true,
      subscription,
      nextCall: {
        date: nextCallDate.toISOString(),
        dayOfWeek: nextCallDay,
        time: nextCallTime,
        isToday
      }
    });

  } catch (error) {
    console.error('Error al obtener suscripción:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Crear suscripción de disciplina (El Compromiso)
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { mentorId, day1, time1, day2, time2 } = body;

    const studentId = Number(session.user.id);

    // Validar que el estudiante no tenga ya una suscripción activa
    const existingSub = await prisma.disciplineSubscription.findUnique({
      where: { studentId }
    });

    if (existingSub && existingSub.status === 'ACTIVE') {
      return NextResponse.json({ 
        error: 'Ya tienes una suscripción activa. Debes cancelarla primero.' 
      }, { status: 400 });
    }

    // Validar que el mentor tenga configuración de disciplina activa
    const mentorSchedule = await prisma.disciplineSchedule.findUnique({
      where: { mentorId: Number(mentorId) }
    });

    if (!mentorSchedule || !mentorSchedule.isActive) {
      return NextResponse.json({ 
        error: 'El mentor seleccionado no tiene disponibilidad activa para disciplina.' 
      }, { status: 400 });
    }

    // Validar que los días elegidos estén dentro de los días permitidos
    if (!mentorSchedule.allowedDays.includes(day1) || !mentorSchedule.allowedDays.includes(day2)) {
      return NextResponse.json({ 
        error: 'Los días seleccionados no están disponibles para este mentor.' 
      }, { status: 400 });
    }

    // Validar que las horas estén dentro de la ventana permitida
    if (time1 < mentorSchedule.startTime || time1 > mentorSchedule.endTime ||
        time2 < mentorSchedule.startTime || time2 > mentorSchedule.endTime) {
      return NextResponse.json({ 
        error: `Las horas deben estar entre ${mentorSchedule.startTime} y ${mentorSchedule.endTime}` 
      }, { status: 400 });
    }

    // Validar que no haya otro alumno con el mismo horario
    const conflictingSubscriptions = await prisma.disciplineSubscription.findMany({
      where: {
        mentorId: Number(mentorId),
        status: 'ACTIVE',
        OR: [
          { day1, time1 },
          { day1: day2, time1: time2 },
          { day2, time2 },
          { day2: day1, time2: time1 }
        ]
      }
    });

    if (conflictingSubscriptions.length > 0) {
      return NextResponse.json({ 
        error: '⚠️ Conflicto de Horario: Uno o ambos horarios ya están ocupados por otro estudiante. Por favor elige otros horarios.' 
      }, { status: 409 });
    }

    // Calcular fecha de fin (120 días desde hoy)
    const startDate = new Date();
    const endDate = addDays(startDate, 120);

    // Crear la suscripción
    const subscription = await prisma.disciplineSubscription.create({
      data: {
        studentId,
        mentorId: Number(mentorId),
        day1,
        time1,
        day2,
        time2,
        startDate,
        endDate,
        status: 'ACTIVE'
      },
      include: {
        mentor: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    console.log(`🔥 Suscripción de disciplina creada para estudiante ${studentId} con mentor ${mentorId}`);
    console.log(`📅 Horario: Día ${day1} a las ${time1} y Día ${day2} a las ${time2}`);
    console.log(`📆 Duración: ${startDate.toISOString()} hasta ${endDate.toISOString()}`);

    return NextResponse.json({
      success: true,
      subscription,
      message: `¡Compromiso establecido! Tu rutina de acero comienza ahora. Te esperamos ${day1 === 1 ? 'los Lunes' : `los días ${day1}`} a las ${time1} y ${day2 === 4 ? 'los Jueves' : `los días ${day2}`} a las ${time2}.`
    });

  } catch (error) {
    console.error('Error al crear suscripción:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Cancelar suscripción activa
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const studentId = Number(session.user.id);

    const subscription = await prisma.disciplineSubscription.update({
      where: { studentId },
      data: { 
        status: 'DROPPED',
        endDate: new Date() // Terminar ahora
      }
    });

    console.log(`🗑️ Suscripción cancelada para estudiante ${studentId}`);

    return NextResponse.json({
      success: true,
      message: 'Suscripción cancelada. Puedes crear una nueva cuando estés listo.'
    });

  } catch (error: any) {
    if (error.code === 'P2025') {
      return NextResponse.json({ 
        error: 'No tienes una suscripción activa' 
      }, { status: 404 });
    }
    
    console.error('Error al cancelar suscripción:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
