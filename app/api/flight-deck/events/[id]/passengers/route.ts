import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// PATCH: Actualizar orden de pasajeros o asignar canción
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const event = await prisma.flightDeckEvent.findUnique({
      where: { id: eventId },
      include: { Vision: { select: { organizationId: true } } }
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'ADMIN' && event.Vision.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const body = await request.json();
    const { action, passengerId, flightOrder, flightSongUrl, flightSongName, capsuleAudios, newOrder } = body;

    // Acción: Reordenar todos los pasajeros (drag & drop)
    if (action === 'REORDER' && newOrder) {
      // newOrder es un array de IDs en el nuevo orden
      const updates = newOrder.map((passId: number, index: number) => 
        prisma.flightPassenger.update({
          where: { id: passId },
          data: { flightOrder: index + 1 }
        })
      );

      await prisma.$transaction(updates);

      return NextResponse.json({ success: true, message: 'Orden actualizado' });
    }

    // Acción: Actualizar pasajero individual
    if (passengerId) {
      const passenger = await prisma.flightPassenger.findUnique({
        where: { id: passengerId }
      });

      if (!passenger || passenger.eventId !== eventId) {
        return NextResponse.json({ error: 'Pasajero no encontrado' }, { status: 404 });
      }

      const updateData: Record<string, unknown> = {};

      if (flightOrder !== undefined) updateData.flightOrder = flightOrder;
      if (flightSongUrl !== undefined) updateData.flightSongUrl = flightSongUrl;
      if (flightSongName !== undefined) updateData.flightSongName = flightSongName;
      if (capsuleAudios !== undefined) updateData.capsuleAudios = capsuleAudios;

      const updated = await prisma.flightPassenger.update({
        where: { id: passengerId },
        data: updateData,
        include: {
          User: { select: { id: true, nombre: true, imagen: true } }
        }
      });

      return NextResponse.json({ success: true, passenger: updated });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error updating passengers:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Agregar un nuevo pasajero manualmente
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const event = await prisma.flightDeckEvent.findUnique({
      where: { id: eventId },
      include: { 
        Vision: { select: { organizationId: true } },
        Passengers: { select: { flightOrder: true }, orderBy: { flightOrder: 'desc' }, take: 1 }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'ADMIN' && event.Vision.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const body = await request.json();
    const { participantUserId } = body;

    if (!participantUserId) {
      return NextResponse.json({ error: 'participantUserId es requerido' }, { status: 400 });
    }

    // Verificar si ya existe
    const existing = await prisma.flightPassenger.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId: participantUserId
        }
      }
    });

    if (existing) {
      return NextResponse.json({ error: 'Este participante ya está en la lista' }, { status: 409 });
    }

    const lastOrder = event.Passengers[0]?.flightOrder || 0;

    const passenger = await prisma.flightPassenger.create({
      data: {
        eventId,
        userId: participantUserId,
        flightOrder: lastOrder + 1
      },
      include: {
        User: { select: { id: true, nombre: true, imagen: true } }
      }
    });

    return NextResponse.json({ success: true, passenger });
  } catch (error) {
    console.error('Error adding passenger:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Remover pasajero
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const eventId = parseInt(id);

    if (isNaN(eventId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const passengerId = parseInt(searchParams.get('passengerId') || '');

    if (isNaN(passengerId)) {
      return NextResponse.json({ error: 'passengerId es requerido' }, { status: 400 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    const passenger = await prisma.flightPassenger.findUnique({
      where: { id: passengerId },
      include: {
        Event: {
          include: { Vision: { select: { organizationId: true } } }
        }
      }
    });

    if (!passenger || passenger.eventId !== eventId) {
      return NextResponse.json({ error: 'Pasajero no encontrado' }, { status: 404 });
    }

    if (user.rol !== 'ADMIN' && passenger.Event.Vision.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    if (passenger.flightStatus === 'IN_PROGRESS' || passenger.flightStatus === 'COMPLETED') {
      return NextResponse.json({ 
        error: 'No se puede eliminar un pasajero que ya inició o completó su vuelo' 
      }, { status: 400 });
    }

    await prisma.flightPassenger.delete({
      where: { id: passengerId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error removing passenger:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
