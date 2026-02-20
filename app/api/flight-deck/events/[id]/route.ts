import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Obtener evento con todos sus pasajeros y configuración
export async function GET(request: NextRequest, { params }: RouteParams) {
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

    const event = await prisma.flightDeckEvent.findUnique({
      where: { id: eventId },
      include: {
        Vision: {
          select: { 
            id: true, 
            nombre: true, 
            organizationId: true,
            Organization: {
              select: { id: true, name: true, logoUrl: true }
            }
          }
        },
        Creator: {
          select: { id: true, nombre: true }
        },
        Passengers: {
          include: {
            User: {
              select: { id: true, nombre: true, imagen: true, email: true }
            }
          },
          orderBy: { flightOrder: 'asc' }
        },
        CurrentFlight: true
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    // Verificar acceso
    const allowedRoles = ['TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN', 'ADMINISTRADOR'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    if ((user.rol !== 'ADMIN' && user.rol !== 'ADMINISTRADOR') && event.Vision.organizationId !== user.organizationId) {
      // Si es TRAINER, verificar que está asignado a esta visión
      if (user.rol === 'TRAINER') {
        const isAssigned = await prisma.visionStaff.findFirst({
          where: {
            userId,
            visionId: event.visionId,
            role: 'TRAINER'
          }
        });
        if (!isAssigned) {
          return NextResponse.json({ error: 'No estás asignado a esta visión' }, { status: 403 });
        }
      } else {
        return NextResponse.json({ error: 'No tienes acceso a esta visión' }, { status: 403 });
      }
    }

    // Obtener audios de Time Capsule para cada pasajero si hay campaña activa
    const capsuleCampaign = await prisma.timeCapsuleCampaign.findFirst({
      where: {
        visionId: event.visionId,
        isReleased: true
      }
    });

    let passengersWithCapsules = event.Passengers;

    if (capsuleCampaign) {
      // Cargar audios de cápsulas para cada pasajero
      const capsuleMessages = await prisma.capsuleMessage.findMany({
        where: {
          campaignId: capsuleCampaign.id,
          recipientId: { in: event.Passengers.map(p => p.userId) },
          audioUrl: { not: null }
        },
        select: {
          recipientId: true,
          audioUrl: true,
          audioDuration: true,
          senderName: true,
          senderRelation: true
        },
        orderBy: { createdAt: 'asc' }
      });

      // Agrupar por recipiente
      const capsulesByRecipient = capsuleMessages.reduce((acc, msg) => {
        if (!acc[msg.recipientId]) acc[msg.recipientId] = [];
        acc[msg.recipientId].push({
          url: msg.audioUrl,
          duration: msg.audioDuration,
          senderName: msg.senderName,
          senderRelation: msg.senderRelation
        });
        return acc;
      }, {} as Record<number, Array<{ url: string | null; duration: number | null; senderName: string; senderRelation: string | null }>>);

      passengersWithCapsules = event.Passengers.map(p => ({
        ...p,
        capsuleAudios: capsulesByRecipient[p.userId] || p.capsuleAudios || []
      }));
    }

    return NextResponse.json({
      event: {
        ...event,
        Passengers: passengersWithCapsules
      },
      hasCapsuleCampaign: !!capsuleCampaign
    });
  } catch (error) {
    console.error('Error fetching flight deck event:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH: Actualizar configuración del evento o tracks globales
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

    const allowedRoles = ['TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN', 'ADMINISTRADOR'];
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

    // Verificar acceso
    if ((user.rol !== 'ADMIN' && user.rol !== 'ADMINISTRADOR') && event.Vision.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    const body = await request.json();
    const {
      trackEstiramiento,
      trackTransformacion,
      trackReconocimiento,
      trackDespedida,
      trackVueloGenerico,
      crossfadeDuration,
      duckingVolume,
      eventStatus
    } = body;

    const updateData: Record<string, unknown> = {};

    if (trackEstiramiento !== undefined) updateData.trackEstiramiento = trackEstiramiento;
    if (trackTransformacion !== undefined) updateData.trackTransformacion = trackTransformacion;
    if (trackReconocimiento !== undefined) updateData.trackReconocimiento = trackReconocimiento;
    if (trackDespedida !== undefined) updateData.trackDespedida = trackDespedida;
    if (trackVueloGenerico !== undefined) updateData.trackVueloGenerico = trackVueloGenerico;
    if (crossfadeDuration !== undefined) updateData.crossfadeDuration = crossfadeDuration;
    if (duckingVolume !== undefined) updateData.duckingVolume = duckingVolume;
    if (eventStatus !== undefined) updateData.eventStatus = eventStatus;

    // Verificar si todos los tracks obligatorios están configurados
    const checkFields = {
      trackEstiramiento: trackEstiramiento ?? event.trackEstiramiento,
      trackTransformacion: trackTransformacion ?? event.trackTransformacion,
      trackReconocimiento: trackReconocimiento ?? event.trackReconocimiento,
      trackDespedida: trackDespedida ?? event.trackDespedida
    };

    updateData.isConfigured = Object.values(checkFields).every(v => v && v.length > 0);

    // Si está iniciando el evento
    if (eventStatus === 'IN_PROGRESS' && event.eventStatus !== 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    // Si está terminando el evento
    if (eventStatus === 'COMPLETED' && event.eventStatus !== 'COMPLETED') {
      updateData.endedAt = new Date();
    }

    const updated = await prisma.flightDeckEvent.update({
      where: { id: eventId },
      data: updateData
    });

    return NextResponse.json({ success: true, event: updated });
  } catch (error) {
    console.error('Error updating flight deck event:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE: Eliminar evento (solo si no ha iniciado)
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

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN', 'ADMINISTRADOR'];
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

    if ((user.rol !== 'ADMIN' && user.rol !== 'ADMINISTRADOR') && event.Vision.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso' }, { status: 403 });
    }

    if (event.eventStatus === 'IN_PROGRESS' || event.eventStatus === 'COMPLETED') {
      return NextResponse.json({ 
        error: 'No se puede eliminar un evento que ya inició o completó' 
      }, { status: 400 });
    }

    await prisma.flightDeckEvent.delete({
      where: { id: eventId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting flight deck event:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
