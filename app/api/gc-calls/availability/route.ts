import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const GC_ROLES = ['GAMECHANGER', 'TRAINER', 'SCHOOL_ADMIN', 'COORDINADOR'];

/**
 * GET /api/gc-calls/availability
 * Obtener bloques de disponibilidad del GC
 * Query params: squadId (opcional), date (opcional)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const squadId = searchParams.get('squadId');
    const gameChangerId = searchParams.get('gameChangerId');

    // Determinar qué GC consultar
    const targetGCId = gameChangerId ? parseInt(gameChangerId) : user.id;

    const availability = await prisma.gCAvailability.findMany({
      where: {
        gameChangerId: targetGCId,
        isActive: true,
        ...(squadId && { squadId }),
      },
      include: {
        squad: {
          select: { id: true, name: true, level: true },
        },
        bookedSlots: {
          where: { status: { in: ['SCHEDULED', 'CONFIRMED'] } },
          select: { scheduledDate: true, scheduledTime: true },
        },
      },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });

    return NextResponse.json({
      success: true,
      availability: availability.map(a => ({
        id: a.id,
        dayOfWeek: a.dayOfWeek,
        specificDate: a.specificDate,
        startTime: a.startTime,
        endTime: a.endTime,
        slotDuration: a.slotDuration,
        squad: a.squad,
        bookedSlots: a.bookedSlots.map(s => ({
          date: s.scheduledDate,
          time: s.scheduledTime,
        })),
      })),
    });
  } catch (error) {
    console.error('Error fetching GC availability:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * POST /api/gc-calls/availability
 * Crear/Actualizar disponibilidad del GC
 * Body: { squadId?, dayOfWeek?, specificDate?, startTime, endTime, slotDuration? }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true },
    });

    if (!user || !GC_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      squadId, 
      dayOfWeek, 
      specificDate, 
      startTime, 
      endTime, 
      slotDuration = 10 
    } = body;

    // Validar horario dentro de ventana permitida (5:00 - 10:00)
    const startHour = parseInt(startTime.split(':')[0]);
    const endHour = parseInt(endTime.split(':')[0]);
    
    if (startHour < 5 || endHour > 10 || startHour >= endHour) {
      return NextResponse.json({
        success: false,
        error: 'El horario debe estar entre 5:00 AM y 10:00 AM',
      }, { status: 400 });
    }

    // Si es para un squad específico, verificar que el usuario sea el líder
    if (squadId) {
      const squad = await prisma.smallGroup.findUnique({
        where: { id: squadId },
        select: { leaderId: true },
      });

      if (!squad || squad.leaderId !== user.id) {
        return NextResponse.json({
          success: false,
          error: 'No eres el líder de este escuadrón',
        }, { status: 403 });
      }
    }

    // Crear el bloque de disponibilidad
    const availability = await prisma.gCAvailability.create({
      data: {
        gameChangerId: user.id,
        squadId: squadId || null,
        dayOfWeek: dayOfWeek ?? null,
        specificDate: specificDate ? new Date(specificDate) : null,
        startTime,
        endTime,
        slotDuration,
      },
      include: {
        squad: {
          select: { id: true, name: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Disponibilidad creada exitosamente',
      availability: {
        id: availability.id,
        dayOfWeek: availability.dayOfWeek,
        specificDate: availability.specificDate,
        startTime: availability.startTime,
        endTime: availability.endTime,
        slotDuration: availability.slotDuration,
        squad: availability.squad,
      },
    });
  } catch (error) {
    console.error('Error creating GC availability:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

/**
 * DELETE /api/gc-calls/availability
 * Eliminar un bloque de disponibilidad
 * Query: id
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const availabilityId = searchParams.get('id');

    if (!availabilityId) {
      return NextResponse.json({ success: false, error: 'ID requerido' }, { status: 400 });
    }

    // Verificar que pertenece al usuario
    const availability = await prisma.gCAvailability.findFirst({
      where: {
        id: availabilityId,
        gameChangerId: user.id,
      },
    });

    if (!availability) {
      return NextResponse.json({ success: false, error: 'No encontrado' }, { status: 404 });
    }

    // Soft delete
    await prisma.gCAvailability.update({
      where: { id: availabilityId },
      data: { isActive: false },
    });

    return NextResponse.json({
      success: true,
      message: 'Disponibilidad eliminada',
    });
  } catch (error) {
    console.error('Error deleting availability:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
