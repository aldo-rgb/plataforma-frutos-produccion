import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import logger from '@/lib/logger';
import Stripe from 'stripe';
import { sendWelcomeNotifications } from '@/lib/welcome-notification';
import { processAmbassadorCommission, determineProductType } from '@/lib/ambassador-engine';

/**
 * GET /api/checkout/payment-success
 * 
 * Callback cuando el pago de REGISTRO es exitoso.
 * Crea el usuario y los tickets correspondientes.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get('data');
    const externalReference = searchParams.get('external_reference');
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const collectionStatus = searchParams.get('collection_status');
    const preferenceId = searchParams.get('preference_id');
    const provider = searchParams.get('provider');
    const sessionId = searchParams.get('session_id');

    logger.debug('📨 Payment success callback (registration) received');
    logger.debug('   Provider:', provider);
    logger.debug('   Payment ID:', paymentId);
    logger.debug('   Session ID:', sessionId);
    logger.debug('   Preference ID:', preferenceId);
    logger.debug('   Status:', status);
    logger.debug('   Collection Status:', collectionStatus);
    logger.debug('   External Reference:', externalReference ? 'present' : 'missing');
    logger.debug('   Data param:', dataParam ? 'present' : 'missing');
    logger.debug('   Full URL:', request.url);

    // Parse order data from data param or external_reference (MercadoPago)
    let orderData: any = null;
    
    if (dataParam) {
      try {
        orderData = JSON.parse(decodeURIComponent(dataParam));
        logger.debug('✅ Parsed order data from data param');
      } catch (e) {
        logger.error('Error parsing data param:', e);
      }
    }
    
    // If no data param, try external_reference (MercadoPago sends this)
    if (!orderData && externalReference) {
      try {
        orderData = JSON.parse(decodeURIComponent(externalReference));
        logger.debug('✅ Parsed order data from external_reference');
      } catch (e) {
        logger.error('Error parsing external_reference:', e);
      }
    }

    // Si no tenemos los datos y tenemos session_id de Stripe, obtenerlos de la sesión
    if (!orderData && sessionId && provider === 'stripe') {
      logger.debug('🔍 Intentando obtener datos de la sesión de Stripe...');
      orderData = await getOrderDataFromStripe(sessionId);
    }

    // Si no tenemos los datos y tenemos payment_id, intentar obtenerlos de MercadoPago
    if (!orderData && paymentId && provider === 'mercadopago') {
      logger.debug('🔍 Intentando obtener datos del pago de MercadoPago...');
      orderData = await getOrderDataFromMercadoPago(paymentId);
    }

    // Si aún no tenemos datos y tenemos preference_id, intentar obtenerlos de la preferencia
    if (!orderData && preferenceId && provider === 'mercadopago') {
      logger.debug('🔍 Intentando obtener datos de la preferencia de MercadoPago...');
      orderData = await getOrderDataFromPreference(preferenceId);
    }

    if (!orderData || !orderData.userData || !orderData.organizationId) {
      logger.error('❌ Missing order data after all attempts');
      logger.error('   orderData:', orderData);
      return NextResponse.redirect(
        new URL('/checkout?payment=error&reason=datos-incompletos', request.url)
      );
    }

    const { 
      organizationId,
      visionId,
      ticketSelection,
      amount,
      userData,
      appliedCodes,
      stripePaymentStatus,
    } = orderData;

    // Verify payment status - MercadoPago envía status/collection_status, Stripe pasa en stripePaymentStatus
    const paymentStatus = stripePaymentStatus || status || collectionStatus;
    if (paymentStatus !== 'approved' && provider !== 'stripe') {
      // Para Stripe, si llegamos aquí con session_id es porque el pago fue exitoso
      logger.debug('Payment not approved:', paymentStatus);
      return NextResponse.redirect(
        new URL(`/checkout?payment=failed&status=${paymentStatus}`, request.url)
      );
    }

    logger.debug(`✅ Pago de registro aprobado`);
    logger.debug(`   Email: ${userData.email}`);
    logger.debug(`   Ticket: ${ticketSelection}`);
    logger.debug(`   Monto: $${amount} MXN`);

    // Check if user already exists
    const existingUser = await prisma.usuario.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      logger.debug('Usuario ya existe, redirigiendo a login');
      return NextResponse.redirect(
        new URL('/auth/signin?message=usuario-existente', request.url)
      );
    }

    // Get organization and vision
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { id: true, name: true },
    });

    if (!organization) {
      return NextResponse.redirect(
        new URL('/checkout?payment=error&reason=organizacion-no-encontrada', request.url)
      );
    }

    // Get vision
    let vision = null;
    if (visionId) {
      vision = await prisma.vision.findUnique({
        where: { id: visionId },
        select: {
          id: true,
          nombre: true,
          startDate: true,
          endDate: true,
          advancedStartDate: true,
          advancedEndDate: true,
          plWeekend3EndDate: true,
        },
      });
    }

    // Usar contraseña por defecto si no se proporciona
    const finalPassword = userData.password || 'Quantum123';
    const requirePasswordChange = !userData.password; // Marcar para cambio si usó contraseña por defecto
    
    // Hash password
    const hashedPassword = await bcrypt.hash(finalPassword, 10);

    // Generar código de referido único para el nuevo usuario
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const nombreLimpio = userData.nombre.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^A-Za-z]/g, '').toUpperCase();
    const prefix = nombreLimpio.substring(0, 3).padEnd(3, 'X');
    const generatedReferralCode = `${prefix}${timestamp}${random}`;

    // Create user and tickets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.usuario.create({
        data: {
          email: userData.email,
          nombre: userData.nombre,
          apodo: userData.apodo || null, // No usar nombre como apodo, se completa en fase 2
          telefono: userData.telefono || '',
          password: hashedPassword,
          requirePasswordChange, // Marcar si necesita cambiar contraseña al primer login
          referralCode: generatedReferralCode, // Código de referido personal
          organizationId: organizationId,
          rol: 'PARTICIPANTE',
          isActive: true,
          suscripcion: 'ACTIVO',
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      logger.debug(`✅ Usuario creado: ${newUser.id} - ${newUser.email}`);

      // Get prices config
      const priceConfig = await tx.ticketPriceConfig.findUnique({
        where: {
          organizationId_level: {
            organizationId: organizationId,
            level: 'BASIC',
          },
        },
      });

      const basicPrice = priceConfig?.regularPrice ? parseFloat(priceConfig.regularPrice.toString()) : 2500;

      // Create BASIC ticket
      const basicTicket = await tx.ticket.create({
        data: {
          ownerId: newUser.id,
          organizationId: organizationId,
          visionId: visionId || null,
          level: 'BASIC',
          type: 'STANDARD',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          costAtPurchase: basicPrice,
          amountPaid: ticketSelection === 'BASIC_ONLY' ? amount : basicPrice,
          isTransferable: false,
          validUntil: vision?.endDate || null,
        },
      });

      logger.debug(`✅ Ticket BASIC creado: ${basicTicket.id}`);

      // Create BASIC enrollment if vision exists
      if (visionId) {
        // Find a coordinator for this vision
        const coordinator = await tx.vision_enrollments.findFirst({
          where: {
            visionId: visionId,
            level: 'BASIC',
          },
          select: { coordinatorId: true },
        });

        await tx.vision_enrollments.create({
          data: {
            userId: newUser.id,
            visionId: visionId,
            coordinatorId: coordinator?.coordinatorId || newUser.id, // Use self if no coordinator found
            level: 'BASIC',
            enrollmentStatus: 'ENROLLED',
            paymentStatus: 'PAID',
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        logger.debug(`✅ Enrollment BASIC creado para visión ${visionId}`);
      }

      // If FULL_VISION, also create ADVANCED and PL tickets
      if (ticketSelection === 'FULL_VISION' && visionId) {
        // Get ADVANCED price
        const advancedPriceConfig = await tx.ticketPriceConfig.findUnique({
          where: {
            organizationId_level: {
              organizationId: organizationId,
              level: 'ADVANCED',
            },
          },
        });
        const advancedPrice = advancedPriceConfig?.regularPrice ? parseFloat(advancedPriceConfig.regularPrice.toString()) : 7500;

        // Get PL price
        const plPriceConfig = await tx.ticketPriceConfig.findUnique({
          where: {
            organizationId_level: {
              organizationId: organizationId,
              level: 'PL',
            },
          },
        });
        const plPrice = plPriceConfig?.regularPrice ? parseFloat(plPriceConfig.regularPrice.toString()) : 11000;

        // Create ADVANCED ticket (pending until basic completes)
        await tx.ticket.create({
          data: {
            ownerId: newUser.id,
            organizationId: organizationId,
            visionId: visionId,
            level: 'ADVANCED',
            type: 'STANDARD',
            status: 'PENDING_PAYMENT',
            paymentStatus: 'PAID',
            costAtPurchase: advancedPrice,
            amountPaid: advancedPrice,
            isTransferable: false,
            validUntil: vision?.advancedEndDate || null,
          },
        });

        logger.debug(`✅ Ticket ADVANCED creado`);

        // Create PL ticket (pending until advanced completes)
        await tx.ticket.create({
          data: {
            ownerId: newUser.id,
            organizationId: organizationId,
            visionId: visionId,
            level: 'PL',
            type: 'STANDARD',
            status: 'PENDING_PAYMENT',
            paymentStatus: 'PAID',
            costAtPurchase: plPrice,
            amountPaid: plPrice,
            isTransferable: false,
            validUntil: vision?.plWeekend3EndDate || null,
          },
        });

        logger.debug(`✅ Ticket PL creado`);
      }

      // Mark applied gift codes as USED
      if (appliedCodes && appliedCodes.length > 0) {
        for (const codeInfo of appliedCodes) {
          const codeToMark = typeof codeInfo === 'string' ? codeInfo : codeInfo.code;
          if (codeToMark) {
            try {
              await tx.giftCode.updateMany({
                where: { 
                  code: codeToMark.toUpperCase(),
                  status: 'ACTIVE'
                },
                data: {
                  status: 'USED',
                  usedBy: newUser.id,
                  usedAt: new Date(),
                },
              });
              logger.debug(`✅ Código ${codeToMark} marcado como USED`);
            } catch (codeError) {
              logger.warn(`⚠️ No se pudo marcar código ${codeToMark}:`, codeError);
            }
          }
        }
      }

      return { user: newUser, basicTicket };
    });

    // 🎁 QUANTUM AMBASSADORS: Procesar comisión por referido
    try {
      // Verificar si userData tiene referralCode del referidor
      const referrerCode = userData.referralCode;
      
      if (referrerCode) {
        // Determinar tipo de producto
        const productType = ticketSelection === 'FULL_VISION' ? 'COMBO' : 'BASIC';
        
        // Si se usó código de descuento, no generar comisión
        const usedGiftCode = appliedCodes && appliedCodes.length > 0;
        
        const ambassadorResult = await processAmbassadorCommission({
          referralCode: referrerCode,
          referredUserId: result.user.id,
          ticketId: result.basicTicket.id,
          productType,
          saleAmount: amount,
          organizationId: organizationId,
          visionId: visionId || undefined,
          usedGiftCode
        });
        
        if (ambassadorResult.success) {
          logger.debug(`🎁 Comisión ambassador: ${ambassadorResult.message}`);
        } else {
          logger.debug(`ℹ️ Sin comisión ambassador: ${ambassadorResult.message}`);
        }
      }
    } catch (ambassadorError) {
      logger.error('Error procesando comisión ambassador:', ambassadorError);
      // No falla el checkout si falla la comisión
    }

    // Enviar notificaciones de bienvenida (Email + WhatsApp)
    try {
      await sendWelcomeNotifications({
        userId: result.user.id,
        email: userData.email,
        telefono: userData.telefono || '',
        nombre: userData.nombre,
        password: finalPassword, // Contraseña en texto plano (Quantum123 por defecto)
        organizationName: organization.name,
        visionName: vision?.nombre
      });
      logger.debug('✅ Notificaciones de bienvenida enviadas');
    } catch (notifError) {
      logger.error('Error enviando notificaciones de bienvenida:', notifError);
      // No fallar el checkout si fallan las notificaciones
    }

    // Redirect to success
    const successUrl = new URL('/checkout/success', request.url);
    successUrl.searchParams.set('email', userData.email);
    successUrl.searchParams.set('tickets', ticketSelection === 'FULL_VISION' ? '3' : '1');

    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    logger.error('❌ Error processing registration payment:', error);
    return NextResponse.redirect(
      new URL(`/checkout?payment=error&reason=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}

/**
 * Obtener datos del pedido consultando el pago en MercadoPago
 */
async function getOrderDataFromMercadoPago(paymentId: string): Promise<any | null> {
  try {
    // Buscar credenciales de MercadoPago en todas las organizaciones activas
    const gateways = await prisma.paymentGatewayConfig.findMany({
      where: {
        provider: 'MERCADOPAGO',
        isActive: true,
      },
    });

    for (const gateway of gateways) {
      if (!gateway.secretKey) continue;

      try {
        const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
          headers: {
            Authorization: `Bearer ${gateway.secretKey}`,
          },
        });

        if (paymentRes.ok) {
          const payment = await paymentRes.json();
          logger.debug('✅ Pago encontrado en MercadoPago:', payment.id);
          logger.debug('   External Reference:', payment.external_reference);

          if (payment.external_reference) {
            try {
              return JSON.parse(payment.external_reference);
            } catch (e) {
              logger.error('Error parsing external_reference from payment:', e);
            }
          }
        }
      } catch (e) {
        logger.error('Error fetching payment from MercadoPago:', e);
      }
    }

    return null;
  } catch (error) {
    logger.error('Error in getOrderDataFromMercadoPago:', error);
    return null;
  }
}

/**
 * Obtener datos del pedido consultando la preferencia en MercadoPago
 */
async function getOrderDataFromPreference(preferenceId: string): Promise<any | null> {
  try {
    // Buscar credenciales de MercadoPago en todas las organizaciones activas
    const gateways = await prisma.paymentGatewayConfig.findMany({
      where: {
        provider: 'MERCADOPAGO',
        isActive: true,
      },
    });

    for (const gateway of gateways) {
      if (!gateway.secretKey) continue;

      try {
        const prefRes = await fetch(`https://api.mercadopago.com/checkout/preferences/${preferenceId}`, {
          headers: {
            Authorization: `Bearer ${gateway.secretKey}`,
          },
        });

        if (prefRes.ok) {
          const preference = await prefRes.json();
          logger.debug('✅ Preferencia encontrada en MercadoPago:', preference.id);
          logger.debug('   External Reference:', preference.external_reference);

          if (preference.external_reference) {
            try {
              return JSON.parse(preference.external_reference);
            } catch (e) {
              logger.error('Error parsing external_reference from preference:', e);
            }
          }
        }
      } catch (e) {
        logger.error('Error fetching preference from MercadoPago:', e);
      }
    }

    return null;
  } catch (error) {
    logger.error('Error in getOrderDataFromPreference:', error);
    return null;
  }
}

/**
 * Obtener datos del pedido desde la sesión de Stripe
 */
async function getOrderDataFromStripe(sessionId: string): Promise<any | null> {
  try {
    // Buscar la clave de Stripe en las configuraciones de pago activas
    const gateways = await prisma.paymentGatewayConfig.findMany({
      where: {
        provider: 'STRIPE',
        isActive: true,
      },
    });

    for (const gateway of gateways) {
      if (!gateway.secretKey) continue;

      try {
        const stripe = new Stripe(gateway.secretKey, {
          apiVersion: '2025-01-27.acacia',
        });

        const session = await stripe.checkout.sessions.retrieve(sessionId);
        
        if (session && session.metadata) {
          logger.debug('✅ Sesión de Stripe encontrada:', session.id);
          logger.debug('   Payment Status:', session.payment_status);
          logger.debug('   Metadata keys:', Object.keys(session.metadata));

          // Construir orderData desde el metadata de Stripe
          const orderData: any = {
            organizationId: session.metadata.organizationId ? parseInt(session.metadata.organizationId) : null,
            visionId: session.metadata.visionId ? parseInt(session.metadata.visionId) : null,
            ticketSelection: session.metadata.ticketSelection || 'BASIC_ONLY',
            amount: session.amount_total ? session.amount_total / 100 : 0,
            userData: {
              email: session.metadata.email || session.customer_email,
              nombre: session.metadata.nombre || session.metadata.name,
              apodo: session.metadata.apodo || '',
              telefono: session.metadata.telefono || session.metadata.phone || '',
              password: session.metadata.password || '',
              referralCode: session.metadata.referralCode || '',
              horarioLlamada: session.metadata.horarioLlamada || '',
              profession: session.metadata.profession || '',
              birthdate: session.metadata.birthdate || '',
              children: session.metadata.children ? parseInt(session.metadata.children) : 0,
              goals: session.metadata.goals ? JSON.parse(session.metadata.goals) : [],
              expectations: session.metadata.expectations || '',
            },
            appliedCodes: session.metadata.appliedCodes ? JSON.parse(session.metadata.appliedCodes) : [],
          };

          // Marcar como aprobado si el pago fue exitoso
          if (session.payment_status === 'paid') {
            return { ...orderData, stripePaymentStatus: 'approved' };
          }

          return orderData;
        }
      } catch (e) {
        logger.error('Error fetching session from Stripe:', e);
      }
    }

    return null;
  } catch (error) {
    logger.error('Error in getOrderDataFromStripe:', error);
    return null;
  }
}
