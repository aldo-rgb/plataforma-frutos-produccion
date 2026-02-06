import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/notificaciones/[id]/read
 * Marca una notificación como leída
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const notificacionId = parseInt(params.id);

    // Verificar que la notificación pertenece al usuario
    const notificacion = await prisma.notificacion.findFirst({
      where: {
        id: notificacionId,
        usuarioId: usuario.id
      }
    });

    if (!notificacion) {
      return NextResponse.json({ error: 'Notificación no encontrada' }, { status: 404 });
    }

    // Marcar como leída
    await prisma.notificacion.update({
      where: { id: notificacionId },
      data: { leida: true }
    });

    return NextResponse.json({ success: true });

  } catch (error: any) {
    logger.error('Error marcando notificación:', error);
    return NextResponse.json(
      { error: 'Error al marcar notificación', details: error.message },
      { status: 500 }
    );
  }
}
