// API para que el participante lea sus cápsulas desbloqueadas

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener mis cápsulas desbloqueadas
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Obtener todas las cápsulas desbloqueadas para este usuario
    const messages = await prisma.capsuleMessage.findMany({
      where: {
        recipientId: userId,
        isUnlocked: true
      },
      include: {
        Campaign: {
          select: {
            id: true,
            name: true,
            releaseDate: true,
            Vision: { select: { id: true, nombre: true } }
          }
        },
        SenderUser: {
          select: { id: true, nombre: true, imagen: true }
        }
      },
      orderBy: [
        { isFavorite: 'desc' },
        { createdAt: 'desc' }
      ]
    });

    // Agrupar por campaña
    const messagesByCampaign = messages.reduce((acc, msg) => {
      const campaignId = msg.Campaign.id;
      if (!acc[campaignId]) {
        acc[campaignId] = {
          campaign: msg.Campaign,
          messages: [],
          stats: { total: 0, unread: 0, favorites: 0, audio: 0, text: 0 }
        };
      }
      acc[campaignId].messages.push({
        id: msg.id,
        senderName: msg.senderName,
        senderRelation: msg.senderRelation,
        senderUser: msg.SenderUser,
        messageType: msg.messageType,
        textContent: msg.textContent,
        audioUrl: msg.audioUrl,
        audioDuration: msg.audioDuration,
        isFavorite: msg.isFavorite,
        isRead: msg.isRead,
        createdAt: msg.createdAt
      });
      acc[campaignId].stats.total++;
      if (!msg.isRead) acc[campaignId].stats.unread++;
      if (msg.isFavorite) acc[campaignId].stats.favorites++;
      if (msg.messageType === 'AUDIO' || msg.messageType === 'BOTH') acc[campaignId].stats.audio++;
      if (msg.messageType === 'TEXT' || msg.messageType === 'BOTH') acc[campaignId].stats.text++;
      return acc;
    }, {} as Record<number, any>);

    return NextResponse.json({
      capsules: Object.values(messagesByCampaign),
      totalMessages: messages.length,
      hasUnread: messages.some(m => !m.isRead)
    });
  } catch (error) {
    console.error('Error fetching my capsules:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Marcar como leído o favorito
export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    const { messageId, action } = body;

    // Verificar que el mensaje pertenece al usuario
    const message = await prisma.capsuleMessage.findFirst({
      where: {
        id: messageId,
        recipientId: userId,
        isUnlocked: true
      }
    });

    if (!message) {
      return NextResponse.json({ error: 'Mensaje no encontrado' }, { status: 404 });
    }

    let updateData: any = {};

    switch (action) {
      case 'READ':
        updateData = { isRead: true };
        break;
      case 'FAVORITE':
        updateData = { isFavorite: true };
        break;
      case 'UNFAVORITE':
        updateData = { isFavorite: false };
        break;
      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

    const updated = await prisma.capsuleMessage.update({
      where: { id: messageId },
      data: updateData
    });

    return NextResponse.json({ 
      success: true, 
      message: updated 
    });
  } catch (error) {
    console.error('Error updating capsule message:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
