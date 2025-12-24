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
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const visionId = parseInt(params.id);
    const { participanteRelationId } = await request.json();

    if (isNaN(visionId) || !participanteRelationId) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId || vision.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Eliminar la relación
    await prisma.visionParticipante.delete({
      where: { id: participanteRelationId },
    });

    return NextResponse.json({
      success: true,
      message: 'Participante eliminado de la visión',
    });
  } catch (error) {
    console.error('Error removing participante from vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar participante' },
      { status: 500 }
    );
  }
}
