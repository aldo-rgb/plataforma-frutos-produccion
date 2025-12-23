import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addDays, format, getDay } from 'date-fns';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { mentorId, selectedDays, selectedTimes } = body;
    // selectedDays: [1, 4] (Lunes y Jueves)
    // selectedTimes: { "1": "05:15", "4": "06:00" } (Hora específica para cada día)

    const studentId = session.user.id;

    // 1. VALIDACIÓN: Verificar que el mentor tiene configuración de disciplina
    const mentorConfig = await prisma.disciplineSchedule.findUnique({
      where: { mentorId: Number(mentorId) }
    });

    if (!mentorConfig) {
      return NextResponse.json({ 
        error: '⚠️ El mentor seleccionado no tiene configuración de disciplina activa.' 
      }, { status: 400 });
    }

    // 2. VALIDACIÓN: Verificar que los días seleccionados están permitidos
    const invalidDays = selectedDays.filter((day: number) => !mentorConfig.allowedDays.includes(day));
    if (invalidDays.length > 0) {
      return NextResponse.json({ 
        error: `⚠️ Los días seleccionados no están disponibles para este mentor.` 
      }, { status: 400 });
    }

    // 3. VALIDACIÓN: Verificar que las horas están dentro del rango permitido
    for (const day of selectedDays) {
      const time = selectedTimes[day.toString()];
      if (time < mentorConfig.startTime || time > mentorConfig.endTime) {
        return NextResponse.json({ 
          error: `⚠️ La hora ${time} está fuera del rango permitido (${mentorConfig.startTime} - ${mentorConfig.endTime})` 
        }, { status: 400 });
      }
    }

    // 4. CONFIGURACIÓN DEL PERIODO
    const TOTAL_DAYS = 120;
    const startDate = new Date();
    const groupId = crypto.randomUUID(); // ID único para este lote de llamadas
    
    const bookingsToCreate = [];
    
    // 5. BUCLE MAESTRO: RECORREMOS LOS PRÓXIMOS 120 DÍAS
    for (let i = 1; i <= TOTAL_DAYS; i++) {
      const currentDate = addDays(startDate, i);
      const dayOfWeek = getDay(currentDate); // 0=Domingo, 1=Lunes, 2=Martes...

      // ¿Este día de la semana fue elegido por el alumno?
      if (selectedDays.includes(dayOfWeek)) {
        const time = selectedTimes[dayOfWeek.toString()]; // ej. "05:15"
        
        // Construimos la fecha completa ISO
        const dateString = format(currentDate, 'yyyy-MM-dd');
        const scheduledAt = new Date(`${dateString}T${time}:00`);

        bookingsToCreate.push({
          studentId: studentId,
          mentorId: Number(mentorId),
          scheduledAt: scheduledAt,
          status: 'PENDING',
          type: 'DISCIPLINE',
          duration: 15,
          recurringGroupId: groupId
        });
      }
    }

    console.log(`📅 Intentando crear ${bookingsToCreate.length} llamadas recurrentes para estudiante ${studentId} con mentor ${mentorId}`);

    // 6. TRANSACCIÓN ATÓMICA (Todo o Nada)
    // Intentamos reservar todo el bloque. Si un día choca (@@unique), fallará todo.
    const createdBookings = await prisma.$transaction(
      bookingsToCreate.map(booking => 
        prisma.callBooking.create({ data: booking })
      )
    );

    console.log(`✅ Se crearon ${createdBookings.length} llamadas exitosamente. GroupId: ${groupId}`);

    return NextResponse.json({ 
      success: true,
      groupId: groupId,
      totalBookings: createdBookings.length,
      message: `¡Agenda Creada! Se han programado ${createdBookings.length} llamadas de disciplina para los próximos 120 días.` 
    });

  } catch (error: any) {
    console.error('❌ Error al crear llamadas recurrentes:', error);
    
    // Si falla por choque de horario (P2002 = violación de constraint unique)
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: '⚠️ Conflicto de Agenda: Uno o más días futuros ya están ocupados por otro alumno en ese horario. Por favor, elige otro horario o días diferentes.' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Error interno al crear las llamadas recurrentes. Por favor, intenta nuevamente.' 
    }, { status: 500 });
  }
}

// GET: Obtener las llamadas recurrentes existentes del estudiante
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const studentId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (groupId) {
      // Obtener todas las llamadas de un grupo específico
      const bookings = await prisma.callBooking.findMany({
        where: {
          studentId: studentId,
          recurringGroupId: groupId,
          type: 'DISCIPLINE'
        },
        orderBy: { scheduledAt: 'asc' },
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

      return NextResponse.json({ bookings });
    }

    // Obtener estadísticas de llamadas de disciplina del estudiante
    const now = new Date();
    
    const stats = await prisma.callBooking.groupBy({
      by: ['status'],
      where: {
        studentId: studentId,
        type: 'DISCIPLINE'
      },
      _count: true
    });

    const nextCall = await prisma.callBooking.findFirst({
      where: {
        studentId: studentId,
        type: 'DISCIPLINE',
        scheduledAt: { gte: now },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      orderBy: { scheduledAt: 'asc' },
      include: {
        mentor: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({ 
      stats,
      nextCall
    });

  } catch (error) {
    console.error('Error al obtener llamadas recurrentes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Cancelar todo un grupo de llamadas recurrentes
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const groupId = searchParams.get('groupId');

    if (!groupId) {
      return NextResponse.json({ error: 'groupId es requerido' }, { status: 400 });
    }

    const studentId = parseInt(session.user.id);

    // Cancelar todas las llamadas futuras del grupo
    const result = await prisma.callBooking.updateMany({
      where: {
        studentId: studentId,
        recurringGroupId: groupId,
        scheduledAt: { gte: new Date() },
        status: { in: ['PENDING', 'CONFIRMED'] }
      },
      data: {
        status: 'CANCELLED'
      }
    });

    console.log(`🗑️ Canceladas ${result.count} llamadas del grupo ${groupId}`);

    return NextResponse.json({ 
      success: true,
      cancelledCount: result.count,
      message: `Se cancelaron ${result.count} llamadas futuras.`
    });

  } catch (error) {
    console.error('Error al cancelar llamadas recurrentes:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
