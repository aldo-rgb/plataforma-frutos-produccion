import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentor/slots-disponibles
 * Retorna los horarios disponibles del mentor excluyendo los ya reservados
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');

    if (!mentorId) {
      return NextResponse.json({ error: 'mentorId requerido' }, { status: 400 });
    }

    // 1. Obtener disponibilidad configurada del mentor
    const disponibilidad = await prisma.callAvailability.findMany({
      where: {
        mentorId: parseInt(mentorId),
        type: 'DISCIPLINE',
        isActive: true
      },
      select: {
        dayOfWeek: true,
        startTime: true,
        endTime: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    // 2. Obtener todas las sesiones ya reservadas del mentor (futuras y activas)
    const fechaActual = new Date();
    const reservasExistentes = await prisma.callBooking.findMany({
      where: {
        mentorId: parseInt(mentorId),
        type: 'DISCIPLINE',
        scheduledAt: {
          gte: fechaActual
        },
        status: {
          in: ['PENDING', 'CONFIRMED']
        }
      },
      select: {
        scheduledAt: true
      }
    });

    // 3. Crear set de slots ocupados en formato "dayOfWeek-HH:MM"
    const slotsOcupados = new Set<string>();
    reservasExistentes.forEach(reserva => {
      const fecha = new Date(reserva.scheduledAt);
      const dayOfWeek = fecha.getDay();
      const hours = fecha.getHours().toString().padStart(2, '0');
      const minutes = fecha.getMinutes().toString().padStart(2, '0');
      const slotKey = `${dayOfWeek}-${hours}:${minutes}`;
      slotsOcupados.add(slotKey);
    });

    // 4. Generar slots disponibles considerando ocupados
    const slotsDisponibles: { [key: number]: string[] } = {};

    disponibilidad.forEach(d => {
      const [startHour, startMin] = d.startTime.split(':').map(Number);
      const [endHour, endMin] = d.endTime.split(':').map(Number);
      const startMinutes = startHour * 60 + startMin;
      const endMinutes = endHour * 60 + endMin;

      if (!slotsDisponibles[d.dayOfWeek]) {
        slotsDisponibles[d.dayOfWeek] = [];
      }

      // Generar slots cada 20 minutos
      for (let minutes = startMinutes; minutes < endMinutes; minutes += 20) {
        const hour = Math.floor(minutes / 60);
        const min = minutes % 60;
        const timeString = `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
        const slotKey = `${d.dayOfWeek}-${timeString}`;

        // Solo agregar si NO está ocupado
        if (!slotsOcupados.has(slotKey)) {
          slotsDisponibles[d.dayOfWeek].push(timeString);
        }
      }
    });

    return NextResponse.json({
      disponibilidad: disponibilidad.map(d => ({
        dayOfWeek: d.dayOfWeek,
        startTime: d.startTime,
        endTime: d.endTime
      })),
      slotsDisponibles,
      slotsOcupados: Array.from(slotsOcupados),
      totalReservas: reservasExistentes.length
    });

  } catch (error) {
    console.error('❌ Error al obtener slots disponibles:', error);
    return NextResponse.json({ 
      error: 'Error al cargar slots disponibles' 
    }, { status: 500 });
  }
}
