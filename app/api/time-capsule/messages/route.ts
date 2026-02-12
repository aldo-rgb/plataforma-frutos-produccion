// API para enviar mensajes desde usuarios autenticados (GameChangers, Mentores, etc.)
// Incluye gamificación con puntos

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener mensajes pendientes que el usuario debe enviar (su linaje)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Buscar campañas activas donde el usuario tiene ahijados/linaje
    const activeCampaigns = await prisma.timeCapsuleCampaign.findMany({
      where: {
        isActive: true,
        closeDate: { gte: new Date() }
      },
      include: {
        Vision: { select: { id: true, nombre: true } },
        Organization: { select: { id: true, name: true } }
      }
    });

    // Para cada campaña, buscar ahijados del usuario que están en esa visión
    const pendingMessages = [];

    for (const campaign of activeCampaigns) {
      // Buscar participantes que el usuario enroló (nivel 1, 2, 3)
      // Nivel 1: invitedBy directo
      const level1 = await prisma.usuario.findMany({
        where: {
          invitedBy: userId,
          VisionParticipante_VisionParticipante_participanteIdToUsuario: {
            some: { visionId: campaign.visionId }
          }
        },
        select: { id: true, nombre: true, imagen: true }
      });

      // Nivel 2: invitados de los invitados
      const level1Ids = level1.map(u => u.id);
      const level2 = level1Ids.length > 0 ? await prisma.usuario.findMany({
        where: {
          invitedBy: { in: level1Ids },
          VisionParticipante_VisionParticipante_participanteIdToUsuario: {
            some: { visionId: campaign.visionId }
          }
        },
        select: { id: true, nombre: true, imagen: true }
      }) : [];

      // Nivel 3: invitados de nivel 2
      const level2Ids = level2.map(u => u.id);
      const level3 = level2Ids.length > 0 ? await prisma.usuario.findMany({
        where: {
          invitedBy: { in: level2Ids },
          VisionParticipante_VisionParticipante_participanteIdToUsuario: {
            some: { visionId: campaign.visionId }
          }
        },
        select: { id: true, nombre: true, imagen: true }
      }) : [];

      // Combinar todos los ahijados
      const allLineage = [
        ...level1.map(u => ({ ...u, level: 1 })),
        ...level2.map(u => ({ ...u, level: 2 })),
        ...level3.map(u => ({ ...u, level: 3 }))
      ];

      if (allLineage.length === 0) continue;

      // Verificar cuáles ya tienen mensaje de este usuario
      const sentMessages = await prisma.capsuleMessage.findMany({
        where: {
          campaignId: campaign.id,
          senderUserId: userId,
          recipientId: { in: allLineage.map(u => u.id) }
        },
        select: { recipientId: true }
      });

      const sentToIds = new Set(sentMessages.map(m => m.recipientId));

      // Filtrar los que faltan
      const pending = allLineage.filter(u => !sentToIds.has(u.id));
      const completed = allLineage.filter(u => sentToIds.has(u.id));

      if (pending.length > 0 || completed.length > 0) {
        pendingMessages.push({
          campaign: {
            id: campaign.id,
            name: campaign.name,
            closeDate: campaign.closeDate,
            pointsPerMessage: campaign.pointsPerMessage,
            vision: campaign.Vision,
            organization: campaign.Organization
          },
          pending,
          completed,
          totalLineage: allLineage.length,
          daysRemaining: Math.ceil((new Date(campaign.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
        });
      }
    }

    return NextResponse.json({ pendingMessages });
  } catch (error) {
    console.error('Error fetching pending messages:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Enviar mensaje como usuario autenticado (con gamificación)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, rol: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await request.json();
    const {
      campaignId,
      recipientId,
      senderRelation,
      textContent,
      audioUrl,
      audioDuration
    } = body;

    // Buscar campaña activa
    const campaign = await prisma.timeCapsuleCampaign.findFirst({
      where: { 
        id: campaignId,
        isActive: true,
        closeDate: { gte: new Date() }
      }
    });

    if (!campaign) {
      return NextResponse.json({ 
        error: 'El buzón está cerrado',
        closed: true 
      }, { status: 400 });
    }

    // Validar contenido
    if (!textContent && !audioUrl) {
      return NextResponse.json({ error: 'Debes enviar un mensaje o un audio' }, { status: 400 });
    }

    // Verificar si ya envió mensaje a este destinatario
    const existingMessage = await prisma.capsuleMessage.findFirst({
      where: {
        campaignId,
        senderUserId: userId,
        recipientId
      }
    });

    if (existingMessage) {
      return NextResponse.json({ 
        error: 'Ya enviaste un mensaje a este participante' 
      }, { status: 400 });
    }

    // Determinar tipo de mensaje
    let messageType: 'TEXT' | 'AUDIO' | 'BOTH' = 'TEXT';
    if (textContent && audioUrl) {
      messageType = 'BOTH';
    } else if (audioUrl) {
      messageType = 'AUDIO';
    }

    // Crear mensaje y dar puntos en una transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear mensaje
      const message = await tx.capsuleMessage.create({
        data: {
          campaignId,
          recipientId,
          senderName: user.nombre,
          senderRelation: senderRelation || 'Líder',
          senderUserId: userId,
          messageType,
          textContent: textContent || null,
          audioUrl: audioUrl || null,
          audioDuration: audioDuration || null,
          isUnlocked: false,
          pointsAwarded: true // Marca que se dieron puntos
        }
      });

      // Dar puntos de gamificación
      await tx.usuario.update({
        where: { id: userId },
        data: {
          puntosGamificacion: { increment: campaign.pointsPerMessage },
          experienciaXP: { increment: Math.floor(campaign.pointsPerMessage / 2) }
        }
      });

      return message;
    });

    // Obtener destinatario
    const recipient = await prisma.usuario.findUnique({
      where: { id: recipientId },
      select: { nombre: true }
    });

    return NextResponse.json({
      success: true,
      message: `Tu mensaje para ${recipient?.nombre} ha sido enviado. ¡Ganaste ${campaign.pointsPerMessage} puntos!`,
      messageId: result.id,
      pointsEarned: campaign.pointsPerMessage
    });
  } catch (error) {
    console.error('Error creating authenticated capsule message:', error);
    return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
  }
}
