import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';
import logger from '@/lib/logger';
import crypto from 'crypto';
import { sendTransferOrderCreatedMessage, normalizePhoneNumber } from '@/lib/whatsapp';

// Forzar que esta ruta sea dinámica (sin caché)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

/**
 * POST /api/checkout/create-transfer-order
 * 
 * Crea una orden pendiente para pago por transferencia bancaria
 * El usuario debe realizar la transferencia y enviar el comprobante
 * Un admin confirmará el pago manualmente después
 */
export async function POST(request: NextRequest) {
  try {
    // Rate limiting para pagos
    const { result, response } = rateLimit(request, RateLimitPresets.payment);
    if (response) {
      logger.warn('Rate limit exceeded on create-transfer-order');
      return response;
    }

    const body = await request.json();
    
    const { 
      organizationId,
      visionId,
      amount,
      ticketSelection, // 'BASIC_ONLY' | 'FULL_VISION'
      userData, // { nombre, email, apodo, telefono, etc }
      appliedCodes = [],
    } = body;

    // Validaciones básicas
    if (!organizationId || !userData?.email || !userData?.nombre) {
      return NextResponse.json(
        { error: 'Faltan datos requeridos: organizationId, email y nombre son obligatorios' },
        { status: 400 }
      );
    }

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'El monto debe ser mayor a 0' },
        { status: 400 }
      );
    }

    // Verificar que la organización existe y obtener config bancaria
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { 
        id: true, 
        name: true,
        bankName: true,
        bankAccountClabe: true,
        bankAccountHolder: true,
        transferWhatsappNumber: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Verificar que la visión existe (si se proporciona)
    if (visionId) {
      const vision = await prisma.vision.findUnique({
        where: { id: visionId },
      });
      if (!vision) {
        return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
      }
    }

    // Generar referencia única para la orden
    const orderReference = `TRF-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

    // Normalizar teléfono para WhatsApp matching
    const normalizedPhone = userData.telefono ? normalizePhoneNumber(userData.telefono) : null;

    // Crear la orden pendiente en la base de datos
    const pendingOrder = await prisma.pendingTransferOrder.create({
      data: {
        orderReference,
        organizationId,
        visionId: visionId || null,
        amount,
        ticketSelection: ticketSelection || 'BASIC_ONLY',
        status: 'PENDING_PAYMENT',
        paymentMethod: 'TRANSFER',
        // Datos del usuario (aún no creado)
        userEmail: userData.email,
        userName: userData.nombre,
        userPhone: userData.telefono || null,
        userApodo: userData.apodo || null,
        whatsappPhone: normalizedPhone, // Para Pay-Bot matching
        // Guardar todos los datos del usuario para crear después
        userData: JSON.stringify(userData),
        // Códigos aplicados (si hay)
        appliedCodes: appliedCodes.length > 0 ? JSON.stringify(appliedCodes) : null,
        // Fechas
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 72 * 60 * 60 * 1000), // Expira en 72 horas
      },
    });

    logger.info('📋 [transfer-order] Orden de transferencia creada:', {
      orderReference,
      email: userData.email,
      amount,
      organizationId,
    });

    // === QUANTUM PAY-BOT: Enviar WhatsApp inicial ===
    let whatsappSent = false;
    if (userData.telefono && organization.bankAccountClabe) {
      try {
        const result = await sendTransferOrderCreatedMessage(
          userData.telefono,
          userData.nombre,
          amount,
          ticketSelection || 'BASIC_ONLY',
          orderReference,
          {
            bankName: organization.bankName || 'BBVA',
            clabe: organization.bankAccountClabe,
            holder: organization.bankAccountHolder || organization.name,
          }
        );
        
        if (result.success) {
          whatsappSent = true;
          // Guardar el ID del mensaje enviado
          await prisma.pendingTransferOrder.update({
            where: { id: pendingOrder.id },
            data: { whatsappMessageId: result.messageId }
          });
          logger.info('🤖 [Pay-Bot] WhatsApp enviado:', result.messageId);
        } else {
          logger.warn('⚠️ [Pay-Bot] No se pudo enviar WhatsApp:', result.error);
        }
      } catch (whatsappError) {
        logger.error('❌ [Pay-Bot] Error enviando WhatsApp:', whatsappError);
      }
    }

    return NextResponse.json({
      success: true,
      orderReference,
      orderId: pendingOrder.id,
      expiresAt: pendingOrder.expiresAt,
      whatsappSent,
      message: 'Orden creada. Realiza la transferencia y envía el comprobante.',
    });

  } catch (error: any) {
    logger.error('❌ [create-transfer-order] Error:', error);
    return NextResponse.json(
      { error: 'Error al crear la orden de transferencia', details: error.message },
      { status: 500 }
    );
  }
}
