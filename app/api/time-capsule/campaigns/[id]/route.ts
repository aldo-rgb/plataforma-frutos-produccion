// API para gestionar una campaña específica
// Solo COORDINADOR y SCHOOL_ADMIN

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const ALLOWED_ROLES = ['COORDINADOR', 'SCHOOL_ADMIN', 'ADMIN'];

// GET - Obtener detalles de una campaña
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const campaign = await prisma.timeCapsuleCampaign.findFirst({
      where: { 
        id: parseInt(id),
        organizationId: user.organizationId!
      },
      include: {
        Vision: { 
          select: { 
            id: true, 
            nombre: true,
            plWeekend3StartDate: true,
            plWeekend3EndDate: true
          } 
        },
        ReleasedBy: { select: { id: true, nombre: true } },
        Messages: {
          include: {
            Recipient: { select: { id: true, nombre: true, imagen: true } },
            SenderUser: { select: { id: true, nombre: true } }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: { 
          select: { 
            Messages: true 
          } 
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // Estadísticas adicionales
    const stats = {
      totalMessages: campaign._count.Messages,
      textMessages: campaign.Messages.filter(m => m.messageType === 'TEXT' || m.messageType === 'BOTH').length,
      audioMessages: campaign.Messages.filter(m => m.messageType === 'AUDIO' || m.messageType === 'BOTH').length,
      uniqueRecipients: new Set(campaign.Messages.map(m => m.recipientId)).size,
      uniqueSenders: new Set(campaign.Messages.map(m => m.senderUserId || m.senderName)).size
    };

    return NextResponse.json({ campaign, stats });
  } catch (error) {
    console.error('Error fetching campaign:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// PATCH - Actualizar campaña o LIBERAR CÁPSULAS
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { action, ...updateData } = body;

    // Verificar que la campaña pertenece a la organización
    const existingCampaign = await prisma.timeCapsuleCampaign.findFirst({
      where: { 
        id: parseInt(id),
        organizationId: user.organizationId!
      }
    });

    if (!existingCampaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    // ACCIÓN ESPECIAL: LIBERAR CÁPSULAS
    if (action === 'RELEASE') {
      const updated = await prisma.$transaction(async (tx) => {
        // Marcar campaña como liberada
        const campaign = await tx.timeCapsuleCampaign.update({
          where: { id: parseInt(id) },
          data: {
            isReleased: true,
            releaseDate: new Date(),
            releasedById: userId,
            isActive: false // Ya no acepta más mensajes
          }
        });

        // Desbloquear todos los mensajes
        await tx.capsuleMessage.updateMany({
          where: { campaignId: parseInt(id) },
          data: { isUnlocked: true }
        });

        // Crear notificaciones para todos los destinatarios
        const messages = await tx.capsuleMessage.findMany({
          where: { campaignId: parseInt(id) },
          select: { recipientId: true }
        });

        const uniqueRecipients = [...new Set(messages.map(m => m.recipientId))];

        await tx.notification.createMany({
          data: uniqueRecipients.map(recipientId => ({
            usuarioId: recipientId,
            tipo: 'SISTEMA',
            titulo: '🎁 Tu Buzón Cuántico está abierto',
            mensaje: 'Tienes mensajes especiales esperándote. ¡Ábrelos ahora!',
            isRead: false,
            prioridad: 'ALTA',
            fechaExpiracion: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 días
          }))
        });

        return campaign;
      });

      return NextResponse.json({ 
        campaign: updated, 
        message: '¡Cápsulas liberadas exitosamente! Los participantes han sido notificados.' 
      });
    }

    // Actualización normal
    const campaign = await prisma.timeCapsuleCampaign.update({
      where: { id: parseInt(id) },
      data: {
        ...(updateData.name && { name: updateData.name }),
        ...(updateData.description && { description: updateData.description }),
        ...(updateData.closeDate && { closeDate: new Date(updateData.closeDate) }),
        ...(updateData.isActive !== undefined && { isActive: updateData.isActive }),
        ...(updateData.notifyDaysBefore && { notifyDaysBefore: updateData.notifyDaysBefore }),
        ...(updateData.pointsPerMessage && { pointsPerMessage: updateData.pointsPerMessage })
      }
    });

    return NextResponse.json({ campaign });
  } catch (error) {
    console.error('Error updating campaign:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// DELETE - Eliminar campaña (solo si no ha sido liberada)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true, organizationId: true }
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const campaign = await prisma.timeCapsuleCampaign.findFirst({
      where: { 
        id: parseInt(id),
        organizationId: user.organizationId!
      }
    });

    if (!campaign) {
      return NextResponse.json({ error: 'Campaña no encontrada' }, { status: 404 });
    }

    if (campaign.isReleased) {
      return NextResponse.json({ 
        error: 'No se puede eliminar una campaña que ya fue liberada' 
      }, { status: 400 });
    }

    await prisma.timeCapsuleCampaign.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: 'Campaña eliminada' });
  } catch (error) {
    console.error('Error deleting campaign:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
