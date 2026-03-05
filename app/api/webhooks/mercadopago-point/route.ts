import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import { processAmbassadorCommission, determineProductType } from '@/lib/ambassador-engine';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';

/**
 * Webhook para recibir notificaciones de Mercado Pago Point
 * Este endpoint es llamado automáticamente por Mercado Pago cuando:
 * - Un pago es aprobado
 * - Un pago es rechazado
 * - Una intención de pago expira o es cancelada
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const signature = request.headers.get('x-signature');
    const requestId = request.headers.get('x-request-id');

    console.log('📥 Webhook Mercado Pago recibido:', {
      type: body.type,
      action: body.action,
      id: body.data?.id
    });

    // Verificar firma del webhook (si está configurada)
    const webhookSecret = process.env.MERCADO_PAGO_WEBHOOK_SECRET;
    if (webhookSecret && signature) {
      const isValid = verifyWebhookSignature(signature, requestId || '', body, webhookSecret);
      if (!isValid) {
        console.error('❌ Firma de webhook inválida');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
      }
    }

    // Procesar según el tipo de notificación
    if (body.type === 'point_integration_wh') {
      await processPointNotification(body);
    } else if (body.type === 'payment') {
      await processPaymentNotification(body);
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Error processing webhook:', error);
    return NextResponse.json(
      { error: 'Error processing webhook' },
      { status: 500 }
    );
  }
}

/**
 * Verificar firma del webhook de Mercado Pago
 */
function verifyWebhookSignature(
  signature: string, 
  requestId: string, 
  body: any, 
  secret: string
): boolean {
  try {
    // Extraer ts y v1 del header x-signature
    const parts = signature.split(',');
    let ts = '';
    let v1 = '';
    
    for (const part of parts) {
      const [key, value] = part.split('=');
      if (key === 'ts') ts = value;
      if (key === 'v1') v1 = value;
    }

    // Crear el template para verificación
    const dataId = body.data?.id || '';
    const template = `id:${dataId};request-id:${requestId};ts:${ts};`;
    
    // Generar HMAC SHA256
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(template);
    const calculated = hmac.digest('hex');

    return calculated === v1;
  } catch {
    return false;
  }
}

/**
 * Procesar notificación de Point Integration
 */
async function processPointNotification(notification: any) {
  const { action, data } = notification;
  const paymentIntentId = data?.id;

  if (!paymentIntentId) {
    console.log('⚠️ Notificación sin payment_intent_id');
    return;
  }

  console.log(`🔔 Point notification: ${action} - Intent: ${paymentIntentId}`);

  // Buscar la transacción en nuestra BD
  const transaction = await prisma.quantumPOSTransaction.findUnique({
    where: { paymentIntentId: paymentIntentId.toString() }
  });

  if (!transaction) {
    console.log(`⚠️ Transacción no encontrada: ${paymentIntentId}`);
    return;
  }

  // Obtener detalles del payment intent desde MP
  const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
  if (!accessToken) return;

  const mpResponse = await fetch(
    `${MERCADO_PAGO_API}/point/integration-api/payment-intents/${paymentIntentId}`,
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  if (!mpResponse.ok) {
    console.error('Error fetching payment intent from MP');
    return;
  }

  const paymentIntent = await mpResponse.json();
  const status = paymentIntent.status;

  console.log(`📊 Payment Intent status: ${status}`);

  // Mapear status de MP a nuestro enum
  // IMPORTANTE: 'FINISHED' solo significa que la intención terminó
  // Debemos verificar payment.status para saber si fue aprobado o rechazado
  let newStatus: 'PENDING' | 'PROCESSING' | 'APPROVED' | 'REJECTED' | 'CANCELLED' | 'ERROR';
  const paymentStatus = paymentIntent.payment?.status; // 'approved', 'rejected', etc.
  
  switch (status) {
    case 'FINISHED':
    case 'CONFIRMED':
      // Solo es APPROVED si el payment.status es 'approved'
      if (paymentStatus === 'approved') {
        newStatus = 'APPROVED';
      } else if (paymentStatus === 'rejected') {
        newStatus = 'REJECTED';
        console.log(`❌ Pago rechazado: ${paymentIntent.payment?.status_detail}`);
      } else {
        // Otro estado (pending, in_process, etc.)
        newStatus = 'ERROR';
        console.log(`⚠️ Pago con estado inesperado: ${paymentStatus}`);
      }
      break;
    case 'CANCELLED':
      newStatus = 'CANCELLED';
      break;
    case 'ERROR':
    case 'ABANDONED':
      newStatus = 'ERROR';
      break;
    case 'PROCESSING':
      newStatus = 'PROCESSING';
      break;
    default:
      newStatus = 'PENDING';
  }

  // Actualizar transacción
  await prisma.quantumPOSTransaction.update({
    where: { id: transaction.id },
    data: {
      status: newStatus,
      mpStatus: status,
      mpPaymentId: paymentIntent.payment?.id?.toString() || null,
      completedAt: newStatus === 'APPROVED' ? new Date() : null
    }
  });

  // Si el pago fue aprobado, generar ticket automáticamente
  if (newStatus === 'APPROVED' && transaction.participantId && transaction.visionId) {
    await generateTicketFromPayment(transaction);
  }
}

/**
 * Procesar notificación de pago directo
 */
async function processPaymentNotification(notification: any) {
  const paymentId = notification.data?.id;
  if (!paymentId) return;

  console.log(`💰 Payment notification: ${paymentId}`);

  // Buscar si este pago está asociado a una transacción Quantum POS
  const transaction = await prisma.quantumPOSTransaction.findFirst({
    where: { mpPaymentId: paymentId.toString() }
  });

  if (transaction) {
    // Actualizar estado si no está ya aprobado
    if (transaction.status !== 'APPROVED') {
      await prisma.quantumPOSTransaction.update({
        where: { id: transaction.id },
        data: {
          status: 'APPROVED',
          completedAt: new Date()
        }
      });

      // Generar ticket
      if (transaction.participantId && transaction.visionId) {
        await generateTicketFromPayment(transaction);
      }
    }
  }
}

/**
 * Generar ticket automáticamente después de un pago aprobado
 */
async function generateTicketFromPayment(transaction: {
  id: string;
  participantId: number | null;
  visionId: number | null;
  ticketLevel: string | null;
  amount: any;
}) {
  if (!transaction.participantId || !transaction.visionId) {
    console.log('⚠️ No se puede generar ticket: faltan datos');
    return;
  }

  try {
    // Verificar si ya existe un ticket para este usuario y visión
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        ownerId: transaction.participantId,
        visionId: transaction.visionId
      }
    });

    // Obtener la visión para datos adicionales
    const vision = await prisma.vision.findUnique({
      where: { id: transaction.visionId },
      select: { 
        organizationId: true, 
        enabledLevels: true // Los niveles habilitados para esta visión
      }
    });

    if (!vision?.organizationId) {
      console.error('Vision no encontrada o sin organización');
      return;
    }

    const amount = Number(transaction.amount);

    if (existingTicket) {
      // Actualizar ticket existente
      const newAmountPaid = Number(existingTicket.amountPaid) + amount;
      const purchasePrice = Number(existingTicket.purchasePrice || 0);
      const isPaid = newAmountPaid >= purchasePrice;

      await prisma.ticket.update({
        where: { id: existingTicket.id },
        data: {
          amountPaid: newAmountPaid,
          paymentStatus: isPaid ? 'PAID' : 'PARTIAL',
          status: isPaid ? 'ACTIVE' : existingTicket.status
        }
      });

      console.log(`✅ Ticket actualizado: ${existingTicket.id} - Pagado: $${newAmountPaid}`);
    } else {
      // Crear nuevo ticket
      // Usar el nivel del transaction, o el primer nivel habilitado, o BASIC por defecto
      const level = (transaction.ticketLevel as any) || 
                    (vision.enabledLevels?.[0]) || 
                    'BASIC';

      const newTicket = await prisma.ticket.create({
        data: {
          ownerId: transaction.participantId,
          organizationId: vision.organizationId,
          visionId: transaction.visionId,
          level,
          type: 'STANDARD',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          purchasePrice: amount,
          amountPaid: amount
        }
      });

      console.log(`✅ Nuevo ticket creado: ${newTicket.id}`);

      // 🎁 QUANTUM AMBASSADORS: Procesar comisión por referido
      try {
        const participant = await prisma.usuario.findUnique({
          where: { id: transaction.participantId },
          select: { 
            id: true, 
            invitedBy: true, 
            invitedByUser: { 
              select: { referralCode: true } 
            }
          }
        });

        if (participant?.invitedBy && participant.invitedByUser?.referralCode) {
          const productType = determineProductType(level, false);
          const result = await processAmbassadorCommission({
            referralCode: participant.invitedByUser.referralCode,
            referredUserId: participant.id,
            ticketId: newTicket.id,
            productType,
            saleAmount: amount,
            organizationId: vision.organizationId,
            visionId: transaction.visionId
          });
          
          if (result.success) {
            console.log(`🎁 Comisión ambassador: ${result.message}`);
          }
        }
      } catch (ambassadorError) {
        console.error('Error procesando comisión ambassador:', ambassadorError);
        // No falla el ticket si falla la comisión
      }

      // Agregar al participante a la visión si no está
      const existingParticipant = await prisma.visionParticipante.findFirst({
        where: {
          visionId: transaction.visionId,
          participanteId: transaction.participantId
        }
      });

      if (!existingParticipant) {
        await prisma.visionParticipante.create({
          data: {
            visionId: transaction.visionId,
            participanteId: transaction.participantId,
            asignadoPorId: transaction.participantId // Auto-asignado por pago
          }
        });
        console.log(`✅ Participante agregado a la visión`);
      }
    }

  } catch (error) {
    console.error('Error generando ticket:', error);
  }
}

// GET para verificar que el webhook está activo
export async function GET() {
  return NextResponse.json({
    status: 'active',
    message: 'Quantum POS Webhook endpoint ready',
    timestamp: new Date().toISOString()
  });
}
