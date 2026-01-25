// API para gestionar llamadas semanales PL (átomo y grupo)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET: Obtener llamadas PL de una visión/squad
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const squadId = searchParams.get('squadId');
    const weekNumber = searchParams.get('weekNumber');
    const callType = searchParams.get('callType'); // ATOM o GROUP

    if (!visionId) {
      return NextResponse.json({ error: 'visionId es requerido' }, { status: 400 });
    }

    const where: any = {
      visionId: parseInt(visionId),
    };

    if (squadId) {
      where.squadId = squadId;
    }

    if (weekNumber) {
      where.weekNumber = parseInt(weekNumber);
    }

    if (callType) {
      where.callType = callType;
    }

    const calls = await prisma.pLWeeklyCall.findMany({
      where,
      include: {
        vision: {
          select: { id: true, nombre: true }
        },
        squad: {
          select: { 
            id: true, 
            name: true,
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: { id: true, nombre: true, email: true, image: true }
                }
              }
            }
          }
        },
        scheduledBy: {
          select: { id: true, nombre: true, email: true }
        },
        attendances: {
          include: {
            participant: {
              select: { id: true, nombre: true, email: true, image: true }
            }
          }
        }
      },
      orderBy: [
        { weekNumber: 'asc' },
        { scheduledDate: 'asc' }
      ]
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error('Error fetching PL calls:', error);
    return NextResponse.json({ error: 'Error al obtener llamadas' }, { status: 500 });
  }
}

// POST: Crear una nueva llamada PL
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const {
      visionId,
      squadId, // null para llamadas de grupo
      callType, // 'ATOM' o 'GROUP'
      weekNumber,
      scheduledDate,
      scheduledTime,
      duration = 30,
    } = body;

    // Validaciones
    if (!visionId || !callType || !weekNumber || !scheduledDate || !scheduledTime) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: visionId, callType, weekNumber, scheduledDate, scheduledTime' 
      }, { status: 400 });
    }

    if (callType !== 'ATOM' && callType !== 'GROUP') {
      return NextResponse.json({ error: 'callType debe ser ATOM o GROUP' }, { status: 400 });
    }

    if (callType === 'ATOM' && !squadId) {
      return NextResponse.json({ error: 'squadId es requerido para llamadas de átomo' }, { status: 400 });
    }

    // Verificar que el usuario puede crear la llamada
    const userId = parseInt(session.user.id);
    
    // Si es llamada de átomo, verificar que el usuario es el líder del squad
    if (callType === 'ATOM' && squadId) {
      const squad = await prisma.smallGroup.findUnique({
        where: { id: squadId },
        select: { leaderId: true, visionId: true }
      });

      if (!squad || squad.leaderId !== userId) {
        return NextResponse.json({ 
          error: 'Solo el líder del átomo puede agendar llamadas de átomo' 
        }, { status: 403 });
      }
    }

    // Crear la llamada
    const call = await prisma.pLWeeklyCall.create({
      data: {
        visionId: parseInt(visionId),
        squadId: squadId || null,
        callType,
        weekNumber: parseInt(weekNumber),
        scheduledDate: new Date(scheduledDate),
        scheduledTime,
        duration,
        scheduledById: userId,
        status: 'SCHEDULED',
      },
      include: {
        vision: { select: { id: true, nombre: true } },
        squad: { select: { id: true, name: true } },
        scheduledBy: { select: { id: true, nombre: true } }
      }
    });

    // Si es llamada de átomo, crear registros de asistencia para todos los miembros del squad
    if (callType === 'ATOM' && squadId) {
      const members = await prisma.smallGroupMember.findMany({
        where: { groupId: squadId, isActive: true },
        select: { userId: true }
      });

      if (members.length > 0) {
        await prisma.pLCallAttendance.createMany({
          data: members.map(m => ({
            callId: call.id,
            participantId: m.userId,
          }))
        });
      }
    }
    
    // Si es llamada de grupo, crear registros para todos los participantes PL de la visión
    if (callType === 'GROUP') {
      const plEnrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: parseInt(visionId),
          level: 'PL',
          enrollmentStatus: { in: ['ENROLLED', 'COMPLETED'] },
          droppedAt: null
        },
        select: { userId: true }
      });

      if (plEnrollments.length > 0) {
        await prisma.pLCallAttendance.createMany({
          data: plEnrollments.map(e => ({
            callId: call.id,
            participantId: e.userId,
          })),
          skipDuplicates: true
        });
      }
    }

    return NextResponse.json({ call }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating PL call:', error);
    
    // Manejar error de duplicado
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Ya existe una llamada para esta semana' 
      }, { status: 409 });
    }
    
    return NextResponse.json({ error: 'Error al crear llamada' }, { status: 500 });
  }
}
