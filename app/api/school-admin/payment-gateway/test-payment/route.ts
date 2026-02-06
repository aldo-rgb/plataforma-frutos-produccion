import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/school-admin/payment-gateway/test-payment
 * 
 * Crea un link de pago de prueba de $10 MXN para verificar la configuración
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    logger.debug('🧪 Test payment - Session:', session?.user?.id, session?.user?.email);

    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Get user's organization
    const user = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) },
      select: { organizationId: true, email: true, nombre: true },
    });

    logger.debug('🧪 Test payment - User:', user?.email, 'OrgId:', user?.organizationId);

    if (!user?.organizationId) {
      return NextResponse.json({ success: false, error: 'Usuario sin organización' }, { status: 400 });
    }

    // Get payment gateway config
    const config = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId: user.organizationId },
      include: { organization: { select: { name: true } } },
    });

    logger.debug('🧪 Test payment - Config:', config?.provider, 'Active:', config?.isActive, 'HasSecret:', !!config?.secretKey);

    if (!config || !config.secretKey) {
      return NextResponse.json({ 
        success: false, 
        error: 'No hay pasarela de pagos configurada' 
      }, { status: 400 });
    }

    if (!config.isActive) {
      return NextResponse.json({ 
        success: false, 
        error: 'La pasarela de pagos está desactivada' 
      }, { status: 400 });
    }

    // Usar NEXTAUTH_URL o NEXT_PUBLIC_APP_URL, asegurando HTTPS en producción
    let baseUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000';
    
    // Asegurar que sea HTTPS en producción (Vercel)
    if (process.env.VERCEL_URL && !baseUrl.startsWith('https://')) {
      baseUrl = `https://${process.env.VERCEL_URL}`;
    }
    
    logger.debug('🧪 Test payment - Base URL:', baseUrl);
    
    const orgName = config.organization?.name || 'Organización';

    if (config.provider === 'MERCADOPAGO') {
      // Crear preferencia de MercadoPago
      const preferenceBody = {
        items: [
          {
            id: `test-payment-${Date.now()}`,
            title: 'Pago de Prueba - Verificación de Pasarela',
            description: `Pago de prueba para verificar configuración de ${orgName}`,
            quantity: 1,
            unit_price: 10,
            currency_id: 'MXN',
          },
        ],
        payer: {
          email: user.email,
          name: user.nombre,
        },
        back_urls: {
          success: `${baseUrl}/dashboard/school-admin/pasarela?test=success`,
          failure: `${baseUrl}/dashboard/school-admin/pasarela?test=failure`,
          pending: `${baseUrl}/dashboard/school-admin/pasarela?test=pending`,
        },
        auto_return: 'approved',
        external_reference: JSON.stringify({
          type: 'TEST_PAYMENT',
          organizationId: user.organizationId,
          userId: session.user.id,
          timestamp: Date.now(),
        }),
        statement_descriptor: orgName.substring(0, 22),
      };

      logger.debug('🧪 Creating test payment preference for MercadoPago...');

      const response = await fetch('https://api.mercadopago.com/checkout/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.secretKey}`,
        },
        body: JSON.stringify(preferenceBody),
      });

      const responseText = await response.text();
      logger.debug('   MercadoPago response status:', response.status);
      logger.debug('   MercadoPago response:', responseText);

      if (!response.ok) {
        logger.error('❌ MercadoPago error:', responseText);
        let errorMsg = `Error de MercadoPago: ${response.status}`;
        try {
          const errorData = JSON.parse(responseText);
          errorMsg = errorData.message || errorData.error || errorMsg;
        } catch {}
        return NextResponse.json({ 
          success: false, 
          error: errorMsg
        }, { status: 400 });
      }

      const preferenceData = JSON.parse(responseText);
      
      // Usar init_point para producción (credenciales APP_USR-)
      // Solo usar sandbox_init_point si las credenciales son TEST-
      const isTestCredentials = config.secretKey.startsWith('TEST-');
      const paymentUrl = isTestCredentials 
        ? (preferenceData.sandbox_init_point || preferenceData.init_point)
        : preferenceData.init_point;

      if (!paymentUrl) {
        return NextResponse.json({ 
          success: false, 
          error: 'MercadoPago no devolvió URL de pago' 
        }, { status: 400 });
      }

      logger.debug('✅ Test payment created:', preferenceData.id);
      logger.debug('   Using:', isTestCredentials ? 'sandbox_init_point' : 'init_point');
      logger.debug('   URL:', paymentUrl);

      return NextResponse.json({
        success: true,
        paymentUrl,
        preferenceId: preferenceData.id,
        amount: 10,
        provider: 'MERCADOPAGO',
      });

    } else if (config.provider === 'STRIPE') {
      // Para Stripe
      const Stripe = require('stripe');
      const stripe = new Stripe(config.secretKey);

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: 'Pago de Prueba - Verificación de Pasarela',
                description: `Pago de prueba para verificar configuración de ${orgName}`,
              },
              unit_amount: 1000, // $10.00 MXN en centavos
            },
            quantity: 1,
          },
        ],
        mode: 'payment',
        success_url: `${baseUrl}/dashboard/school-admin/pasarela?test=success`,
        cancel_url: `${baseUrl}/dashboard/school-admin/pasarela?test=failure`,
      });

      return NextResponse.json({
        success: true,
        paymentUrl: session.url,
        sessionId: session.id,
        amount: 10,
        provider: 'STRIPE',
      });

    } else {
      return NextResponse.json({ 
        success: false, 
        error: `Proveedor ${config.provider} no soportado para pagos de prueba` 
      }, { status: 400 });
    }

  } catch (error: any) {
    logger.error('Error creating test payment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear pago de prueba' },
      { status: 500 }
    );
  }
}
