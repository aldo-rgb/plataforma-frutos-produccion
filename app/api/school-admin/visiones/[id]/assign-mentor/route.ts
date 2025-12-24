import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// POST - Asignar mentor a participante o game changer
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { userId, mentorId, userType } = body; // userType: 'PARTICIPANTE' o 'GAMECHANGER'

    if (isNaN(visionId) || !userId || !mentorId || !userType) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: { Organization: true }
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el mentor existe y está activo
    const mentor = await prisma.usuario.findFirst({
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
      return NextResponse.json(
        { error: 'Mentor no encontrado o no está activo' },
        { status: 404 }
      );
    }

    if (mentor.CallAvailability.length === 0) {
      return NextResponse.json(
        { error: 'El mentor no tiene horarios de llamadas de disciplina configurados' },
        { status: 400 }
      );
    }

    // Verificar que el usuario existe y tiene licencia
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        licenseCode: true,
        rol: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    if (!usuario.licenseCode) {
      return NextResponse.json(
        { error: 'El usuario debe tener una licencia asignada antes de poder asignar un mentor' },
        { status: 400 }
      );
    }

    // Actualizar el usuario con el mentor asignado
    const updatedUser = await prisma.usuario.update({
      where: { id: userId },
      data: {
        assignedMentorId: mentorId
      },
      include: {
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true
          }
        }
      }
    });

    // Actualizar también en la tabla de relación si es participante
    if (userType === 'PARTICIPANTE') {
      await prisma.visionParticipante.updateMany({
        where: {
          visionId,
          participanteId: userId
        },
        data: {
          gameChangerId: mentorId // Usamos este campo para trackear el mentor
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Mentor asignado exitosamente',
      user: updatedUser
    });

  } catch (error) {
    console.error('Error al asignar mentor:', error);
    return NextResponse.json(
      { error: 'Error al asignar mentor' },
      { status: 500 }
    );
  }
}

// DELETE - Remover mentor asignado
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '');
    const userType = searchParams.get('userType') || '';

    if (isNaN(visionId) || isNaN(userId)) {
      return NextResponse.json(
        { error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    // Remover mentor asignado
    await prisma.usuario.update({
      where: { id: userId },
      data: {
        assignedMentorId: null
      }
    });

    // Limpiar también en la tabla de relación si es participante
    if (userType === 'PARTICIPANTE') {
      await prisma.visionParticipante.updateMany({
        where: {
          visionId,
          participanteId: userId
        },
        data: {
          gameChangerId: null
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Mentor removido exitosamente'
    });

  } catch (error) {
    console.error('Error al remover mentor:', error);
    return NextResponse.json(
      { error: 'Error al remover mentor' },
      { status: 500 }
    );
  }
}
