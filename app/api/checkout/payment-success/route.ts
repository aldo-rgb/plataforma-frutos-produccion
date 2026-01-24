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
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const collectionStatus = searchParams.get('collection_status');

    console.log('📨 Payment success callback (registration) received');
    console.log('   Payment ID:', paymentId);
    console.log('   Status:', status);

    // Parse order data
    let orderData: any = null;
    
    if (dataParam) {
      try {
        orderData = JSON.parse(decodeURIComponent(dataParam));
      } catch (e) {
        console.error('Error parsing data param:', e);
      }
    }

    if (!orderData || !orderData.userData || !orderData.organizationId) {
      console.error('Missing order data');
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

    // Verify payment status
    if (status !== 'approved' && collectionStatus !== 'approved') {
      console.log('Payment not approved:', status, collectionStatus);
      return NextResponse.redirect(
        new URL(`/checkout?payment=failed&status=${status || collectionStatus}`, request.url)
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
