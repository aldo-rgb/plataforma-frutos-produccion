import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';


export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
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

    // Obtener notificaciones no leídas
    const notifications = await prisma.notification.findMany({
      where: {
        userId: usuario.id,
        isRead: false
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10 // Limitar a las últimas 10
    });

    return NextResponse.json({
      success: true,
      notifications
    });

  } catch (error) {
    logger.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificaciones' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
