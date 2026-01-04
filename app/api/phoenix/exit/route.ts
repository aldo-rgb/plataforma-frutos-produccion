import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, message: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);

    // Buscar la sesión activa del Protocolo Fénix
    const activeSession = await prisma.phoenixSession.findFirst({
      where: {
        usuarioId: userId,
        exitedAt: null
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!activeSession) {
      return NextResponse.json(
        { success: false, message: 'No hay sesión activa de Protocolo Fénix' },
        { status: 404 }
      );
    }

    // Marcar la sesión como salida
    await prisma.phoenixSession.update({
      where: { id: activeSession.id },
      data: {
        exitedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Protocolo Fénix desactivado correctamente',
      sessionId: activeSession.id
    });

  } catch (error) {
    console.error('Error al salir del Protocolo Fénix:', error);
    return NextResponse.json(
      { success: false, message: 'Error al desactivar Protocolo Fénix' },
      { status: 500 }
    );
  }
}
