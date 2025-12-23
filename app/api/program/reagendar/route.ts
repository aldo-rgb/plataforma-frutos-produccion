import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { addWeeks, startOfDay, setHours, setMinutes, addDays } from 'date-fns';

/**
 * POST /api/program/reagendar
 * Re-agenda las semanas restantes de un programa después de cambio de mentor
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { programId, slot1, slot2 } = body;

    // Validaciones básicas
    if (!programId || !slot1 || !slot2) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos (programId, slot1, slot2)' 
      }, { status: 400 });
    }

    if (slot1.dayOfWeek === slot2.dayOfWeek) {
      return NextResponse.json({ 
        error: 'Los dos horarios deben ser en días diferentes' 
      }, { status: 400 });
    }

    // 1. Obtener el programa
    const programa: any = await (prisma as any).programEnrollment.findUnique({
      where: { id: parseInt(programId) },
      include: {
        CallBookings: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            attendanceStatus: true
          }
        }
      }
    });

    if (!programa) {
      return NextResponse.json({ error: 'Programa no encontrado' }, { status: 404 });
    }

    // Verificar que el programa pertenece al usuario
    if (programa.userId !== session.user.id) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Verificar que el programa está activo
    if (programa.status !== 'ACTIVE') {
      return NextResponse.json({ 
        error: 'El programa no está activo' 
      }, { status: 400 });
    }

    // 2. Calcular sesiones ya realizadas
    const sesionesCompletadas = programa.CallBookings.filter((call: any) => 
      call.attendanceStatus === 'PRESENT' || call.status === 'COMPLETED'
    ).length;

    // 3. Calcular semanas completadas (2 sesiones por semana)
    const semanasCompletadas = Math.floor(sesionesCompletadas / 2);
    const semanasRestantes = programa.totalWeeks - semanasCompletadas;

    console.log(`
📊 CÁLCULO DE RE-AGENDAMIENTO
Total de semanas: ${programa.totalWeeks}
Sesiones completadas: ${sesionesCompletadas}
Semanas completadas: ${semanasCompletadas}
Semanas restantes: ${semanasRestantes}
    `.trim());

    if (semanasRestantes <= 0) {
      return NextResponse.json({ 
        error: 'El programa ya está completo' 
      }, { status: 400 });
    }

    // 4. Generar nuevas sesiones para las semanas restantes
    const nuevasSesiones = [];
    const ahora = new Date();
    let fechaInicio = startOfDay(ahora);

    // Ajustar fecha de inicio al próximo día disponible
    const diasHastaSlot1 = (slot1.dayOfWeek - ahora.getDay() + 7) % 7;
    const diasHastaSlot2 = (slot2.dayOfWeek - ahora.getDay() + 7) % 7;
    
    // Comenzar desde el slot más cercano
    const primerDia = Math.min(diasHastaSlot1 === 0 ? 7 : diasHastaSlot1, 
                                diasHastaSlot2 === 0 ? 7 : diasHastaSlot2);
    fechaInicio = addDays(fechaInicio, primerDia);

    // Generar 2 sesiones por semana restante
    for (let semana = 0; semana < semanasRestantes; semana++) {
      const inicioSemana = addWeeks(fechaInicio, semana);

      // Sesión 1
      const fechaSlot1 = addDays(
        startOfDay(inicioSemana),
        (slot1.dayOfWeek - inicioSemana.getDay() + 7) % 7
      );
      const [hora1, minuto1] = slot1.time.split(':').map(Number);
      const fechaFinal1 = setMinutes(setHours(fechaSlot1, hora1), minuto1);

      nuevasSesiones.push({
        mentorId: programa.mentorId,
        studentId: programa.userId,
        scheduledAt: fechaFinal1,
        duration: 15,
        status: 'PENDING',
        type: 'DISCIPLINE',
        programEnrollmentId: programa.id,
        weekNumber: semanasCompletadas + semana + 1,
        attendanceStatus: 'PENDING',
        createdAt: ahora
      });

      // Sesión 2
      const fechaSlot2 = addDays(
        startOfDay(inicioSemana),
        (slot2.dayOfWeek - inicioSemana.getDay() + 7) % 7
      );
      const [hora2, minuto2] = slot2.time.split(':').map(Number);
      const fechaFinal2 = setMinutes(setHours(fechaSlot2, hora2), minuto2);

      nuevasSesiones.push({
        mentorId: programa.mentorId,
        studentId: programa.userId,
        scheduledAt: fechaFinal2,
        duration: 15,
        status: 'PENDING',
        type: 'DISCIPLINE',
        programEnrollmentId: programa.id,
        weekNumber: semanasCompletadas + semana + 1,
        attendanceStatus: 'PENDING',
        createdAt: ahora
      });
    }

    // 5. Insertar las nuevas sesiones
    await prisma.callBooking.createMany({
      data: nuevasSesiones as any
    });

    console.log(`✅ Re-agendadas ${nuevasSesiones.length} sesiones para ${semanasRestantes} semanas`);

    return NextResponse.json({
      success: true,
      message: 'Sesiones re-agendadas exitosamente',
      detalles: {
        semanasCompletadas,
        semanasRestantes,
        sesionesGeneradas: nuevasSesiones.length,
        proximaSesion: nuevasSesiones[0].scheduledAt
      }
    });

  } catch (error) {
    console.error('Error al re-agendar programa:', error);
    return NextResponse.json(
      { error: 'Error interno al re-agendar' },
      { status: 500 }
    );
  }
}
