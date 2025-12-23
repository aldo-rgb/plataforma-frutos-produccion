import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/disponibilidad/slots?mentorId=123&mes=2025-12&tipo=MENTORSHIP
 * 
 * Calcula los slots disponibles cruzando las 3 capas:
 * 1. CallAvailability (Configuración de disponibilidad por tipo)
 * 2. ExcepcionDisponibilidad (Vacaciones/Bloqueos)
 * 3. SolicitudMentoria + CallBooking (Reservas confirmadas)
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorIdParam = searchParams.get('mentorId');
    const mesParam = searchParams.get('mes'); // Formato: "2025-12"
    const tipo = searchParams.get('tipo') || 'MENTORSHIP'; // DISCIPLINE o MENTORSHIP

    if (!mentorIdParam) {
      return NextResponse.json({ 
        error: 'mentorId es requerido' 
      }, { status: 400 });
    }

    const mentorId = parseInt(mentorIdParam);

    // Obtener perfil del mentor
    const perfilMentor = await prisma.perfilMentor.findFirst({
      where: { usuarioId: mentorId },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'Mentor no encontrado' 
      }, { status: 404 });
    }

    // Determinar rango de fechas (mes completo o próximos 30 días)
    let fechaInicio: Date;
    let fechaFin: Date;

    if (mesParam) {
      const [año, mes] = mesParam.split('-').map(Number);
      fechaInicio = new Date(año, mes - 1, 1);
      fechaFin = new Date(año, mes, 0, 23, 59, 59);
    } else {
      fechaInicio = new Date();
      fechaFin = new Date();
      fechaFin.setDate(fechaFin.getDate() + 30);
    }

    // CAPA 1: Obtener disponibilidad desde CallAvailability
    const disponibilidadConfig = await prisma.callAvailability.findMany({
      where: {
        mentorId: mentorId,
        isActive: true,
        type: tipo as any // DISCIPLINE o MENTORSHIP
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    if (disponibilidadConfig.length === 0) {
      return NextResponse.json({ 
        success: true, 
        slots: [],
        mensaje: `El mentor no ha configurado disponibilidad para ${tipo === 'DISCIPLINE' ? 'llamadas de disciplina' : 'mentorías'}`
      });
    }

    // CAPA 2: Obtener excepciones (vacaciones/bloqueos)
    const excepciones = await prisma.excepcionDisponibilidad.findMany({
      where: {
        perfilMentorId: perfilMentor.id,
        fechaInicio: { lte: fechaFin },
        fechaFin: { gte: fechaInicio }
      }
    });

    // CAPA 3: Obtener reservas confirmadas
    const reservas = await prisma.solicitudMentoria.findMany({
      where: {
        perfilMentorId: perfilMentor.id,
        estado: 'CONFIRMADA',
        fechaSolicitada: {
          gte: fechaInicio,
          lte: fechaFin
        }
      },
      select: {
        fechaSolicitada: true,
        horaSolicitada: true
      }
    });

    // CAPA 3B: Obtener CallBookings
    const callBookings = await prisma.callBooking.findMany({
      where: {
        mentorId: mentorId,
        scheduledAt: {
          gte: fechaInicio,
          lte: fechaFin
        },
        status: { not: 'CANCELLED' },
        type: tipo as any
      },
      select: {
        scheduledAt: true,
        duration: true
      }
    });

    // GENERAR SLOTS
    const slots: any[] = [];
    const duracionSlot = tipo === 'DISCIPLINE' ? 15 : 60; // 15 min para disciplina, 60 para mentoría

    // Iterar cada día del rango
    let fechaActual = new Date(fechaInicio);
    
    while (fechaActual <= fechaFin) {
      const diaSemana = fechaActual.getDay();
      
      // Buscar disponibilidad para este día de la semana en CallAvailability
      const disponibilidadDia = disponibilidadConfig.filter(d => d.dayOfWeek === diaSemana);

      if (disponibilidadDia.length > 0) {
        // Verificar si este día está bloqueado por excepción
        const estaBloqueado = excepciones.some(exc => {
          const fechaActualSinHora = new Date(fechaActual);
          fechaActualSinHora.setHours(0, 0, 0, 0);
          
          const inicioExc = new Date(exc.fechaInicio);
          inicioExc.setHours(0, 0, 0, 0);
          
          const finExc = new Date(exc.fechaFin);
          finExc.setHours(23, 59, 59, 999);

          return fechaActualSinHora >= inicioExc && fechaActualSinHora <= finExc;
        });

        if (!estaBloqueado) {
          // Generar slots para cada bloque de disponibilidad
          for (const bloque of disponibilidadDia) {
            const [horaInicio, minutoInicio] = bloque.startTime.split(':').map(Number);
            const [horaFin, minutoFin] = bloque.endTime.split(':').map(Number);

            let horaActual = horaInicio;
            let minutoActual = minutoInicio;

            while (
              horaActual < horaFin || 
              (horaActual === horaFin && minutoActual < minutoFin)
            ) {
              const fechaSlot = new Date(fechaActual);
              fechaSlot.setHours(horaActual, minutoActual, 0, 0);

              // Verificar si este slot está reservado en SolicitudMentoria
              const reservadoEnMentoria = reservas.some(reserva => {
                if (!reserva.fechaSolicitada || !reserva.horaSolicitada) return false;
                
                const [horaRes, minRes] = reserva.horaSolicitada.split(':').map(Number);
                const fechaReserva = new Date(reserva.fechaSolicitada);
                fechaReserva.setHours(horaRes, minRes, 0, 0);
                
                const finReserva = new Date(fechaReserva);
                finReserva.setMinutes(finReserva.getMinutes() + duracionSlot);

                return fechaSlot >= fechaReserva && fechaSlot < finReserva;
              });

              // Verificar si este slot está reservado en CallBooking
              const reservadoEnCall = callBookings.some(booking => {
                const fechaBooking = new Date(booking.scheduledAt);
                const finBooking = new Date(fechaBooking);
                finBooking.setMinutes(finBooking.getMinutes() + (booking.duration || duracionSlot));

                return fechaSlot >= fechaBooking && fechaSlot < finBooking;
              });

              // Verificar que no sea pasado
              const ahora = new Date();
              const noEsPasado = fechaSlot > ahora;

              const estaReservado = reservadoEnMentoria || reservadoEnCall;

              if (!estaReservado && noEsPasado) {
                slots.push({
                  fecha: fechaSlot.toISOString(),
                  disponible: true,
                  hora: `${String(horaActual).padStart(2, '0')}:${String(minutoActual).padStart(2, '0')}`
                });
              }

              // Avanzar al siguiente slot
              minutoActual += duracionSlot;
              if (minutoActual >= 60) {
                horaActual += Math.floor(minutoActual / 60);
                minutoActual = minutoActual % 60;
              }
            }
          }
        }
      }

      // Avanzar al siguiente día
      fechaActual.setDate(fechaActual.getDate() + 1);
    }

    return NextResponse.json({ 
      success: true, 
      slots,
      total: slots.length,
      rango: {
        inicio: fechaInicio.toISOString(),
        fin: fechaFin.toISOString()
      }
    });

  } catch (error) {
    console.error('❌ Error al calcular slots:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
