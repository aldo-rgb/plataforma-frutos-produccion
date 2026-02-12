import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Obtener eventos de Flight Deck disponibles para el usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, organizationId: true, esEntrenador: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo TRAINER, COORDINADOR, SCHOOL_ADMIN, ADMIN, o usuarios con esEntrenador pueden ver Flight Deck
    const allowedRoles = ['TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN'];
    const hasAccess = allowedRoles.includes(user.rol) || user.esEntrenador;
    if (!hasAccess) {
      return NextResponse.json({ error: 'No tienes acceso a Flight Deck' }, { status: 403 });
    }

    // Determinar si el usuario es entrenador (por rol o por flag)
    const isTrainer = user.rol === 'TRAINER' || user.esEntrenador;

    // Buscar eventos donde el usuario es TRAINER asignado al tercer fin de semana (liderato)
    // O es COORDINADOR/SCHOOL_ADMIN de la organización
    let events;

    if (user.rol === 'ADMIN') {
      // Admin ve todos los eventos
      events = await prisma.flightDeckEvent.findMany({
        include: {
          Vision: {
            select: { id: true, nombre: true, organizationId: true }
          },
          Creator: {
            select: { id: true, nombre: true }
          },
          _count: {
            select: { Passengers: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else if (isTrainer) {
      // Entrenador solo ve eventos donde está asignado al staff de la visión como TRAINER
      // Incluir todos los roles de entrenador (TRAINER, PL_TRAINER, BASIC_TRAINER, ADVANCED_TRAINER)
      const visionStaffAssignments = await prisma.visionStaff.findMany({
        where: {
          userId: userId,
          role: { in: ['TRAINER', 'PL_TRAINER', 'BASIC_TRAINER', 'ADVANCED_TRAINER'] }
        },
        select: { visionId: true }
      });

      const visionIds = visionStaffAssignments.map(vs => vs.visionId);

      events = await prisma.flightDeckEvent.findMany({
        where: {
          visionId: { in: visionIds }
        },
        include: {
          Vision: {
            select: { id: true, nombre: true, organizationId: true }
          },
          Creator: {
            select: { id: true, nombre: true }
          },
          _count: {
            select: { Passengers: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    } else {
      // COORDINADOR o SCHOOL_ADMIN ve eventos de su organización
      events = await prisma.flightDeckEvent.findMany({
        where: {
          Vision: {
            organizationId: user.organizationId
          }
        },
        include: {
          Vision: {
            select: { id: true, nombre: true, organizationId: true }
          },
          Creator: {
            select: { id: true, nombre: true }
          },
          _count: {
            select: { Passengers: true }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
    }

    return NextResponse.json({ events, userRole: user.rol });
  } catch (error) {
    console.error('Error fetching flight deck events:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Crear nuevo evento de Flight Deck para una visión
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo COORDINADOR, SCHOOL_ADMIN, ADMIN pueden crear eventos
    const allowedRoles = ['COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para crear eventos' }, { status: 403 });
    }

    const body = await request.json();
    const { visionId } = body;

    if (!visionId) {
      return NextResponse.json({ error: 'visionId es requerido' }, { status: 400 });
    }

    // Verificar que la visión existe y pertenece a la organización del usuario
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { id: true, nombre: true, organizationId: true }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    if (user.rol !== 'ADMIN' && vision.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No tienes acceso a esta visión' }, { status: 403 });
    }

    // Verificar si ya existe un evento para esta visión
    const existingEvent = await prisma.flightDeckEvent.findUnique({
      where: { visionId }
    });

    if (existingEvent) {
      return NextResponse.json({ 
        error: 'Ya existe un evento de Flight Deck para esta visión',
        event: existingEvent
      }, { status: 409 });
    }

    // Crear el evento
    const event = await prisma.flightDeckEvent.create({
      data: {
        visionId,
        creatorId: userId
      },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Obtener participantes graduados de la visión y agregarlos como pasajeros
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        status: { in: ['ACTIVE', 'SEATED', 'GRADUATED'] }
      },
      include: {
        Usuario: {
          select: { id: true, nombre: true, imagen: true }
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Crear pasajeros para cada participante
    const passengers = await prisma.flightPassenger.createMany({
      data: enrollments.map((enrollment, index) => ({
        eventId: event.id,
        userId: enrollment.usuarioId,
        flightOrder: index + 1
      }))
    });

    return NextResponse.json({
      success: true,
      event,
      passengersCreated: passengers.count
    });
  } catch (error) {
    console.error('Error creating flight deck event:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
