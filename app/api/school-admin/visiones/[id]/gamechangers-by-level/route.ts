import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Obtener Game Changers filtrados por nivel
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const visionId = parseInt(resolvedParams.id);
    const { searchParams } = new URL(request.url);
    const level = searchParams.get('level'); // BASIC, ADVANCED, PL

    // Verificar permisos
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true, organizationId: true }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Construir el where clause
    const whereClause: any = {
      visionId: visionId
    };

    // Si se especifica un nivel, filtrar por él
    if (level && ['BASIC', 'ADVANCED', 'PL'].includes(level)) {
      whereClause.level = level;
    }

    const gameChangers = await prisma.visionGameChanger.findMany({
      where: whereClause,
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true,
            telefono: true,
            organizationId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    const formatted = gameChangers.map(gc => ({
      id: gc.id,
      visionId: gc.visionId,
      gameChangerId: gc.gameChangerId,
      level: gc.level,
      assignedAt: gc.createdAt,
      usuario: gc.Usuario_VisionGameChanger_gameChangerIdToUsuario
    }));

    return NextResponse.json(formatted);
  } catch (error) {
    logger.error('Error fetching game changers by level:', error);
    return NextResponse.json(
      { error: 'Error al obtener game changers' },
      { status: 500 }
    );
  }
}
