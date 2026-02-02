import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

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

    console.log('📨 Payment success callback (registration) received');
    console.log('   Provider:', provider);
    console.log('   Payment ID:', paymentId);
    console.log('   Preference ID:', preferenceId);
    console.log('   Status:', status);
    console.log('   Collection Status:', collectionStatus);
    console.log('   External Reference:', externalReference ? 'present' : 'missing');
    console.log('   Data param:', dataParam ? 'present' : 'missing');
    console.log('   Full URL:', request.url);

    // Parse order data from data param or external_reference (MercadoPago)
    let orderData: any = null;
    
    if (dataParam) {
      try {
        orderData = JSON.parse(decodeURIComponent(dataParam));
        console.log('✅ Parsed order data from data param');
      } catch (e) {
        console.error('Error parsing data param:', e);
      }
    }
    
    // If no data param, try external_reference (MercadoPago sends this)
    if (!orderData && externalReference) {
      try {
        orderData = JSON.parse(decodeURIComponent(externalReference));
        console.log('✅ Parsed order data from external_reference');
      } catch (e) {
        console.error('Error parsing external_reference:', e);
      }
    }

    // Si no tenemos los datos y tenemos payment_id, intentar obtenerlos de MercadoPago
    if (!orderData && paymentId && provider === 'mercadopago') {
      console.log('🔍 Intentando obtener datos del pago de MercadoPago...');
      orderData = await getOrderDataFromMercadoPago(paymentId);
    }

    // Si aún no tenemos datos y tenemos preference_id, intentar obtenerlos de la preferencia
    if (!orderData && preferenceId && provider === 'mercadopago') {
      console.log('🔍 Intentando obtener datos de la preferencia de MercadoPago...');
      orderData = await getOrderDataFromPreference(preferenceId);
    }

    if (!orderData || !orderData.userData || !orderData.organizationId) {
      console.error('❌ Missing order data after all attempts');
      console.error('   orderData:', orderData);
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
    } = orderData;

    // Verify payment status - MercadoPago puede enviar status o collection_status
    const paymentStatus = status || collectionStatus;
    if (paymentStatus !== 'approved') {
      console.log('Payment not approved:', paymentStatus);
      return NextResponse.redirect(
        new URL(`/checkout?payment=failed&status=${paymentStatus}`, request.url)
      );
    }

    console.log(`✅ Pago de registro aprobado`);
    console.log(`   Email: ${userData.email}`);
    console.log(`   Ticket: ${ticketSelection}`);
    console.log(`   Monto: $${amount} MXN`);

    // Check if user already exists
    const existingUser = await prisma.usuario.findUnique({
      where: { email: userData.email },
    });

    if (existingUser) {
      console.log('Usuario ya existe, redirigiendo a login');
      return NextResponse.redirect(
        new URL('/auth/signin?message=usuario-existente', request.url)
      );
    }

    // Get organization and vision
    const organization = await prisma.organization.findUnique({
      where: { id: organizationId },
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

    // Hash password
    const hashedPassword = await bcrypt.hash(userData.password || 'temporal123', 10);

    // Create user and tickets in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user
      const newUser = await tx.usuario.create({
        data: {
          email: userData.email,
          nombre: userData.nombre,
          apodo: userData.apodo || userData.nombre,
          telefono: userData.telefono || '',
          password: hashedPassword,
          organizationId: organizationId,
          rol: 'PARTICIPANTE',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Usuario creado: ${newUser.id} - ${newUser.email}`);

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

      console.log(`✅ Ticket BASIC creado: ${basicTicket.id}`);

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

        console.log(`✅ Enrollment BASIC creado para visión ${visionId}`);
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

        console.log(`✅ Ticket ADVANCED creado`);

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

        console.log(`✅ Ticket PL creado`);
      }

      return { user: newUser, basicTicket };
    });

    // Redirect to success
    const successUrl = new URL('/checkout/success', request.url);
    successUrl.searchParams.set('email', userData.email);
    successUrl.searchParams.set('tickets', ticketSelection === 'FULL_VISION' ? '3' : '1');

    return NextResponse.redirect(successUrl);

  } catch (error: any) {
    console.error('❌ Error processing registration payment:', error);
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
          console.log('✅ Pago encontrado en MercadoPago:', payment.id);
          console.log('   External Reference:', payment.external_reference);

          if (payment.external_reference) {
            try {
              return JSON.parse(payment.external_reference);
            } catch (e) {
              console.error('Error parsing external_reference from payment:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching payment from MercadoPago:', e);
      }
    }

    return null;
  } catch (error) {
    console.error('Error in getOrderDataFromMercadoPago:', error);
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
          console.log('✅ Preferencia encontrada en MercadoPago:', preference.id);
          console.log('   External Reference:', preference.external_reference);

          if (preference.external_reference) {
            try {
              return JSON.parse(preference.external_reference);
            } catch (e) {
              console.error('Error parsing external_reference from preference:', e);
            }
          }
        }
      } catch (e) {
        console.error('Error fetching preference from MercadoPago:', e);
      }
    }

    return null;
  } catch (error) {
    console.error('Error in getOrderDataFromPreference:', error);
    return null;
  }
}
