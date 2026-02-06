import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/social/share
 * Incrementa contador de compartidos y otorga XP bonus
 * 
 * Body: { evidenceId: number }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { evidenceId } = await req.json();

    if (!evidenceId) {
      return NextResponse.json({ error: 'ID de evidencia requerido' }, { status: 400 });
    }

    // Verificar que la evidencia existe y pertenece al usuario
    const evidence = await prisma.evidenciaAccion.findUnique({
      where: { id: evidenceId },
      include: {
        Usuario: {
          select: { 
            id: true,
            socialVisibility: true 
          }
        }
      }
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    }

    // Solo el dueño puede compartir su propia evidencia
    if (evidence.usuarioId !== session.user.id) {
      return NextResponse.json({ error: 'Solo puedes compartir tus propias evidencias' }, { status: 403 });
    }

    // Verificar que no sea privada
    if (evidence.Usuario.socialVisibility === 'PRIVATE') {
      return NextResponse.json({ 
        error: 'No puedes compartir evidencias privadas', 
        hint: 'Cambia tu configuración de privacidad a COMMUNITY o PUBLIC' 
      }, { status: 403 });
    }

    // Incrementar contador y dar bonus XP
    const [updatedEvidence, updatedUser] = await prisma.$transaction([
      // Incrementar contador de shares
      prisma.evidenciaAccion.update({
        where: { id: evidenceId },
        data: {
          sharedCount: {
            increment: 1
          }
        }
      }),
      // Dar 5 XP de bonus por compartir
      prisma.usuario.update({
        where: { id: session.user.id },
        data: {
          experienciaXP: {
            increment: 5
          }
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      sharedCount: updatedEvidence.sharedCount,
      xpEarned: 5,
      message: '¡Gracias por inspirar a la comunidad! +5 XP'
    });

  } catch (error: any) {
    logger.error('Error tracking share:', error);
    return NextResponse.json(
      { error: 'Error al registrar compartido', details: error.message },
      { status: 500 }
    );
  }
}
