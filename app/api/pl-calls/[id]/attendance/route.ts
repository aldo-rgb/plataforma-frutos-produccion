// API para registrar/actualizar asistencia en llamadas PL
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Obtener detalles de asistencia de una llamada
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: callId } = await params;

    const attendances = await prisma.pLCallAttendance.findMany({
      where: { callId },
      include: {
        participant: {
          select: { 
            id: true, 
            nombre: true, 
            email: true, 
            image: true,
            telefono: true
          }
        }
      },
      orderBy: {
        participant: { nombre: 'asc' }
      }
    });

    return NextResponse.json({ attendances });
  } catch (error) {
    logger.error('Error fetching attendance:', error);
    return NextResponse.json({ error: 'Error al obtener asistencia' }, { status: 500 });
  }
}

// PUT: Actualizar asistencia (individual o masiva)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: callId } = await params;
    const body = await request.json();

    // Verificar que la llamada existe y el usuario tiene permisos
    const call = await prisma.pLWeeklyCall.findUnique({
      where: { id: callId },
      include: {
        squad: { select: { leaderId: true } }
      }
    });

    if (!call) {
      return NextResponse.json({ error: 'Llamada no encontrada' }, { status: 404 });
    }

    const userId = parseInt(session.user.id);

    // Solo el que agendó o el líder del squad puede actualizar
    if (call.scheduledById !== userId && call.squad?.leaderId !== userId) {
      // Verificar si es capitán o coordinador de la visión
      const isCoordinator = await prisma.visionStaff.findFirst({
        where: {
          visionId: call.visionId,
          userId,
          staffRole: { in: ['PL_COORDINATOR', 'PL_TRAINER'] }
        }
      });

      const isCaptain = await prisma.visionGameChanger.findFirst({
        where: {
          visionId: call.visionId,
          gameChangerId: userId,
          level: 'PL',
          isCaptain: true
        }
      });

      if (!isCoordinator && !isCaptain) {
        return NextResponse.json({ 
          error: 'No tienes permisos para actualizar esta llamada' 
        }, { status: 403 });
      }
    }

    // Si es actualización masiva (array de asistencias)
    if (Array.isArray(body.attendances)) {
      const updates = body.attendances.map((att: any) => 
        prisma.pLCallAttendance.update({
          where: {
            callId_participantId: {
              callId,
              participantId: att.participantId
            }
          },
          data: {
            attended: att.attended,
            attendedAt: att.attended ? new Date() : null,
            rating: att.rating,
            notes: att.notes,
            isAtRisk: att.isAtRisk || false,
            riskNotes: att.riskNotes,
          }
        })
      );

      await prisma.$transaction(updates);

      return NextResponse.json({ success: true, updated: body.attendances.length });
    }

    // Actualización individual
    const { participantId, attended, rating, notes, isAtRisk, riskNotes } = body;

    if (!participantId) {
      return NextResponse.json({ error: 'participantId es requerido' }, { status: 400 });
    }

    const attendance = await prisma.pLCallAttendance.update({
      where: {
        callId_participantId: {
          callId,
          participantId: parseInt(participantId)
        }
      },
      data: {
        attended: attended !== undefined ? attended : undefined,
        attendedAt: attended ? new Date() : null,
        rating: rating !== undefined ? rating : undefined,
        notes: notes !== undefined ? notes : undefined,
        isAtRisk: isAtRisk !== undefined ? isAtRisk : undefined,
        riskNotes: riskNotes !== undefined ? riskNotes : undefined,
      },
      include: {
        participant: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    return NextResponse.json({ attendance });
  } catch (error) {
    logger.error('Error updating attendance:', error);
    return NextResponse.json({ error: 'Error al actualizar asistencia' }, { status: 500 });
  }
}

// POST: Agregar participante a la llamada (por si se agregó tarde al grupo)
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: callId } = await params;
    const { participantId } = await request.json();

    if (!participantId) {
      return NextResponse.json({ error: 'participantId es requerido' }, { status: 400 });
    }

    // Verificar que la llamada existe
    const call = await prisma.pLWeeklyCall.findUnique({
      where: { id: callId }
    });

    if (!call) {
      return NextResponse.json({ error: 'Llamada no encontrada' }, { status: 404 });
    }

    // Crear registro de asistencia
    const attendance = await prisma.pLCallAttendance.create({
      data: {
        callId,
        participantId: parseInt(participantId),
      },
      include: {
        participant: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error: any) {
    logger.error('Error adding participant:', error);
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'El participante ya está registrado en esta llamada' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Error al agregar participante' }, { status: 500 });
  }
}
