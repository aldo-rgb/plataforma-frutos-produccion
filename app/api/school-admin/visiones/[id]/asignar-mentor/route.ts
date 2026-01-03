import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const visionId = parseInt(params.id);
    const { mentorId } = await request.json();

    if (!mentorId) {
      return NextResponse.json(
        { error: 'Se requiere mentorId' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe y pertenece a la organización del admin
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { 
        organizationId: true,
        startDate: true,
        endDate: true,
      },
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    if (vision.organizationId !== (session.user as any).organizationId) {
      return NextResponse.json(
        { error: 'No tienes permiso para modificar esta visión' },
        { status: 403 }
      );
    }

    // Verificar que el mentor es un LIDER de la misma organización
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: {
        id: true,
        rol: true,
        organizationId: true,
        nombre: true,
      },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor no encontrado' },
        { status: 404 }
      );
    }

    if (mentor.rol !== 'LIDER') {
      return NextResponse.json(
        { error: 'El usuario debe tener rol LIDER' },
        { status: 400 }
      );
    }

    if (mentor.organizationId !== (session.user as any).organizationId) {
      return NextResponse.json(
        { error: 'El mentor debe pertenecer a tu organización' },
        { status: 400 }
      );
    }

    // Verificar si ya está asignado
    const yaAsignado = await prisma.visionMentor.findFirst({
      where: {
        visionId: visionId,
        mentorId: mentorId,
      },
    });

    if (yaAsignado) {
      return NextResponse.json(
        { error: 'Este mentor ya está asignado a la visión' },
        { status: 400 }
      );
    }

    // Asignar el mentor a la visión
    await prisma.visionMentor.create({
      data: {
        visionId: visionId,
        mentorId: mentorId,
        asignadoPorId: session.user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${mentor.nombre} ha sido asignado como mentor privado`,
    });
  } catch (error) {
    console.error('Error al asignar mentor:', error);
    return NextResponse.json(
      { error: 'Error al asignar mentor' },
      { status: 500 }
    );
  }
}
