import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener notificaciones del usuario
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener notificaciones no leídas
    const notifications = await prisma.notification.findMany({
      where: {
        userId: session.user.id,
        isRead: false,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 10, // Últimas 10 notificaciones
    });

    const unreadCount = notifications.length;

    return NextResponse.json({
      success: true,
      notifications,
      unreadCount,
    });
  } catch (error) {
    logger.error('Error al obtener notificaciones:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}

// POST - Marcar notificación como leída
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const { notificationId, markAllAsRead } = await request.json();

    if (markAllAsRead) {
      // Marcar todas como leídas
      await prisma.notification.updateMany({
        where: {
          userId: session.user.id,
          isRead: false,
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Todas las notificaciones marcadas como leídas',
      });
    } else if (notificationId) {
      // Marcar una específica como leída
      await prisma.notification.update({
        where: {
          id: notificationId,
          userId: session.user.id, // Seguridad: solo sus notificaciones
        },
        data: {
          isRead: true,
        },
      });

      return NextResponse.json({
        success: true,
        message: 'Notificación marcada como leída',
      });
    } else {
      return NextResponse.json({ success: false, error: 'Parámetros inválidos' }, { status: 400 });
    }
  } catch (error) {
    logger.error('Error al marcar notificación:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
