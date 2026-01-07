import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const participantes = await prisma.visionParticipante.findMany({
      where: {
        visionId: visionId,
      },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true,
            tier: true,
            CartaFrutos: {
              select: {
                id: true,
                estado: true,
              },
            },
          },
        },
        Usuario_VisionParticipante_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      participantes: participantes.map(p => ({
        id: p.id,
        usuario: p.Usuario_VisionParticipante_participanteIdToUsuario,
        gameChanger: p.Usuario_VisionParticipante_gameChangerIdToUsuario,
        enrolledAt: p.createdAt,
        currentLevel: 'BASIC',
      })),
    });

  } catch (error) {
    console.error('❌ Error fetching participantes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener participantes' },
      { status: 500 }
    );
  }
}
