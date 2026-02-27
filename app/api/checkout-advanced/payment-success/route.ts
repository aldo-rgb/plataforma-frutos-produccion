import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { processAmbassadorCommission } from '@/lib/ambassador-engine';

/**
 * GET /api/checkout-advanced/payment-success
 * 
 * Callback de Mercado Pago cuando el pago es exitoso.
 * Procesa la inscripción del usuario al AVANZADO/PL.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const collectionStatus = searchParams.get('collection_status');
    const externalReference = searchParams.get('external_reference');
    const preferenceId = searchParams.get('preference_id');
    const provider = searchParams.get('provider');
    const stripeSessionId = searchParams.get('session_id');

    logger.debug('📨 Payment success callback received');
    logger.debug('   Payment ID:', paymentId);
    logger.debug('   Status:', status);
    logger.debug('   Collection Status:', collectionStatus);
    logger.debug('   External Reference:', externalReference);
    logger.debug('   Preference ID:', preferenceId);
    logger.debug('   Provider:', provider);
    logger.debug('   Stripe Session ID:', stripeSessionId);

    // Parse order data from external_reference (que contiene los datos de la orden)
    let orderData: any = null;
    let isPaymentApproved = false;
    
    // Manejar Stripe
    if (provider === 'stripe' && stripeSessionId) {
      try {
        const gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
          where: { provider: 'STRIPE', isActive: true },
          select: { secretKey: true },
        });
        
        if (gatewayConfig?.secretKey) {
          const Stripe = require('stripe');
          const stripe = new Stripe(gatewayConfig.secretKey, { apiVersion: '2023-10-16' });
          
          const session = await stripe.checkout.sessions.retrieve(stripeSessionId);
          logger.debug('   Stripe session status:', session.payment_status);
          
          if (session.payment_status === 'paid') {
            isPaymentApproved = true;
            
            // Obtener datos de metadata
            if (session.metadata?.orderDataJson) {
              try {
                orderData = JSON.parse(session.metadata.orderDataJson);
              } catch (e) {
                // Fallback a campos individuales
                orderData = {
                  userId: parseInt(session.metadata.userId),
                  visionId: parseInt(session.metadata.visionId),
                  organizationId: parseInt(session.metadata.organizationId),
                  packageType: session.metadata.packageType,
                  amount: parseFloat(session.metadata.amount),
                  pendingDebt: parseFloat(session.metadata.pendingDebt || '0'),
                };
              }
            }
          }
        }
      } catch (e) {
        logger.error('Error fetching Stripe session:', e);
      }
    }
    
    // Manejar MercadoPago
    if (!orderData && externalReference) {
      try {
        orderData = JSON.parse(externalReference);
        logger.debug('   Parsed external_reference:', orderData);
      } catch (e) {
        logger.error('Error parsing external_reference:', e);
      }
    }

    // Si tenemos payment_id, obtener más detalles del pago desde MercadoPago
    if (paymentId && !orderData) {
      try {
        // Obtener la configuración de MercadoPago para buscar el access token
        const gatewayConfig = await prisma.paymentGatewayConfig.findFirst({
          where: { provider: 'MERCADOPAGO', isActive: true },
          select: { secretKey: true },
        });
        
        if (gatewayConfig?.secretKey) {
          const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
            headers: {
              Authorization: `Bearer ${gatewayConfig.secretKey}`,
            },
          });
          
          if (paymentRes.ok) {
            const paymentData = await paymentRes.json();
            logger.debug('   Payment data from MP:', JSON.stringify(paymentData.metadata || {}, null, 2));
            
            // Los datos están en metadata
            if (paymentData.metadata) {
              orderData = paymentData.metadata;
            }
            // O intentar parsear de external_reference del payment
            if (!orderData && paymentData.external_reference) {
              try {
                orderData = JSON.parse(paymentData.external_reference);
              } catch (e) {
                // ignore
              }
            }
          }
        }
      } catch (e) {
        logger.error('Error fetching payment from MP:', e);
      }
    }

    if (!orderData || !orderData.userId || !orderData.visionId || !orderData.packageType) {
      logger.error('Missing order data:', orderData);
      return NextResponse.redirect(
        new URL('/dashboard/checkout-advanced?payment=error&reason=datos-incompletos', request.url)
      );
    }

    const { 
      userId, 
      visionId, 
      organizationId, 
      packageType, 
      amount, 
      pendingDebt,
      prices,
      appliedCodes,
    } = orderData;

    // Verify payment status (approved)
    // Para MercadoPago: status === 'approved' o collectionStatus === 'approved'
    // Para Stripe: isPaymentApproved ya fue calculado arriba
    if (!isPaymentApproved && status !== 'approved' && collectionStatus !== 'approved') {
      logger.debug('Payment not approved:', { isPaymentApproved, status, collectionStatus });
      return NextResponse.redirect(
        new URL(`/dashboard/checkout-advanced?payment=failed&status=${status || collectionStatus || 'not_approved'}`, request.url)
      );
    }
    
    // Marcar como aprobado si viene de MercadoPago
    if (status === 'approved' || collectionStatus === 'approved') {
      isPaymentApproved = true;
    }

    logger.debug(`✅ Pago aprobado para usuario ${userId}`);
    logger.debug(`   Paquete: ${packageType}`);
    logger.debug(`   Monto: $${amount} MXN`);

    // Check if user already has the enrollment (avoid duplicates)
    const isPLOnly = packageType === 'PL_BASE' || packageType === 'PL_CON_CREDITO';
    
    if (isPLOnly) {
      const existingPL = await prisma.vision_enrollments.findFirst({
        where: {
          userId: userId,
          level: 'PL',
        },
      });

      if (existingPL) {
        logger.debug('Usuario ya tiene inscripción PL, redirigiendo a success');
        return NextResponse.redirect(
          new URL('/dashboard/upgrade-advanced/success?already=true', request.url)
        );
      }
    } else {
      const existingAdvanced = await prisma.vision_enrollments.findFirst({
        where: {
          userId: userId,
          visionId: visionId,
          level: 'ADVANCED',
        },
      });

      if (existingAdvanced) {
        logger.debug('Usuario ya tiene inscripción ADVANCED, redirigiendo a success');
        return NextResponse.redirect(
          new URL('/dashboard/upgrade-advanced/success?already=true', request.url)
        );
      }
    }

    // Get user's BASIC enrollment to get coordinator
    const basicEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        level: 'BASIC',
      },
      orderBy: { enrolledAt: 'desc' },
    });

    if (!basicEnrollment) {
      logger.error('Usuario no tiene inscripción BASIC');
      return NextResponse.redirect(
        new URL('/dashboard/checkout-advanced?payment=error&reason=sin-inscripcion-basico', request.url)
      );
    }

    const coordinatorId = basicEnrollment.coordinatorId;

    // Get vision details
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        nombre: true,
        advancedEndDate: true,
        plWeekend3EndDate: true,
        enabledLevels: true,
      },
    });

    if (!vision) {
      return NextResponse.redirect(
        new URL('/dashboard/checkout-advanced?payment=error&reason=vision-no-encontrada', request.url)
      );
    }

    // Create enrollments in transaction
    await prisma.$transaction(async (tx) => {
      if (isPLOnly) {
        // For PL-only, find where user has ADVANCED
        const advancedEnrollment = await tx.vision_enrollments.findFirst({
          where: {
            userId: userId,
            level: 'ADVANCED',
            enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
          },
          include: {
            Vision: {
              select: { 
                id: true, 
                organizationId: true,
                plWeekend3EndDate: true,
              },
            },
          },
        });

        if (!advancedEnrollment) {
          throw new Error('No se encontró inscripción ADVANCED');
        }

        const effectiveVisionId = advancedEnrollment.visionId;
        const effectiveOrgId = advancedEnrollment.Vision?.organizationId || organizationId;

        // Create PL enrollment
        await tx.vision_enrollments.create({
          data: {
            userId: userId,
            visionId: effectiveVisionId,
            coordinatorId: advancedEnrollment.coordinatorId,
            level: 'PL',
            enrollmentStatus: 'ACTIVE',
            paymentStatus: 'PAID',
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create PL ticket
        await tx.ticket.create({
          data: {
            ownerId: userId,
            organizationId: effectiveOrgId,
            visionId: effectiveVisionId,
            level: 'PL',
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: prices?.PL_BASE || amount,
            amountPaid: amount,
            isTransferable: false,
            validUntil: advancedEnrollment.Vision?.plWeekend3EndDate || null,
          },
        });

        logger.debug(`✅ Inscripción PL creada para usuario ${userId} en visión ${effectiveVisionId}`);
      } else {
        // Create ADVANCED enrollment
        const advancedEnrollment = await tx.vision_enrollments.create({
          data: {
            userId: userId,
            visionId: visionId,
            coordinatorId: coordinatorId,
            level: 'ADVANCED',
            enrollmentStatus: 'ACTIVE',
            paymentStatus: 'PAID',
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create ADVANCED ticket
        await tx.ticket.create({
          data: {
            ownerId: userId,
            organizationId: organizationId,
            visionId: visionId,
            level: 'ADVANCED',
            type: 'STANDARD',
            status: 'ACTIVE',
            paymentStatus: 'PAID',
            costAtPurchase: prices?.ADVANCED || amount,
            amountPaid: amount,
            isTransferable: false,
            validUntil: vision.advancedEndDate || null,
          },
        });

        logger.debug(`✅ Inscripción ADVANCED creada para usuario ${userId} en visión ${visionId}`);

        // If COMBO or APARTADO, also create PL with full/partial payment
        if (packageType === 'COMBO' || packageType === 'APARTADO') {
          const plPaymentStatus = packageType === 'COMBO' ? 'PAID' : 'PENDING';
          const plTicketStatus = packageType === 'COMBO' ? 'ACTIVE' : 'PENDING_PAYMENT';
          const plTicketType = packageType === 'APARTADO' ? 'APARTADO' : 'STANDARD';
          
          await tx.vision_enrollments.create({
            data: {
              userId: userId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'PL',
              enrollmentStatus: packageType === 'COMBO' ? 'ACTIVE' : 'PENDING',
              paymentStatus: plPaymentStatus,
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          await tx.ticket.create({
            data: {
              ownerId: userId,
              organizationId: organizationId,
              visionId: visionId,
              level: 'PL',
              type: plTicketType,
              status: plTicketStatus,
              paymentStatus: plPaymentStatus,
              costAtPurchase: prices?.PL || 9000,
              amountPaid: packageType === 'COMBO' ? (prices?.PL || 9000) : (pendingDebt ? amount - (prices?.APARTADO || 2500) : 0),
              isTransferable: false,
              validUntil: vision.plWeekend3EndDate || null,
            },
          });

          logger.debug(`✅ Inscripción PL también creada (${packageType})`);
        } else {
          // ADVANCED_ONLY or similar: Create PL enrollment and ticket with PROMO_RESERVABLE
          // This allows user to pay promo price ($9,000) during their advanced training
          
          // Calculate deposit deadline: 11 PM of day before advanced starts
          let depositDeadline: Date | null = null;
          if (vision.advancedEndDate) {
            depositDeadline = new Date(vision.advancedEndDate);
            depositDeadline.setHours(23, 0, 0, 0); // 11 PM of last day of advanced
          }
          
          await tx.vision_enrollments.create({
            data: {
              userId: userId,
              visionId: visionId,
              coordinatorId: coordinatorId,
              level: 'PL',
              enrollmentStatus: 'PENDING',
              paymentStatus: 'PENDING',
              enrolledAt: new Date(),
              updatedAt: new Date(),
            },
          });

          await tx.ticket.create({
            data: {
              ownerId: userId,
              organizationId: organizationId,
              visionId: visionId,
              level: 'PL',
              type: 'PROMO_RESERVABLE',
              status: 'PROMO_AVAILABLE',
              paymentStatus: 'PENDING',
              costAtPurchase: 9000, // Precio promo durante avanzado
              amountPaid: 0,
              isTransferable: false,
              validUntil: depositDeadline, // Válido hasta el final del avanzado
            },
          });

          logger.debug(`✅ Ticket PL PROMO_RESERVABLE creado para usuario ${userId}`);
        }
      }
    });

    // 🎁 QUANTUM AMBASSADORS: Procesar comisión por referido
    try {
      const participant = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { 
          id: true, 
          invitedBy: true, 
          invitedByUser: { 
            select: { referralCode: true } 
          }
        }
      });

      if (participant?.invitedBy && participant.invitedByUser?.referralCode) {
        // Determinar el tipo de producto para la comisión
        let productType: 'BASIC' | 'COMBO' | 'ADVANCED' | 'PL' = 'ADVANCED';
        if (isPLOnly) {
          productType = 'PL';
        } else if (packageType === 'COMBO') {
          productType = 'COMBO';
        }

        const result = await processAmbassadorCommission({
          referralCode: participant.invitedByUser.referralCode,
          referredUserId: participant.id,
          ticketId: `ADV-${userId}-${visionId}-${Date.now()}`, // ID único para evitar duplicados
          productType,
          saleAmount: amount,
          organizationId: organizationId,
          visionId: visionId
        });
        
        if (result.success) {
          logger.debug(`🎁 Comisión ambassador: ${result.message}`);
        }
      }
    } catch (ambassadorError) {
      logger.error('Error procesando comisión ambassador:', ambassadorError);
      // No falla el pago si falla la comisión
    }

    // Store success data in a cookie for the success page to read
    const successData = {
      level: isPLOnly ? 'PL' : 'ADVANCED',
      packageType,
      visionName: vision.nombre,
      amount,
    };

    // Redirect to success page with data in query param
    const successUrl = new URL('/dashboard/upgrade-advanced/success', request.url);
    successUrl.searchParams.set('data', encodeURIComponent(JSON.stringify(successData)));

    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    logger.error('❌ Error processing payment success:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/checkout-advanced?payment=error&reason=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
