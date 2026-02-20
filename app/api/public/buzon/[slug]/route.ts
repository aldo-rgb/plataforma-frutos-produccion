// API pública para el buzón - accesible sin autenticación
// Ruta: /buzon/[slug]

import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener información del buzón y buscar participantes
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const searchQuery = searchParams.get('search');

    // Buscar campaña activa por slug
    const campaign = await prisma.timeCapsuleCampaign.findFirst({
      where: { 
        slug,
        isActive: true,
        closeDate: { gte: new Date() } // Aún no ha cerrado
      },
      include: {
        Vision: { 
          select: { 
            id: true, 
            nombre: true,
            organizationId: true 
          } 
        },
        Organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json({ 
        error: 'Buzón no encontrado o cerrado',
        closed: true
      }, { status: 404 });
    }

    // Buscar participantes - con filtro de búsqueda o todos
    let participants: any[] = [];
    
    // Buscar en vision_enrollments (tabla actual)
    const visionEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: campaign.visionId,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
        ...(searchQuery && searchQuery.length >= 2 ? {
          Usuario_vision_enrollments_userIdToUsuario: {
            nombre: { contains: searchQuery, mode: 'insensitive' }
          }
        } : {})
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      },
      orderBy: {
        Usuario_vision_enrollments_userIdToUsuario: {
          nombre: 'asc'
        }
      },
      take: 100
    });

    // Eliminar duplicados por userId
    const uniqueParticipants = new Map();
    visionEnrollments.forEach(ve => {
      const user = ve.Usuario_vision_enrollments_userIdToUsuario;
      if (!uniqueParticipants.has(user.id)) {
        uniqueParticipants.set(user.id, {
          id: user.id,
          nombre: user.nombre,
          imagen: user.imagen
        });
      }
    });
    
    participants = Array.from(uniqueParticipants.values());

    return NextResponse.json({
      campaign: {
        id: campaign.id,
        name: campaign.name,
        description: campaign.description,
        closeDate: campaign.closeDate,
        vision: campaign.Vision,
        organization: campaign.Organization
      },
      participants,
      daysRemaining: Math.ceil((new Date(campaign.closeDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    });
  } catch (error) {
    console.error('Error fetching public mailbox:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST - Enviar mensaje a la cápsula (público, con reCaptcha)
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const {
      recipientId,
      senderName,
      senderRelation,
      senderEmail,
      textContent,
      audioUrl,
      audioDuration,
      recaptchaToken
    } = body;

    // TODO: Validar reCaptcha token
    // const isValidCaptcha = await verifyRecaptcha(recaptchaToken);
    // if (!isValidCaptcha) {
    //   return NextResponse.json({ error: 'Verificación fallida' }, { status: 400 });
    // }

    // Buscar campaña activa
    const campaign = await prisma.timeCapsuleCampaign.findFirst({
      where: { 
        slug,
        isActive: true,
        closeDate: { gte: new Date() }
      }
    });

    if (!campaign) {
      return NextResponse.json({ 
        error: 'El buzón está cerrado. Ya no se pueden enviar mensajes.',
        closed: true 
      }, { status: 400 });
    }

    // Validar que el destinatario es participante de la visión (buscar en vision_enrollments)
    const isParticipant = await prisma.vision_enrollments.findFirst({
      where: {
        visionId: campaign.visionId,
        userId: recipientId,
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] }
      }
    });

    if (!isParticipant) {
      return NextResponse.json({ error: 'Destinatario no válido' }, { status: 400 });
    }

    // Validar contenido
    if (!textContent && !audioUrl) {
      return NextResponse.json({ error: 'Debes enviar un mensaje o un audio' }, { status: 400 });
    }

    // Determinar tipo de mensaje
    let messageType: 'TEXT' | 'AUDIO' | 'BOTH' = 'TEXT';
    if (textContent && audioUrl) {
      messageType = 'BOTH';
    } else if (audioUrl) {
      messageType = 'AUDIO';
    }

    // Crear mensaje
    const message = await prisma.capsuleMessage.create({
      data: {
        campaignId: campaign.id,
        recipientId,
        senderName,
        senderRelation,
        senderEmail: senderEmail || null,
        messageType,
        textContent: textContent || null,
        audioUrl: audioUrl || null,
        audioDuration: audioDuration || null,
        isUnlocked: false // Se desbloqueará cuando el coordinador libere las cápsulas
      }
    });

    // Obtener destinatario para el mensaje de confirmación
    const recipient = await prisma.usuario.findUnique({
      where: { id: recipientId },
      select: { nombre: true }
    });

    return NextResponse.json({
      success: true,
      message: `Tu mensaje para ${recipient?.nombre} ha sido encriptado y se entregará el ${campaign.closeDate.toLocaleDateString('es-MX', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      })}.`,
      messageId: message.id
    });
  } catch (error) {
    console.error('Error creating capsule message:', error);
    return NextResponse.json({ error: 'Error al enviar mensaje' }, { status: 500 });
  }
}
