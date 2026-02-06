import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

// GET - Obtener el capitán PL actual de una visión
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const visionId = parseInt(params.id);
    if (isNaN(visionId)) {
      return NextResponse.json({ error: 'ID de visión inválido' }, { status: 400 });
    }

    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        plCaptainUserId: true,
        PlCaptain: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    return NextResponse.json({
      plCaptain: vision.PlCaptain || null
    });
  } catch (error) {
    logger.error('Error al obtener capitán PL:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Asignar un capitán PL a una visión
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const visionId = parseInt(params.id);
    if (isNaN(visionId)) {
      return NextResponse.json({ error: 'ID de visión inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json({ error: 'Se requiere userId' }, { status: 400 });
    }

    // Verificar que el usuario está inscrito en la visión como participante PL
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        vision_id: visionId,
        user_id: userId,
        level: 'PL'
      }
    });

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'El usuario no está inscrito como participante PL en esta visión' 
      }, { status: 400 });
    }

    // Actualizar la visión con el nuevo capitán
    const updatedVision = await prisma.vision.findUnique({
      where: { id: visionId }
    });

    if (!updatedVision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    await prisma.vision.update({
      where: { id: visionId },
      data: { plCaptainUserId: userId }
    });

    // Obtener datos del usuario asignado
    const captain = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Capitán PL asignado exitosamente',
      plCaptain: captain
    });
  } catch (error) {
    logger.error('Error al asignar capitán PL:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Remover el capitán PL de una visión
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.role || !ALLOWED_ROLES.includes(session.user.role)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const visionId = parseInt(params.id);
    if (isNaN(visionId)) {
      return NextResponse.json({ error: 'ID de visión inválido' }, { status: 400 });
    }

    await prisma.vision.update({
      where: { id: visionId },
      data: { plCaptainUserId: null }
    });

    return NextResponse.json({
      success: true,
      message: 'Capitán PL removido exitosamente'
    });
  } catch (error) {
    logger.error('Error al remover capitán PL:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
