import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const notificationId = parseInt(id);

    if (isNaN(notificationId)) {
      return NextResponse.json(
        { error: 'ID de notificación inválido' },
        { status: 400 }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que la notificación pertenece al usuario
    const notification = await prisma.notification.findFirst({
      where: {
        id: notificationId,
        userId: usuario.id
      }
    });

    if (!notification) {
      return NextResponse.json(
        { error: 'Notificación no encontrada' },
        { status: 404 }
      );
    }

    // Marcar como leída
    await prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Notificación marcada como leída'
    });

  } catch (error) {
    logger.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Error al marcar notificación como leída' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
