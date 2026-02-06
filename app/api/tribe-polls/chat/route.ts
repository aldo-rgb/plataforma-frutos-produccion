import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Chat de debate para votaciones de tribu
// Permite discusión antes y durante la votación

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const pollId = searchParams.get('pollId');
    const userId = searchParams.get('userId');
    const cursor = searchParams.get('cursor'); // Para paginación
    const limit = parseInt(searchParams.get('limit') || '50');

    if (!pollId) {
      return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
    }

    // Verificar que la encuesta existe
    const poll = await prisma.tribePoll.findUnique({
      where: { id: parseInt(pollId) },
      include: {
        vision: true
      }
    });

    if (!poll) {
      return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 });
    }

    // Obtener mensajes del chat
    const messages = await prisma.tribePollChat.findMany({
      where: { pollId: parseInt(pollId) },
      take: limit + 1, // +1 para saber si hay más
      ...(cursor && {
        cursor: { id: parseInt(cursor) },
        skip: 1
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            photoUrl: true
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
        },
        reactions: {
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

    // Verificar si hay más mensajes
    const hasMore = messages.length > limit;
    const messageList = hasMore ? messages.slice(0, -1) : messages;

    // Obtener estadísticas del chat
    const stats = await prisma.tribePollChat.aggregate({
      where: { pollId: parseInt(pollId) },
      _count: true
    });

    // Obtener usuarios únicos que han participado
    const participants = await prisma.tribePollChat.findMany({
      where: { pollId: parseInt(pollId) },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            photoUrl: true
          }
        }
      },
      distinct: ['userId']
    });

    // Si hay userId, verificar permisos
    let userPermissions = null;
    if (userId) {
      const user = await prisma.usuario.findUnique({
        where: { id: parseInt(userId) }
      });

      const isStaff = await prisma.visionStaff.findFirst({
        where: {
          userId: parseInt(userId),
          visionId: poll.visionId
        }
      });

      // Buscar capitanía para esta visión donde el usuario tenga asignación aceptada
      const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
        where: {
          userId: parseInt(userId),
          status: 'ACCEPTED',
          captaincy: {
            visionId: poll.visionId
          }
        }
      });

      userPermissions = {
        canPost: true, // Todos los miembros pueden postear
        canDelete: !!isStaff, // Solo staff puede eliminar
        canPin: !!captainAssignment || !!isStaff, // Capitán y staff pueden fijar
        isStaff: !!isStaff,
        isCaptain: !!captainAssignment
      };
    }

    // Obtener mensajes fijados
    const pinnedMessages = await prisma.tribePollChat.findMany({
      where: {
        pollId: parseInt(pollId),
        isPinned: true
      },
      include: {
        user: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            photoUrl: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      poll: {
        id: poll.id,
        title: poll.title,
        status: poll.status,
        category: poll.category,
        visionName: poll.vision.nombre
      },
      messages: messageList.reverse(), // Ordenar cronológicamente
      hasMore,
      nextCursor: hasMore ? messageList[messageList.length - 1]?.id : null,
      stats: {
        totalMessages: stats._count,
        participants: participants.length,
        participantList: participants.map((p: { user: { id: number; nombre: string; apellido?: string | null; photoUrl?: string | null } }) => p.user)
      },
      pinnedMessages,
      userPermissions
    });
  } catch (error) {
    logger.error('Error en GET /api/tribe-polls/chat:', error);
    return NextResponse.json(
      { error: 'Error al obtener chat', details: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, userId, pollId, ...data } = body;

    if (!userId || !pollId) {
      return NextResponse.json(
        { error: 'userId y pollId requeridos' },
        { status: 400 }
      );
    }

    // Verificar encuesta
    const poll = await prisma.tribePoll.findUnique({
      where: { id: pollId },
      include: { vision: true }
    });

    if (!poll) {
      return NextResponse.json({ error: 'Encuesta no encontrada' }, { status: 404 });
    }

    // Verificar usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar membresía en la visión
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        visionId: poll.visionId,
        enrollmentStatus: 'ENROLLED'
      }
    });

    if (!enrollment) {
      return NextResponse.json(
        { error: 'No tienes acceso a esta encuesta' },
        { status: 403 }
      );
    }

    // Verificar roles especiales
    const isStaff = await prisma.visionStaff.findFirst({
      where: { userId, visionId: poll.visionId }
    });

    const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: poll.visionId
        }
      }
    });

    const isCaptain = !!captainAssignment;

    switch (action) {
      // ============================================
      // ENVIAR MENSAJE
      // ============================================
      case 'send_message': {
        const { content, replyToId } = data;

        if (!content || content.trim().length === 0) {
          return NextResponse.json(
            { error: 'El mensaje no puede estar vacío' },
            { status: 400 }
          );
        }

        if (content.length > 2000) {
          return NextResponse.json(
            { error: 'Mensaje muy largo (máximo 2000 caracteres)' },
            { status: 400 }
          );
        }

        // Verificar si responde a otro mensaje
        if (replyToId) {
          const replyMessage = await prisma.tribePollChat.findUnique({
            where: { id: replyToId }
          });
          if (!replyMessage || replyMessage.pollId !== pollId) {
            return NextResponse.json(
              { error: 'Mensaje de respuesta no válido' },
              { status: 400 }
            );
          }
        }

        const message = await prisma.tribePollChat.create({
          data: {
            pollId,
            userId,
            content: content.trim(),
            replyToId: replyToId || null
          },
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                photoUrl: true
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
          message
        });
      }

      // ============================================
      // EDITAR MENSAJE
      // ============================================
      case 'edit_message': {
        const { messageId, content } = data;

        if (!messageId || !content) {
          return NextResponse.json(
            { error: 'messageId y content requeridos' },
            { status: 400 }
          );
        }

        const message = await prisma.tribePollChat.findUnique({
          where: { id: messageId }
        });

        if (!message) {
          return NextResponse.json(
            { error: 'Mensaje no encontrado' },
            { status: 404 }
          );
        }

        // Solo el autor puede editar (excepto staff)
        if (message.userId !== userId && !isStaff) {
          return NextResponse.json(
            { error: 'No tienes permiso para editar este mensaje' },
            { status: 403 }
          );
        }

        // No permitir editar después de 15 minutos (excepto staff)
        const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
        if (message.createdAt < fifteenMinutesAgo && !isStaff) {
          return NextResponse.json(
            { error: 'Ya no puedes editar este mensaje (límite 15 min)' },
            { status: 400 }
          );
        }

        const updated = await prisma.tribePollChat.update({
          where: { id: messageId },
          data: {
            content: content.trim(),
            isEdited: true,
            updatedAt: new Date()
          },
          include: {
            user: {
              select: {
                id: true,
                nombre: true,
                apellido: true,
                photoUrl: true
              }
            }
          }
        });

        return NextResponse.json({
          success: true,
          message: updated
        });
      }

      // ============================================
      // ELIMINAR MENSAJE
      // ============================================
      case 'delete_message': {
        const { messageId } = data;

        if (!messageId) {
          return NextResponse.json(
            { error: 'messageId requerido' },
            { status: 400 }
          );
        }

        const message = await prisma.tribePollChat.findUnique({
          where: { id: messageId }
        });

        if (!message) {
          return NextResponse.json(
            { error: 'Mensaje no encontrado' },
            { status: 404 }
          );
        }

        // Solo el autor o staff pueden eliminar
        if (message.userId !== userId && !isStaff) {
          return NextResponse.json(
            { error: 'No tienes permiso para eliminar este mensaje' },
            { status: 403 }
          );
        }

        // Soft delete - marcar como eliminado
        await prisma.tribePollChat.update({
          where: { id: messageId },
          data: {
            isDeleted: true,
            content: '[Mensaje eliminado]'
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Mensaje eliminado'
        });
      }

      // ============================================
      // FIJAR/DESFIJAR MENSAJE
      // ============================================
      case 'toggle_pin': {
        const { messageId } = data;

        if (!messageId) {
          return NextResponse.json(
            { error: 'messageId requerido' },
            { status: 400 }
          );
        }

        // Solo capitán o staff pueden fijar
        if (!isCaptain && !isStaff) {
          return NextResponse.json(
            { error: 'Solo el capitán o staff pueden fijar mensajes' },
            { status: 403 }
          );
        }

        const message = await prisma.tribePollChat.findUnique({
          where: { id: messageId }
        });

        if (!message) {
          return NextResponse.json(
            { error: 'Mensaje no encontrado' },
            { status: 404 }
          );
        }

        const updated = await prisma.tribePollChat.update({
          where: { id: messageId },
          data: {
            isPinned: !message.isPinned
          }
        });

        return NextResponse.json({
          success: true,
          isPinned: updated.isPinned,
          message: updated.isPinned ? 'Mensaje fijado' : 'Mensaje desfijado'
        });
      }

      // ============================================
      // AGREGAR REACCIÓN
      // ============================================
      case 'add_reaction': {
        const { messageId, emoji } = data;

        if (!messageId || !emoji) {
          return NextResponse.json(
            { error: 'messageId y emoji requeridos' },
            { status: 400 }
          );
        }

        // Validar emoji permitido
        const allowedEmojis = ['👍', '👎', '❤️', '🔥', '😂', '😮', '🤔', '💯', '🙏', '👏'];
        if (!allowedEmojis.includes(emoji)) {
          return NextResponse.json(
            { error: 'Emoji no permitido', allowedEmojis },
            { status: 400 }
          );
        }

        const message = await prisma.tribePollChat.findUnique({
          where: { id: messageId }
        });

        if (!message || message.pollId !== pollId) {
          return NextResponse.json(
            { error: 'Mensaje no encontrado' },
            { status: 404 }
          );
        }

        // Verificar si ya reaccionó con este emoji
        const existingReaction = await prisma.tribePollChatReaction.findFirst({
          where: {
            chatId: messageId,
            userId,
            emoji
          }
        });

        if (existingReaction) {
          // Quitar reacción
          await prisma.tribePollChatReaction.delete({
            where: { id: existingReaction.id }
          });

          return NextResponse.json({
            success: true,
            action: 'removed',
            message: 'Reacción eliminada'
          });
        } else {
          // Agregar reacción
          await prisma.tribePollChatReaction.create({
            data: {
              chatId: messageId,
              userId,
              emoji
            }
          });

          return NextResponse.json({
            success: true,
            action: 'added',
            message: 'Reacción agregada'
          });
        }
      }

      // ============================================
      // REPORTAR MENSAJE
      // ============================================
      case 'report_message': {
        const { messageId, reason } = data;

        if (!messageId) {
          return NextResponse.json(
            { error: 'messageId requerido' },
            { status: 400 }
          );
        }

        const message = await prisma.tribePollChat.findUnique({
          where: { id: messageId }
        });

        if (!message || message.pollId !== pollId) {
          return NextResponse.json(
            { error: 'Mensaje no encontrado' },
            { status: 404 }
          );
        }

        // No puedes reportar tu propio mensaje
        if (message.userId === userId) {
          return NextResponse.json(
            { error: 'No puedes reportar tu propio mensaje' },
            { status: 400 }
          );
        }

        // Verificar si ya reportó
        const existingReport = await prisma.tribePollChatReport.findFirst({
          where: {
            chatId: messageId,
            reporterId: userId
          }
        });

        if (existingReport) {
          return NextResponse.json(
            { error: 'Ya reportaste este mensaje' },
            { status: 400 }
          );
        }

        // Crear reporte
        await prisma.tribePollChatReport.create({
          data: {
            chatId: messageId,
            reporterId: userId,
            reason: reason || 'Sin razón especificada'
          }
        });

        // Contar reportes totales
        const reportCount = await prisma.tribePollChatReport.count({
          where: { chatId: messageId }
        });

        // Auto-ocultar si tiene muchos reportes
        if (reportCount >= 3) {
          await prisma.tribePollChat.update({
            where: { id: messageId },
            data: { isHidden: true }
          });
        }

        return NextResponse.json({
          success: true,
          message: 'Mensaje reportado. Gracias por ayudar a mantener la comunidad.'
        });
      }

      default:
        return NextResponse.json(
          { error: `Acción no reconocida: ${action}` },
          { status: 400 }
        );
    }
  } catch (error) {
    logger.error('Error en POST /api/tribe-polls/chat:', error);
    return NextResponse.json(
      { error: 'Error en chat', details: String(error) },
      { status: 500 }
    );
  }
}
