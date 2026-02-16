import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/checkout/anticipo/success
 * 
 * Callback cuando el pago de ANTICIPO es exitoso.
 * Crea el usuario (si no existe) y el ticket con estado PENDING_PAYMENT.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const checkoutId = searchParams.get('checkoutId');
    const provider = searchParams.get('provider');
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const collectionStatus = searchParams.get('collection_status');

    logger.debug('📨 Anticipo payment success callback received');
    logger.debug('   Checkout ID:', checkoutId);
    logger.debug('   Provider:', provider);
    logger.debug('   Payment ID:', paymentId);
    logger.debug('   Status:', status || collectionStatus);

    if (!checkoutId) {
      logger.error('❌ Missing checkoutId');
      return NextResponse.redirect(
        new URL('/checkout?payment=error&reason=checkout-no-encontrado', request.url)
      );
    }

    // Verificar estado del pago (MercadoPago envía status o collection_status)
    const paymentStatus = status || collectionStatus;
    if (paymentStatus && paymentStatus !== 'approved') {
      logger.debug('Payment not approved:', paymentStatus);
      return NextResponse.redirect(
        new URL(`/checkout/anticipo?id=${checkoutId}&payment=failed&status=${paymentStatus}`, request.url)
      );
    }

    // Obtener el checkout con todos sus datos
    const checkout = await prisma.abandonedCheckout.findUnique({
      where: { id: checkoutId },
      include: {
        vision: true,
        organization: true,
        user: true,
      },
    });

    if (!checkout) {
      logger.error('❌ Checkout not found:', checkoutId);
      return NextResponse.redirect(
        new URL('/checkout?payment=error&reason=checkout-no-encontrado', request.url)
      );
    }

    // Si ya fue procesado (tiene ticketId), redirigir a success
    if (checkout.ticketId) {
      logger.debug('✅ Checkout already processed, redirecting to success');
      return NextResponse.redirect(
        new URL(`/checkout/success?type=anticipo&checkoutId=${checkoutId}`, request.url)
      );
    }

    logger.debug(`✅ Pago de anticipo aprobado para: ${checkout.email}`);

    // Obtener datos de registro del checkout
    const registrationData = (checkout as any).registrationData as any;
    const passwordHash = (checkout as any).passwordHash;

    // Verificar si el usuario ya existe o necesitamos crearlo
    let userId = checkout.userId;
    let userName = checkout.user?.nombre || checkout.firstName || 'Participante';

    if (!userId) {
      // Buscar si ya existe un usuario con ese email
      const existingUser = await prisma.usuario.findUnique({
        where: { email: checkout.email }
      });

      if (existingUser) {
        userId = existingUser.id;
        userName = existingUser.nombre;
        logger.debug(`✅ Usuario ya existía: ${checkout.email} (ID: ${userId})`);
      } else if (registrationData && passwordHash) {
        // Crear el nuevo usuario con los datos guardados
        // Convertir goals a JSON string si es un array
        let goalsString: string | null = null;
        if (registrationData.goals) {
          goalsString = Array.isArray(registrationData.goals) 
            ? JSON.stringify(registrationData.goals) 
            : registrationData.goals;
        }

        const newUser = await prisma.usuario.create({
          data: {
            nombre: registrationData.nombre || `${checkout.firstName || ''} ${checkout.lastName || ''}`.trim() || 'Participante',
            apodo: registrationData.apodo || null,
            email: checkout.email,
            password: passwordHash,
            telefono: checkout.phone || registrationData.telefono || null,
            horarioLlamada: registrationData.horarioLlamada || null,
            rol: 'PARTICIPANTE',
            organizationId: checkout.organizationId,
            profession: registrationData.profession || null,
            birthdate: registrationData.birthdate ? new Date(registrationData.birthdate) : null,
            children: registrationData.children || 0,
            goals: goalsString,
            expectations: registrationData.expectations || null,
            referralCode: registrationData.referralCode || null,
            isActive: true,
            emailVerified: false,
          },
        });

        userId = newUser.id;
        userName = newUser.nombre;
        logger.debug(`✅ Usuario creado desde anticipo: ${checkout.email} (ID: ${userId})`);
      } else {
        // No hay datos suficientes para crear usuario
        logger.error('❌ No hay datos de registro para crear usuario');
        return NextResponse.redirect(
          new URL(`/checkout?payment=error&reason=datos-registro-faltantes`, request.url)
        );
      }
    }

    // Calcular deadline: 1 PM del primer día de la visión
    let paymentDeadline: Date | null = null;
    if (checkout.vision?.startDate) {
      paymentDeadline = new Date(checkout.vision.startDate);
      paymentDeadline.setHours(13, 0, 0, 0); // 1 PM
    }

    // Obtener monto del anticipo de la organización
    const orgConfig = await prisma.organization.findUnique({
      where: { id: checkout.organizationId },
      select: { anticipoAmount: true }
    });
    const anticipoAmount = orgConfig?.anticipoAmount ? Number(orgConfig.anticipoAmount) : 500;

    // Crear ticket PENDING_PAYMENT (anticipo pagado, falta el resto)
    const ticket = await prisma.ticket.create({
      data: {
        ownerId: userId,
        organizationId: checkout.organizationId,
        visionId: checkout.visionId,
        level: 'BASIC',
        type: 'STANDARD',
        status: 'PENDING_PAYMENT',
        paymentStatus: 'PARTIAL', // Pago parcial (anticipo)
        isTransferable: false, // Anticipos no son transferibles
        isAnticipo: true,
        costAtPurchase: checkout.originalPrice,
        amountPaid: anticipoAmount,
        validUntil: paymentDeadline,
      },
    });

    logger.debug(`✅ Ticket creado: ${ticket.id} (PENDING_PAYMENT)`);

    // Actualizar el checkout
    await prisma.abandonedCheckout.update({
      where: { id: checkout.id },
      data: {
        status: 'CONVERTED_ANTICIPO',
        userId: userId,
        ticketId: ticket.id,
        convertedAt: new Date(),
      },
    });

    logger.debug(`✅ Checkout actualizado a CONVERTED_ANTICIPO`);

    // Redirigir a página de éxito
    const successUrl = new URL('/checkout/success', request.url);
    successUrl.searchParams.set('type', 'anticipo');
    successUrl.searchParams.set('checkoutId', checkoutId);
    successUrl.searchParams.set('email', checkout.email);
    successUrl.searchParams.set('ticketId', ticket.id.toString());

    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    logger.error('Error processing anticipo success:', error);
    return NextResponse.redirect(
      new URL('/checkout?payment=error&reason=error-interno', request.url)
    );
  }
}
