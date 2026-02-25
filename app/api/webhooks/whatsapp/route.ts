import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { createClient } from '@supabase/supabase-js';
import {
  normalizePhoneNumber,
  sendReceiptReceivedMessage,
  sendAskForReferenceMessage,
  sendReferenceMatchedMessage,
  sendReferenceNotFoundMessage,
  downloadWhatsAppMedia
} from '@/lib/whatsapp';

// Forzar que esta ruta sea dinámica
export const dynamic = 'force-dynamic';

// Supabase client para guardar imágenes
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

/**
 * GET /api/webhooks/whatsapp
 * 
 * Verificación del webhook de Meta (requerido para configuración inicial)
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const VERIFY_TOKEN = process.env.WHATSAPP_WEBHOOK_VERIFY_TOKEN || 'quantum-paybot-verify';

  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    logger.info('✅ [whatsapp-webhook] Webhook verified successfully');
    return new NextResponse(challenge, { status: 200 });
  }

  logger.warn('⚠️ [whatsapp-webhook] Webhook verification failed');
  return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
}

/**
 * POST /api/webhooks/whatsapp
 * 
 * Recibe mensajes entrantes de WhatsApp
 * - Detecta imágenes (comprobantes)
 * - Detecta texto (referencias manuales)
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    logger.info('📥 [whatsapp-webhook] Incoming webhook:', JSON.stringify(body, null, 2));

    // Meta envía eventos en este formato
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    
    if (!value?.messages) {
      // Es una notificación de status u otro tipo, ignorar
      return NextResponse.json({ status: 'ok' });
    }

    const message = value.messages[0];
    const contact = value.contacts?.[0];
    const senderPhone = message.from; // Número del remitente
    const senderName = contact?.profile?.name || 'Usuario';
    const messageType = message.type;

    logger.info(`📱 [whatsapp-webhook] Message from ${senderPhone} (${senderName}): type=${messageType}`);

    // Normalizar teléfono para búsqueda
    const normalizedPhone = normalizePhoneNumber(senderPhone);

    // ===== CASO 1: Mensaje de imagen (comprobante) =====
    if (messageType === 'image') {
      await handleImageMessage(message, senderPhone, normalizedPhone, senderName);
    }
    
    // ===== CASO 2: Mensaje de texto (posible referencia) =====
    else if (messageType === 'text') {
      await handleTextMessage(message, senderPhone, normalizedPhone, senderName);
    }

    // Siempre responder 200 OK a Meta para evitar reintentos
    return NextResponse.json({ status: 'ok' });

  } catch (error: any) {
    logger.error('❌ [whatsapp-webhook] Error processing webhook:', error);
    // Siempre responder 200 para evitar reintentos de Meta
    return NextResponse.json({ status: 'error', message: error.message });
  }
}

/**
 * Procesa mensaje de imagen (comprobante)
 */
async function handleImageMessage(
  message: any,
  senderPhone: string,
  normalizedPhone: string,
  senderName: string
) {
  const imageData = message.image;
  const mediaId = imageData?.id;
  const caption = imageData?.caption || '';

  logger.info(`🖼️ [whatsapp-webhook] Image received, mediaId: ${mediaId}`);

  // Buscar orden pendiente por teléfono (del remitente o del usuario)
  let pendingOrder = await prisma.pendingTransferOrder.findFirst({
    where: {
      status: { in: ['PENDING_PAYMENT', 'REJECTED'] },
      OR: [
        { whatsappPhone: normalizedPhone },
        { userPhone: { contains: senderPhone.slice(-10) } }
      ]
    },
    orderBy: { createdAt: 'desc' }
  });

  // Si hay caption con referencia, buscar por referencia
  if (!pendingOrder && caption) {
    const refMatch = caption.match(/TRF-[A-Z0-9]+/i);
    if (refMatch) {
      pendingOrder = await prisma.pendingTransferOrder.findFirst({
        where: {
          orderReference: refMatch[0].toUpperCase(),
          status: { in: ['PENDING_PAYMENT', 'REJECTED'] }
        }
      });
    }
  }

  if (pendingOrder) {
    // ¡Encontramos la orden! Procesar el comprobante
    await processReceiptForOrder(pendingOrder, mediaId, senderPhone, senderName);
  } else {
    // No encontramos orden, guardar en "limbo" y pedir referencia
    await saveOrphanReceipt(mediaId, senderPhone, normalizedPhone, senderName);
    await sendAskForReferenceMessage(senderPhone);
  }
}

/**
 * Procesa mensaje de texto (posible referencia TRF-XXXXX)
 */
async function handleTextMessage(
  message: any,
  senderPhone: string,
  normalizedPhone: string,
  senderName: string
) {
  const text = message.text?.body || '';
  
  // Buscar patrón de referencia
  const refMatch = text.match(/TRF-[A-Z0-9]+/i);
  
  if (refMatch) {
    const reference = refMatch[0].toUpperCase();
    
    // Buscar la orden
    const pendingOrder = await prisma.pendingTransferOrder.findFirst({
      where: {
        orderReference: reference,
        status: { in: ['PENDING_PAYMENT', 'REJECTED'] }
      }
    });

    if (pendingOrder) {
      // Buscar si hay un comprobante huérfano de este teléfono
      const orphanReceipt = await prisma.orphanReceipt?.findFirst?.({
        where: { 
          senderPhone: normalizedPhone,
          processedAt: null
        },
        orderBy: { createdAt: 'desc' }
      }).catch(() => null); // Si la tabla no existe aún

      if (orphanReceipt?.mediaId) {
        // Vincular el comprobante huérfano con la orden
        await processReceiptForOrder(
          pendingOrder, 
          orphanReceipt.mediaId, 
          senderPhone, 
          senderName
        );
        
        // Marcar el huérfano como procesado
        await prisma.orphanReceipt?.update?.({
          where: { id: orphanReceipt.id },
          data: { processedAt: new Date(), linkedOrderId: pendingOrder.id }
        }).catch(() => null);

        await sendReferenceMatchedMessage(senderPhone, pendingOrder.userName, reference);
      } else {
        // No hay comprobante, solo actualizar el teléfono de WhatsApp
        await prisma.pendingTransferOrder.update({
          where: { id: pendingOrder.id },
          data: { whatsappPhone: normalizedPhone }
        });
        
        // Enviar mensaje pidiendo el comprobante
        const { sendWhatsAppTextMessage } = await import('@/lib/whatsapp');
        await sendWhatsAppTextMessage(
          senderPhone,
          `✅ Encontré tu orden *${reference}*.\n\nAhora envía una foto del comprobante de pago para continuar.`
        );
      }
    } else {
      // Referencia no encontrada
      await sendReferenceNotFoundMessage(senderPhone, reference);
    }
  }
  // Si no es una referencia, ignorar (podría ser otro tipo de mensaje)
}

/**
 * Procesa un comprobante para una orden encontrada
 */
async function processReceiptForOrder(
  order: any,
  mediaId: string,
  senderPhone: string,
  senderName: string
) {
  try {
    // Descargar la imagen de WhatsApp
    const mediaResult = await downloadWhatsAppMedia(mediaId);
    
    let receiptUrl: string | null = null;
    
    if (mediaResult.success && mediaResult.imageBuffer) {
      // Guardar en Supabase Storage
      const fileName = `receipts/${order.orderReference}-${Date.now()}.jpg`;
      
      const { data, error } = await supabase.storage
        .from('comprobantes')
        .upload(fileName, mediaResult.imageBuffer, {
          contentType: mediaResult.mimeType || 'image/jpeg',
          upsert: true
        });

      if (!error) {
        // Obtener URL pública
        const { data: urlData } = supabase.storage
          .from('comprobantes')
          .getPublicUrl(fileName);
        
        receiptUrl = urlData?.publicUrl || null;
        logger.info(`📁 [whatsapp-webhook] Receipt saved to: ${receiptUrl}`);
      } else {
        logger.error('❌ Error uploading to Supabase:', error);
      }
    }

    // Actualizar la orden con el comprobante
    await prisma.pendingTransferOrder.update({
      where: { id: order.id },
      data: {
        status: 'RECEIPT_RECEIVED',
        receiptMediaId: mediaId,
        receiptImageUrl: receiptUrl,
        receiptReceivedAt: new Date(),
        whatsappPhone: normalizePhoneNumber(senderPhone)
      }
    });

    logger.info(`✅ [whatsapp-webhook] Receipt processed for order ${order.orderReference}`);

    // Confirmar recepción al usuario
    await sendReceiptReceivedMessage(senderPhone, order.userName, order.orderReference);

  } catch (error: any) {
    logger.error('❌ [whatsapp-webhook] Error processing receipt:', error);
  }
}

/**
 * Guarda un comprobante "huérfano" cuando no se encuentra la orden
 */
async function saveOrphanReceipt(
  mediaId: string,
  senderPhone: string,
  normalizedPhone: string,
  senderName: string
) {
  try {
    // Intentar crear registro de comprobante huérfano
    // Esta tabla se creará si no existe
    await prisma.$executeRaw`
      INSERT INTO "OrphanReceipt" ("id", "mediaId", "senderPhone", "senderName", "createdAt")
      VALUES (gen_random_uuid(), ${mediaId}, ${normalizedPhone}, ${senderName}, NOW())
      ON CONFLICT DO NOTHING
    `.catch(() => {
      // La tabla no existe, loguear para crear después
      logger.warn('⚠️ [whatsapp-webhook] OrphanReceipt table does not exist');
    });
    
    logger.info(`📋 [whatsapp-webhook] Orphan receipt saved from ${senderPhone}`);
  } catch (error) {
    logger.error('❌ Error saving orphan receipt:', error);
  }
}
