import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/chat/clear
 * Limpia toda la conversación del usuario con el Mentor IA
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Buscar usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Eliminar todos los mensajes del chat del usuario
    await prisma.mensajeChat.deleteMany({
      where: { usuarioId: usuario.id }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Conversación limpiada exitosamente' 
    });

  } catch (error: any) {
    logger.error('Error limpiando conversación:', error);
    return NextResponse.json(
      { error: 'Error al limpiar conversación', details: error.message },
      { status: 500 }
    );
  }
}
