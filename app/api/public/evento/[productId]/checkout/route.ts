import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentGateway } from '@/lib/payment-gateway';
import Stripe from 'stripe';
import { EventRegistrationStatus } from '@prisma/client';

// POST - Crear checkout para un evento/taller público
export async function POST(
  request: Request,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const { productId } = await params;
    const id = parseInt(productId);

    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'ID de evento inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { 
      nombre, 
      email, 
      telefono, 
      invitedByUserId,
      provider = 'stripe', // 'stripe' o 'mercadopago'
      simulatePayment = false, // Flag para simular pago (testing)
      // Datos de facturación
      requiresInvoice = false,
      invoiceRfc,
      invoiceName,
      invoiceZipCode,
      invoiceRegime,
      invoiceCfdiUse,
    } = body;

    // Validaciones
    if (!nombre?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El nombre es requerido' },
        { status: 400 }
      );
    }

    if (!email?.trim()) {
      return NextResponse.json(
        { success: false, error: 'El correo electrónico es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el producto existe y está activo
    const product = await prisma.schoolProduct.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        isActive: true,
        maxCapacity: true,
        currentEnrollment: true,
        organizationId: true,
        basePrice: true,
        promoPrice: true,
        promoDeadline: true,
        type: true,
        visionId: true,
        Organization: {
          select: {
            id: true,
            name: true,
          }
        }
      },
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Evento no encontrado' },
        { status: 404 }
      );
    }

    if (!product.isActive) {
      return NextResponse.json(
        { success: false, error: 'Este evento ya no está disponible' },
        { status: 404 }
      );
    }

    // Verificar capacidad
    if (product.maxCapacity && product.currentEnrollment >= product.maxCapacity) {
      return NextResponse.json(
        { success: false, error: 'Lo sentimos, el evento está lleno' },
        { status: 400 }
      );
    }

    // Calcular el precio según la fecha
    let amount = product.basePrice;
    const now = new Date();
    
    if (product.promoPrice && product.promoDeadline && new Date(product.promoDeadline) > now) {
      amount = product.promoPrice;
    }

    // Buscar o crear usuario
    let usuario = await prisma.usuario.findUnique({
      where: { email: email.trim().toLowerCase() },
    });

    if (!usuario) {
      // Crear nuevo usuario
      const tempPassword = Math.random().toString(36).slice(-8);
      const bcrypt = require('bcryptjs');
      const hashedPassword = await bcrypt.hash(tempPassword, 10);

      usuario = await prisma.usuario.create({
        data: {
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono?.trim() || null,
          password: hashedPassword,
          organizationId: product.organizationId,
          isActive: true,
          rol: 'PARTICIPANTE',
        },
      });
    }

    // Verificar si ya tiene un registro pagado
    const existingRegistration = await prisma.eventRegistration.findFirst({
      where: {
        productId: id,
        email: email.trim().toLowerCase(),
        status: 'REGISTERED',
      },
    });

    if (existingRegistration) {
      return NextResponse.json(
        { success: false, error: 'Ya tienes un registro pagado para este evento' },
        { status: 400 }
      );
    }

    // Crear o actualizar registro de evento (estado PENDING hasta que pague)
    let registration = await prisma.eventRegistration.findFirst({
      where: {
        productId: id,
        email: email.trim().toLowerCase(),
      },
    });

    if (!registration) {
      registration = await prisma.eventRegistration.create({
        data: {
          productId: id,
          organizationId: product.organizationId,
          nombre: nombre.trim(),
          email: email.trim().toLowerCase(),
          telefono: telefono?.trim() || null,
          invitedByUserId: invitedByUserId ? parseInt(invitedByUserId) : null,
          status: EventRegistrationStatus.PENDING_PAYMENT,
          paymentStatus: 'PENDING',
          // Datos de facturación
          requiresInvoice: requiresInvoice || false,
          invoiceRfc: requiresInvoice ? invoiceRfc?.toUpperCase() : null,
          invoiceName: requiresInvoice ? invoiceName?.toUpperCase() : null,
          invoiceZipCode: requiresInvoice ? invoiceZipCode : null,
          invoiceRegime: requiresInvoice ? invoiceRegime : null,
          invoiceCfdiUse: requiresInvoice ? invoiceCfdiUse : null,
          invoiceStatus: requiresInvoice ? 'PENDING' : null,
        },
      });
    } else {
      // Actualizar si ya existe
      registration = await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          nombre: nombre.trim(),
          telefono: telefono?.trim() || null,
          invitedByUserId: invitedByUserId ? parseInt(invitedByUserId) : null,
          status: EventRegistrationStatus.PENDING_PAYMENT,
          // Datos de facturación
          requiresInvoice: requiresInvoice || false,
          invoiceRfc: requiresInvoice ? invoiceRfc?.toUpperCase() : null,
          invoiceName: requiresInvoice ? invoiceName?.toUpperCase() : null,
          invoiceZipCode: requiresInvoice ? invoiceZipCode : null,
          invoiceRegime: requiresInvoice ? invoiceRegime : null,
          invoiceCfdiUse: requiresInvoice ? invoiceCfdiUse : null,
          invoiceStatus: requiresInvoice ? 'PENDING' : null,
        },
      });
    }

    // Obtener pasarela de pago
    const gateway = await getPaymentGateway(
      product.organizationId,
      provider as 'stripe' | 'mercadopago'
    );

    if (!gateway) {
      return NextResponse.json(
        { success: false, error: 'No hay pasarela de pago configurada' },
        { status: 503 }
      );
    }

    // Crear sesión de pago según el proveedor
    if (provider === 'stripe') {
      // @ts-ignore - Stripe API version mismatch
      const stripe = new Stripe(gateway.secretKey, { apiVersion: '2024-12-18.acacia' });

      const stripeSession = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: product.name,
                description: `Entrada para ${product.name}`,
              },
              unit_amount: Math.round(amount * 100), // Centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        customer_email: email.trim().toLowerCase(),
        success_url: `${process.env.NEXTAUTH_URL}/evento/${id}/success?session_id={CHECKOUT_SESSION_ID}&registration_id=${registration.id}`,
        cancel_url: `${process.env.NEXTAUTH_URL}/evento/${id}?cancelled=true`,
        metadata: {
          type: 'event_registration',
          registrationId: registration.id.toString(),
          productId: id.toString(),
          userId: usuario.id.toString(),
          invitedByUserId: invitedByUserId?.toString() || '',
          amount: amount.toString(),
        },
      });

      // Guardar el ID de sesión de pago
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          paymentProvider: 'stripe',
          paymentSessionId: stripeSession.id,
        },
      });

      return NextResponse.json({
        success: true,
        provider: 'stripe',
        sessionId: stripeSession.id,
        url: stripeSession.url,
        registrationId: registration.id,
      });

    } else if (provider === 'mercadopago') {
      const { MercadoPagoConfig, Preference } = require('mercadopago');
      const client = new MercadoPagoConfig({ accessToken: gateway.secretKey });
      const preference = new Preference(client);

      const preferenceData = await preference.create({
        body: {
          items: [
            {
              id: `event-${id}`,
              title: product.name,
              description: `Entrada para ${product.name}`,
              quantity: 1,
              unit_price: amount,
              currency_id: 'MXN',
            },
          ],
          payer: {
            email: email.trim().toLowerCase(),
            name: nombre.trim(),
          },
          back_urls: {
            success: `${process.env.NEXTAUTH_URL}/evento/${id}/success?registration_id=${registration.id}`,
            failure: `${process.env.NEXTAUTH_URL}/evento/${id}?failed=true`,
            pending: `${process.env.NEXTAUTH_URL}/evento/${id}?pending=true`,
          },
          auto_return: 'approved',
          external_reference: JSON.stringify({
            type: 'event_registration',
            registrationId: registration.id,
            productId: id,
            userId: usuario.id,
            invitedByUserId: invitedByUserId || null,
            amount: amount,
          }),
          payment_methods: {
            installments: 12, // Hasta 12 MSI
          },
        },
      });

      // Guardar el ID de preferencia de MercadoPago
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          paymentProvider: 'mercadopago',
          paymentSessionId: preferenceData.id,
        },
      });

      return NextResponse.json({
        success: true,
        provider: 'mercadopago',
        preferenceId: preferenceData.id,
        url: preferenceData.init_point,
        registrationId: registration.id,
      });
    }

    return NextResponse.json(
      { success: false, error: 'Proveedor de pago no soportado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error creating event checkout:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
