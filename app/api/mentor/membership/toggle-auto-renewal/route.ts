import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/mentor/membership/toggle-auto-renewal
 * Activa/desactiva la renovación automática
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { enabled } = await req.json();
    const userId = Number(session.user.id);

    // Buscar perfil de mentor
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: userId }
    });

    if (!perfilMentor) {
      return NextResponse.json(
        { error: 'No tienes un perfil de mentor' },
        { status: 404 }
      );
    }

    // Actualizar configuración
    await prisma.perfilMentor.update({
      where: { id: perfilMentor.id },
      data: {
        autoRenewalEnabled: enabled
      }
    });

    return NextResponse.json({
      success: true,
      autoRenewalEnabled: enabled
    });

  } catch (error) {
    logger.error('Error toggling auto-renewal:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
