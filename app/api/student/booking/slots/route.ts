import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { addMinutes, format, parse, isBefore, startOfDay } from 'date-fns';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); // Formato YYYY-MM-DD
  const mentorId = searchParams.get('mentorId');
  const type = searchParams.get('type') || 'DISCIPLINE'; // 🔥 NUEVO: Por defecto DISCIPLINE

  if (!dateStr || !mentorId) return NextResponse.json({ error: 'Faltan datos' }, { status: 400 });
  if (type !== 'DISCIPLINE' && type !== 'MENTORSHIP') {
    return NextResponse.json({ error: 'Tipo inválido' }, { status: 400 });
  }

  // Parsear fecha correctamente para evitar problemas de zona horaria
  const [year, month, day] = dateStr.split('-').map(Number);
  const selectedDate = new Date(year, month - 1, day); // Crear fecha en zona horaria local
  const dayOfWeek = selectedDate.getDay(); // 0-6 (Domingo=0, Lunes=1, etc.)

  try {
    // 0. OBTENER PERFIL DEL MENTOR (necesitamos el perfilMentorId para excepciones)
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: Number(mentorId) },
      select: { id: true }
    });

    if (!perfilMentor) {
      console.log(`❌ No se encontró perfil para mentor ${mentorId}`);
      return NextResponse.json([]);
    }

    // 1. VERIFICAR SI EL DÍA ESTÁ BLOQUEADO POR EXCEPCIÓN (Solo para MENTORSHIP)
    // Las llamadas de DISCIPLINE (5-8 AM) NO se bloquean por vacaciones
    if (type === 'MENTORSHIP') {
      const excepcion = await prisma.excepcionDisponibilidad.findFirst({
        where: {
          perfilMentorId: perfilMentor.id,
          fechaInicio: {
            lte: selectedDate // La excepción inicia antes o en la fecha seleccionada
          },
          fechaFin: {
            gte: selectedDate // La excepción termina después o en la fecha seleccionada
          }
        }
      });

      // Si hay una excepción activa (vacaciones, día bloqueado), no hay slots disponibles
      if (excepcion) {
        console.log(`🚫 Día bloqueado para mentorías ${mentorId} el ${dateStr}: ${excepcion.motivo || 'Día no disponible'}`);
        return NextResponse.json([]);
      }
    } else {
      // Para DISCIPLINE, ignoramos excepciones - las llamadas de disciplina son obligatorias
      console.log(`✅ Llamada de disciplina - ignorando días bloqueados para mentor ${mentorId}`);
    }

    // 2. OBTENER CONFIGURACIÓN DEL MENTOR PARA ESE DÍA Y TIPO
    console.log(`🔍 Buscando disponibilidad: fecha=${dateStr}, dayOfWeek=${dayOfWeek} (${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek]}), tipo=${type}, mentorId=${mentorId}`);
    
    const availability = await prisma.callAvailability.findFirst({
      where: {
        mentorId: Number(mentorId),
        dayOfWeek: dayOfWeek,
        isActive: true,
        type: type as any // 🔥 Filtrar por tipo de calendario
      }
    });

    // Si el mentor no trabaja hoy, devolvemos array vacío
    if (!availability) {
      console.log(`📅 Mentor ${mentorId} no trabaja los ${['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'][dayOfWeek]} (dayOfWeek=${dayOfWeek}) para tipo ${type}`);
      return NextResponse.json([]);
    }

    console.log(`✅ Disponibilidad encontrada: ${availability.startTime} - ${availability.endTime}`);

    // 3. OBTENER RESERVAS YA OCUPADAS (CallBooking + SolicitudMentoria)
    const startOfDayDate = startOfDay(selectedDate);
    
    // 3A. Obtener CallBookings ocupadas
    const existingBookings = await prisma.callBooking.findMany({
      where: {
        mentorId: Number(mentorId),
        scheduledAt: {
          gte: startOfDayDate,
          lt: addMinutes(startOfDayDate, 24 * 60)
        },
        status: { not: 'CANCELLED' },
        type: type as any
      }
    });

    // 3B. 🛡️ ANTI-CONFLICTO: Obtener SolicitudesMentoria confirmadas/pendientes
    const existingMentorias = await prisma.solicitudMentoria.findMany({
      where: {
        perfilMentorId: Number(mentorId),
        fechaSolicitada: {
          gte: startOfDayDate,
          lt: addMinutes(startOfDayDate, 24 * 60)
        },
        estado: {
          in: ['PENDIENTE', 'CONFIRMADA'] // Bloqueamos desde que se solicita
        },
        horaSolicitada: { not: null } // Solo bloquear si tiene hora definida
      }
    });

    // Combinar horarios ocupados de ambas fuentes
    const busyTimes = [
      ...existingBookings.map(b => format(b.scheduledAt, 'HH:mm')),
      ...existingMentorias.map(m => m.horaSolicitada).filter(Boolean) as string[]
    ];
    
    console.log(`🚫 Horarios ocupados para ${dateStr} (${busyTimes.length} slots):`, busyTimes);

    // 4. GENERAR HUECOS DE 15 MINUTOS (EL MAGO DEL TIEMPO)
    const slots = [];
    const SESSION_DURATION = 15; // Minutos

    // Parseamos hora inicio y fin configurada (ej. "09:00" a Date object)
    let currentTime = parse(availability.startTime, 'HH:mm', selectedDate);
    const endTime = parse(availability.endTime, 'HH:mm', selectedDate);
    const now = new Date(); // Para no mostrar horarios pasados hoy

    // Bucle: Mientras la hora actual + 15 min sea menor o igual al fin del turno
    while (isBefore(addMinutes(currentTime, SESSION_DURATION), endTime) || currentTime.getTime() === endTime.getTime()) {
      const timeString = format(currentTime, 'HH:mm');

      // REGLA DE ORO: Solo agregamos el slot si:
      // A. No está en la lista de busyTimes (Ocupados)
      // B. Es una hora futura (no permitir reservar las 9am si son las 10am)
      if (!busyTimes.includes(timeString) && isBefore(now, currentTime)) {
        slots.push({
          time: timeString,
          available: true
        });
      }

      // Avanzamos 15 minutos
      currentTime = addMinutes(currentTime, SESSION_DURATION);
    }

    console.log(`✅ ${slots.length} slots disponibles para mentor ${mentorId} el ${dateStr}`);
    return NextResponse.json(slots);

  } catch (error) {
    console.error('❌ Error calculando agenda:', error);
    return NextResponse.json({ 
      error: 'Error calculando agenda',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
