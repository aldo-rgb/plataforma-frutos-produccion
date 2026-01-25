// API para obtener detalles, completar o cancelar una llamada PL específica
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET: Obtener detalles completos de una llamada
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: callId } = await params;

    const call = await prisma.pLWeeklyCall.findUnique({
      where: { id: callId },
      include: {
        vision: {
          select: { 
            id: true, 
            nombre: true,
            plWeekend1StartDate: true,
            plWeekend1EndDate: true,
            plWeekend2StartDate: true,
            plWeekend2EndDate: true,
            plWeekend3StartDate: true,
            plWeekend3EndDate: true
          }
        },
        squad: {
          select: { 
            id: true, 
            name: true,
            leader: {
              select: { id: true, nombre: true, email: true, image: true }
            },
            members: {
              where: { isActive: true },
              include: {
                user: {
                  select: { id: true, nombre: true, email: true, image: true, telefono: true }
                }
              }
            }
          }
        },
        scheduledBy: {
          select: { id: true, nombre: true, email: true }
        },
        cancelledByUser: {
          select: { id: true, nombre: true }
        },
        attendances: {
          include: {
            participant: {
              select: { id: true, nombre: true, email: true, image: true, telefono: true }
            }
          },
          orderBy: {
            participant: { nombre: 'asc' }
          }
        }
      }
    });

    if (!call) {
      return NextResponse.json({ error: 'Llamada no encontrada' }, { status: 404 });
    }

    // Calcular estadísticas de asistencia
    const stats = {
      total: call.attendances.length,
      attended: call.attendances.filter(a => a.attended === true).length,
      notAttended: call.attendances.filter(a => a.attended === false).length,
      pending: call.attendances.filter(a => a.attended === null).length,
      atRisk: call.attendances.filter(a => a.isAtRisk).length,
      averageRating: call.attendances.filter(a => a.rating).reduce((acc, a) => acc + (a.rating || 0), 0) / 
        (call.attendances.filter(a => a.rating).length || 1)
    };

    return NextResponse.json({ call, stats });
  } catch (error) {
    console.error('Error fetching PL call:', error);
    return NextResponse.json({ error: 'Error al obtener llamada' }, { status: 500 });
  }
}

// PUT: Actualizar estado de la llamada (completar, cancelar, etc.)
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: callId } = await params;
    const body = await request.json();
    const { action, generalNotes, cancelReason } = body;

    // Verificar que la llamada existe
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

    // Verificar permisos
    if (call.scheduledById !== userId && call.squad?.leaderId !== userId) {
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
          error: 'No tienes permisos para modificar esta llamada' 
        }, { status: 403 });
      }
    }

    let updateData: any = {};

    switch (action) {
      case 'start':
        if (call.status !== 'SCHEDULED') {
          return NextResponse.json({ error: 'La llamada no está en estado SCHEDULED' }, { status: 400 });
        }
        updateData = { status: 'IN_PROGRESS' };
        break;

      case 'complete':
        if (call.status !== 'SCHEDULED' && call.status !== 'IN_PROGRESS') {
          return NextResponse.json({ error: 'La llamada no puede ser completada' }, { status: 400 });
        }
        updateData = { 
          status: 'COMPLETED',
          completedAt: new Date(),
          generalNotes: generalNotes || call.generalNotes
        };
        break;

      case 'cancel':
        if (call.status === 'COMPLETED' || call.status === 'CANCELLED') {
          return NextResponse.json({ error: 'La llamada ya fue completada o cancelada' }, { status: 400 });
        }
        updateData = {
          status: 'CANCELLED',
          cancelledAt: new Date(),
          cancelledBy: userId,
          cancelReason: cancelReason || null
        };
        break;

      case 'no_show':
        if (call.status !== 'SCHEDULED' && call.status !== 'IN_PROGRESS') {
          return NextResponse.json({ error: 'La llamada no puede marcarse como no_show' }, { status: 400 });
        }
        updateData = {
          status: 'NO_SHOW',
          completedAt: new Date(),
          generalNotes: generalNotes || 'Nadie se presentó a la llamada'
        };
        break;

      case 'update_notes':
        updateData = { generalNotes };
        break;

      case 'reschedule':
        if (!body.scheduledDate || !body.scheduledTime) {
          return NextResponse.json({ error: 'Se requiere nueva fecha y hora' }, { status: 400 });
        }
        if (call.status === 'COMPLETED' || call.status === 'CANCELLED') {
          return NextResponse.json({ error: 'No se puede reprogramar una llamada completada o cancelada' }, { status: 400 });
        }
        updateData = {
          scheduledDate: new Date(body.scheduledDate),
          scheduledTime: body.scheduledTime,
          duration: body.duration || call.duration,
          status: 'SCHEDULED'
        };
        break;

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const updatedCall = await prisma.pLWeeklyCall.update({
      where: { id: callId },
      data: updateData,
      include: {
        vision: { select: { id: true, nombre: true } },
        squad: { select: { id: true, name: true } },
        scheduledBy: { select: { id: true, nombre: true } }
      }
    });

    return NextResponse.json({ call: updatedCall });
  } catch (error) {
    console.error('Error updating PL call:', error);
    return NextResponse.json({ error: 'Error al actualizar llamada' }, { status: 500 });
  }
}

// DELETE: Eliminar una llamada (solo si no está completada)
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id: callId } = await params;

    const call = await prisma.pLWeeklyCall.findUnique({
      where: { id: callId }
    });

    if (!call) {
      return NextResponse.json({ error: 'Llamada no encontrada' }, { status: 404 });
    }

    if (call.status === 'COMPLETED') {
      return NextResponse.json({ error: 'No se puede eliminar una llamada completada' }, { status: 400 });
    }

    // Eliminar asistencias primero (cascade debería hacerlo, pero por seguridad)
    await prisma.pLCallAttendance.deleteMany({
      where: { callId }
    });

    await prisma.pLWeeklyCall.delete({
      where: { id: callId }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting PL call:', error);
    return NextResponse.json({ error: 'Error al eliminar llamada' }, { status: 500 });
  }
}
