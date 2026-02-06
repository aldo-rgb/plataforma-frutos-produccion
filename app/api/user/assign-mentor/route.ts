import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

/**
 * POST /api/user/assign-mentor
 * Asigna un mentor a un usuario
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { mentorId } = await request.json();

    if (!mentorId) {
      return NextResponse.json({ error: 'mentorId es requerido' }, { status: 400 });
    }

    // Obtener el usuario actual
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el mentor existe y es válido
    const mentor = await prisma.usuario.findUnique({
      where: { 
        id: mentorId,
        rol: 'MENTOR',
        isActive: true
      },
      include: {
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      }
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Mentor no encontrado o no válido' }, { status: 404 });
    }

    if (mentor.CallAvailability.length === 0) {
      return NextResponse.json({ 
        error: 'El mentor seleccionado no tiene horarios de disciplina configurados' 
      }, { status: 400 });
    }

    // Asignar el mentor al usuario
    const updatedUser = await prisma.usuario.update({
      where: { id: usuario.id },
      data: { assignedMentorId: mentorId }
    });

    return NextResponse.json({
      success: true,
      message: 'Mentor asignado exitosamente',
      assignedMentorId: updatedUser.assignedMentorId
    });

  } catch (error) {
    logger.error('Error al asignar mentor:', error);
    return NextResponse.json(
      { error: 'Error al asignar mentor' },
      { status: 500 }
    );
  }
}
