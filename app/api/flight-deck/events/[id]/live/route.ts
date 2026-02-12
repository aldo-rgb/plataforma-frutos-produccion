import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { db } from '@/lib/db';
import { FlightPhase } from '@prisma/client';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Obtener estado actual de la sesión en vivo
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

    const liveSession = await db.flightLiveSession.findUnique({
      where: { eventId },
      include: {
        CurrentPassenger: {
          include: {
            User: { select: { id: true, nombre: true, imagen: true } }
          }
        },
        Operator: { select: { id: true, nombre: true } },
        Event: {
          include: {
            Passengers: {
              include: {
                User: { select: { id: true, nombre: true, imagen: true } }
              },
              orderBy: { flightOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ 
        exists: false,
        message: 'No hay sesión en vivo activa'
      });
    }

    // Calcular siguiente pasajero
    const currentOrder = liveSession.CurrentPassenger?.flightOrder || 0;
    const nextPassenger = liveSession.Event.Passengers.find(
      p => p.flightOrder > currentOrder && p.flightStatus === 'WAITING'
    );

    return NextResponse.json({
      exists: true,
      session: {
        ...liveSession,
        nextPassenger
      }
    });
  } catch (error) {
    console.error('Error fetching live session:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Crear o iniciar sesión en vivo
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
    const user = await db.usuario.findUnique({
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

    const event = await db.flightDeckEvent.findUnique({
      where: { id: eventId },
      include: { 
        Vision: { select: { organizationId: true } },
        Passengers: {
          where: { flightStatus: 'WAITING' },
          orderBy: { flightOrder: 'asc' },
          take: 1
        }
      }
    });

    if (!event) {
      return NextResponse.json({ error: 'Evento no encontrado' }, { status: 404 });
    }

    if (!event.isConfigured) {
      return NextResponse.json({ 
        error: 'El evento no está configurado. Sube los tracks globales primero.' 
      }, { status: 400 });
    }

    // Verificar si ya existe sesión
    const existingSession = await db.flightLiveSession.findUnique({
      where: { eventId }
    });

    if (existingSession) {
      // Actualizar operador
      const updated = await db.flightLiveSession.update({
        where: { eventId },
        data: { 
          operatorId: userId,
          lastUpdatedAt: new Date()
        }
      });
      return NextResponse.json({ 
        success: true, 
        session: updated,
        message: 'Sesión existente, operador actualizado'
      });
    }

    // Crear nueva sesión
    const firstPassenger = event.Passengers[0];

    const liveSession = await db.flightLiveSession.create({
      data: {
        eventId,
        currentPassengerId: firstPassenger?.id || null,
        currentPhase: 'IDLE',
        operatorId: userId,
        sessionStartedAt: new Date()
      }
    });

    // Actualizar estado del evento
    await db.flightDeckEvent.update({
      where: { id: eventId },
      data: { 
        eventStatus: 'IN_PROGRESS',
        startedAt: new Date()
      }
    });

    return NextResponse.json({ success: true, session: liveSession });
  } catch (error) {
    console.error('Error creating live session:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH: Controlar la sesión en vivo (cambiar fase, avanzar pasajero, etc.)
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

    const liveSession = await db.flightLiveSession.findUnique({
      where: { eventId },
      include: {
        CurrentPassenger: true,
        Event: {
          include: {
            Passengers: {
              orderBy: { flightOrder: 'asc' }
            }
          }
        }
      }
    });

    if (!liveSession) {
      return NextResponse.json({ error: 'No hay sesión activa' }, { status: 404 });
    }

    const body = await request.json();
    const { action, phase, capsuleIndex, capsulePaused } = body;

    // Acción: Cambiar fase
    if (action === 'SET_PHASE' && phase) {
      const validPhases: FlightPhase[] = [
        'IDLE', 'ESTIRAMIENTO', 'TRANSFORMACION', 'VUELO', 
        'RECONOCIMIENTO', 'CAPSULA', 'DESPEDIDA'
      ];

      if (!validPhases.includes(phase)) {
        return NextResponse.json({ error: 'Fase inválida' }, { status: 400 });
      }

      // Actualizar fase del pasajero actual
      if (liveSession.currentPassengerId) {
        await db.flightPassenger.update({
          where: { id: liveSession.currentPassengerId },
          data: {
            currentPhase: phase,
            phaseStartedAt: new Date(),
            flightStatus: phase === 'IDLE' ? 'WAITING' : 'IN_PROGRESS'
          }
        });
      }

      const updated = await db.flightLiveSession.update({
        where: { eventId },
        data: {
          currentPhase: phase,
          lastUpdatedAt: new Date(),
          // Resetear estado de cápsula si cambiamos de fase
          capsuleCurrentIndex: phase === 'CAPSULA' ? 0 : liveSession.capsuleCurrentIndex,
          capsulePlaying: phase === 'CAPSULA',
          capsulePaused: false
        }
      });

      return NextResponse.json({ success: true, session: updated });
    }

    // Acción: Control de cápsula (pause, skip, etc.)
    if (action === 'CAPSULE_CONTROL') {
      const updateData: Record<string, unknown> = {
        lastUpdatedAt: new Date()
      };

      if (capsuleIndex !== undefined) updateData.capsuleCurrentIndex = capsuleIndex;
      if (capsulePaused !== undefined) updateData.capsulePaused = capsulePaused;

      const updated = await db.flightLiveSession.update({
        where: { eventId },
        data: updateData
      });

      return NextResponse.json({ success: true, session: updated });
    }

    // Acción: Siguiente pasajero
    if (action === 'NEXT_PASSENGER') {
      // Marcar pasajero actual como completado
      if (liveSession.currentPassengerId) {
        await db.flightPassenger.update({
          where: { id: liveSession.currentPassengerId },
          data: {
            flightStatus: 'COMPLETED',
            completedAt: new Date()
          }
        });
      }

      // Buscar siguiente pasajero
      const currentOrder = liveSession.CurrentPassenger?.flightOrder || 0;
      const nextPassenger = liveSession.Event.Passengers.find(
        p => p.flightOrder > currentOrder && p.flightStatus === 'WAITING'
      );

      if (!nextPassenger) {
        // No hay más pasajeros, finalizar evento
        await db.flightDeckEvent.update({
          where: { id: eventId },
          data: {
            eventStatus: 'COMPLETED',
            endedAt: new Date()
          }
        });

        await db.flightLiveSession.update({
          where: { eventId },
          data: {
            currentPassengerId: null,
            currentPhase: 'IDLE',
            lastUpdatedAt: new Date()
          }
        });

        return NextResponse.json({ 
          success: true, 
          completed: true,
          message: '¡Todos los pasajeros han completado su vuelo!'
        });
      }

      // Actualizar al siguiente pasajero
      const updated = await db.flightLiveSession.update({
        where: { eventId },
        data: {
          currentPassengerId: nextPassenger.id,
          currentPhase: 'IDLE',
          capsuleCurrentIndex: 0,
          capsulePlaying: false,
          capsulePaused: false,
          lastUpdatedAt: new Date()
        },
        include: {
          CurrentPassenger: {
            include: {
              User: { select: { id: true, nombre: true, imagen: true } }
            }
          }
        }
      });

      return NextResponse.json({ success: true, session: updated });
    }

    // Acción: Saltar pasajero (SKIP)
    if (action === 'SKIP_PASSENGER') {
      if (liveSession.currentPassengerId) {
        await db.flightPassenger.update({
          where: { id: liveSession.currentPassengerId },
          data: {
            flightStatus: 'SKIPPED'
          }
        });
      }

      // Luego llamar recursivamente a NEXT_PASSENGER
      const currentOrder = liveSession.CurrentPassenger?.flightOrder || 0;
      const nextPassenger = liveSession.Event.Passengers.find(
        p => p.flightOrder > currentOrder && p.flightStatus === 'WAITING'
      );

      if (!nextPassenger) {
        return NextResponse.json({ 
          success: true, 
          completed: true,
          message: 'No hay más pasajeros'
        });
      }

      const updated = await db.flightLiveSession.update({
        where: { eventId },
        data: {
          currentPassengerId: nextPassenger.id,
          currentPhase: 'IDLE',
          capsuleCurrentIndex: 0,
          capsulePlaying: false,
          capsulePaused: false,
          lastUpdatedAt: new Date()
        }
      });

      return NextResponse.json({ success: true, session: updated });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
  } catch (error) {
    console.error('Error controlling live session:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
