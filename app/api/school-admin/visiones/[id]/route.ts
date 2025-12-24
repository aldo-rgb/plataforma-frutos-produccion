import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
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

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener la visión con participantes
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        _count: {
          select: {
            Participantes: true,
          },
        },
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
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

    // Obtener participantes de la visión
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Participante: {
          select: {
            id: true,
            nombre: true,
            email: true,
            tier: true,
            licenseCode: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      vision,
      participantes,
    });
  } catch (error) {
    console.error('Error fetching vision details:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener detalles de la visión' },
      { status: 500 }
    );
  }
}
