import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/social/react
 * Sistema de reacciones (🔥💪🧠👏)
 * 
 * Body: { evidenceId: number, type: 'FIRE' | 'STRONG' | 'GENIUS' | 'APPLAUSE' }
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { evidenceId, type } = await req.json();

    if (!evidenceId || !type) {
      return NextResponse.json({ error: 'Datos inválidos' }, { status: 400 });
    }

    const validTypes = ['FIRE', 'STRONG', 'GENIUS', 'APPLAUSE'];
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: 'Tipo de reacción inválido' }, { status: 400 });
    }

    // Verificar que la evidencia existe y es pública
    const evidence = await prisma.evidenciaAccion.findUnique({
      where: { id: evidenceId },
      include: {
        Usuario: {
          select: { socialVisibility: true }
        }
      }
    });

    if (!evidence) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    }

    if (evidence.Usuario.socialVisibility === 'PRIVATE') {
      return NextResponse.json({ error: 'No puedes reaccionar a contenido privado' }, { status: 403 });
    }

    // Buscar reacción existente del usuario
    const existingReaction = await prisma.socialReaction.findUnique({
      where: {
        usuarioId_evidenceId: {
          usuarioId: session.user.id,
          evidenceId: evidenceId
        }
      }
    });

    let result;

    if (existingReaction) {
      // Si ya reaccionó con el mismo tipo, eliminar reacción (toggle)
      if (existingReaction.type === type) {
        await prisma.socialReaction.delete({
          where: { id: existingReaction.id }
        });
        
        return NextResponse.json({
          success: true,
          action: 'removed',
          message: 'Reacción eliminada'
        });
      } else {
        // Si reaccionó con otro tipo, actualizar
        result = await prisma.socialReaction.update({
          where: { id: existingReaction.id },
          data: { type }
        });

        return NextResponse.json({
          success: true,
          action: 'updated',
          reaction: result,
          message: 'Reacción actualizada'
        });
      }
    } else {
      // Crear nueva reacción
      result = await prisma.socialReaction.create({
        data: {
          usuarioId: session.user.id,
          evidenceId: evidenceId,
          type: type
        }
      });

      return NextResponse.json({
        success: true,
        action: 'created',
        reaction: result,
        message: 'Reacción agregada'
      });
    }

  } catch (error: any) {
    logger.error('Error handling reaction:', error);
    return NextResponse.json(
      { error: 'Error al procesar reacción', details: error.message },
      { status: 500 }
    );
  }
}
