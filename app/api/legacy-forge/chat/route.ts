import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener mensajes del chat de una votación
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const pollId = searchParams.get('pollId');
    const cursor = searchParams.get('cursor'); // Para paginación
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!pollId) {
      return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
    }

    // Verificar que la votación existe
    const poll = await prisma.tribePoll.findUnique({
      where: { id: parseInt(pollId) },
      select: { id: true, visionId: true, status: true }
    });

    if (!poll) {
      return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
    }

    // Verificar que el usuario pertenece a la tribu
    const hasSigned = await prisma.tribeOath.findFirst({
      where: {
        visionId: poll.visionId,
        userId: userId
      }
    });

    if (!hasSigned) {
      return NextResponse.json(
        { error: 'Debes firmar el juramento de la tribu para ver el chat' }, 
        { status: 403 }
      );
    }

    // Obtener mensajes
    const messages = await prisma.tribePollChat.findMany({
      where: {
        pollId: parseInt(pollId),
        isDeleted: false,
        ...(cursor ? { id: { lt: parseInt(cursor) } } : {})
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    // Revertir para mostrar en orden cronológico
    const sortedMessages = messages.reverse();

    // Verificar si hay más mensajes
    const hasMore = messages.length === limit;
    const nextCursor = hasMore ? messages[0]?.id : null;

    return NextResponse.json({
      messages: sortedMessages,
      hasMore,
      nextCursor,
      pollStatus: poll.status
    });

  } catch (error) {
    console.error('Error obteniendo chat:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Enviar mensaje al chat
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { pollId, message, replyToId } = body;

    if (!pollId || !message?.trim()) {
      return NextResponse.json({ error: 'pollId y message requeridos' }, { status: 400 });
    }

    // Verificar que la votación existe y está activa
    const poll = await prisma.tribePoll.findUnique({
      where: { id: parseInt(pollId) },
      select: { id: true, visionId: true, status: true }
    });

    if (!poll) {
      return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
    }

    // Solo permitir chat mientras la votación está activa
    if (poll.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'El chat solo está disponible mientras la votación está activa' }, 
        { status: 400 }
      );
    }

    // Verificar que el usuario pertenece a la tribu
    const hasSigned = await prisma.tribeOath.findFirst({
      where: {
        visionId: poll.visionId,
        userId: userId
      }
    });

    if (!hasSigned) {
      return NextResponse.json(
        { error: 'Debes firmar el juramento de la tribu para participar en el chat' }, 
        { status: 403 }
      );
    }

    // Validar replyToId si se proporciona
    if (replyToId) {
      const replyMessage = await prisma.tribePollChat.findFirst({
        where: {
          id: parseInt(replyToId),
          pollId: parseInt(pollId),
          isDeleted: false
        }
      });

      if (!replyMessage) {
        return NextResponse.json({ error: 'Mensaje a responder no encontrado' }, { status: 400 });
      }
    }

    // Crear el mensaje
    const chatMessage = await prisma.tribePollChat.create({
      data: {
        pollId: parseInt(pollId),
        userId: userId,
        message: message.trim().substring(0, 1000), // Limitar a 1000 caracteres
        messageType: 'TEXT',
        replyToId: replyToId ? parseInt(replyToId) : null
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        },
        replyTo: {
          include: {
            user: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: chatMessage
    });

  } catch (error) {
    console.error('Error enviando mensaje:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar mensaje (solo el autor o staff)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const messageId = searchParams.get('messageId');

    if (!messageId) {
      return NextResponse.json({ error: 'messageId requerido' }, { status: 400 });
    }

    // Obtener el mensaje
    const message = await prisma.tribePollChat.findUnique({
      where: { id: parseInt(messageId) },
      include: {
        poll: {
          select: { visionId: true }
        }
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    // Verificar permisos (autor o staff)
    const isAuthor = message.userId === userId;
    const isStaff = await prisma.visionStaff.findFirst({
      where: {
        userId: userId,
        visionId: message.poll.visionId
      }
    });

    if (!isAuthor && !isStaff) {
      return NextResponse.json(
        { error: 'No tienes permiso para eliminar este mensaje' }, 
        { status: 403 }
      );
    }

    // Soft delete
    await prisma.tribePollChat.update({
      where: { id: parseInt(messageId) },
      data: { isDeleted: true }
    });

    return NextResponse.json({
      success: true,
      message: 'Mensaje eliminado'
    });

  } catch (error) {
    console.error('Error eliminando mensaje:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
