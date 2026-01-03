import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { onPackagePurchaseCompleted } from '@/lib/commissionCalculator';
import { createPackageCredits } from '@/lib/packageSessionManager';

/**
 * GET /api/lobo-solitario/payment-success
 * Procesa el pago exitoso de un lobo solitario:
 * 1. Verifica el pago con la pasarela
 * 2. Actualiza orden a COMPLETED
 * 3. Crea créditos de sesiones
 * 4. Registra comisión
 * 5. Asigna mentor al usuario
 * 6. Maneja lógica de carta:
 *    - Si tiene carta APROBADA: regresa a EN_REVISION
 *    - Si no tiene carta: activa licencia y redirige a wizard
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ordenId = searchParams.get('ordenId');
    const sessionId = searchParams.get('session_id'); // Stripe
    const paymentId = searchParams.get('payment_id'); // MercadoPago
    const payerId = searchParams.get('PayerID'); // PayPal
    const token = searchParams.get('token'); // PayPal
    const simulationStatus = searchParams.get('simulationStatus'); // 🎭 Simulación

    if (!ordenId) {
      return NextResponse.redirect(
        new URL('/dashboard/suscripcion?error=orden-invalida', request.url)
      );
    }

    // Obtener la orden
    const orden = await prisma.mentorPackageOrder.findUnique({
      where: { id: ordenId },
      include: {
        Usuario: {
          include: {
            CartaFrutos: true,
            LicenseAssignment_LicenseAssignment_userIdToUsuario: {
              where: { isActive: true },
              orderBy: { assignedAt: 'desc' },
              take: 1,
            },
          },
        },
        Mentor: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
          },
        },
      },
    });

    if (!orden) {
      return NextResponse.redirect(
        new URL('/dashboard/suscripcion?error=orden-no-encontrada', request.url)
      );
    }

    // Si ya fue procesada, redirigir
    if (orden.status === 'COMPLETED') {
      return NextResponse.redirect(
        new URL('/dashboard?success=ya-procesado', request.url)
      );
    }

    // 🎭 MODO SIMULACIÓN: Verificar si es pago simulado
    const isSimulatedPayment = simulationStatus === 'approved' || 
                              (orden.paymentData as any)?.simulated === true;

    // Verificar el pago según la pasarela
    let paymentVerified = false;
    let paymentData: any = {};

    if (isSimulatedPayment) {
      console.log('🎭 Procesando pago simulado aprobado');
      paymentVerified = true;
      paymentData = {
        simulated: true,
        simulationStatus: 'approved',
        approvedAt: new Date().toISOString(),
      };
    } else {
      // Verificación real con pasarelas de pago
      switch (orden.metodoPago?.toUpperCase()) {
        case 'PAYPAL':
          if (!token && !payerId) {
            paymentVerified = false;
          } else {
            paymentVerified = await verifyPayPalPayment(token || orden.externalPaymentId!, payerId);
            paymentData = { token, payerId, externalPaymentId: orden.externalPaymentId };
          }
          break;
        case 'STRIPE':
          paymentVerified = await verifyStripePayment(sessionId!);
          paymentData = { sessionId };
          break;
        case 'MERCADOPAGO':
          paymentVerified = await verifyMercadoPagoPayment(paymentId!);
          paymentData = { paymentId };
          break;
        default:
          console.error(`Método de pago desconocido: ${orden.metodoPago}`);
          paymentVerified = false;
      }
    }

    if (!paymentVerified) {
      await prisma.mentorPackageOrder.update({
        where: { id: ordenId },
        data: { status: 'FAILED' },
      });
      return NextResponse.redirect(
        new URL('/dashboard/suscripcion?error=pago-fallido', request.url)
      );
    }

    // ========================================================================
    // PAGO VERIFICADO - PROCESAR COMPRA
    // ========================================================================

    // 1. Actualizar orden como COMPLETED
    await prisma.mentorPackageOrder.update({
      where: { id: ordenId },
      data: {
        status: 'COMPLETED',
        paidAt: new Date(),
        paymentData: paymentData,
      },
    });

    console.log(`✅ Pago verificado y completado para lobo solitario ${ordenId}`);
    console.log(`   Usuario: ${orden.Usuario.nombre}`);
    console.log(`   Mentor: ${orden.Mentor.nombre}`);
    console.log(`   Monto: $${orden.precioTotal} ${orden.currency}`);
    console.log(`   Sesiones: ${orden.cantidad}`);

    // 2. 💰 REGISTRAR COMISIÓN EN COMMISSION LEDGER
    try {
      await onPackagePurchaseCompleted(
        ordenId,
        orden.mentorId,
        orden.usuarioId,
        orden.Usuario.nombre,
        orden.precioTotal,
        orden.cantidad,
        new Date()
      );
      console.log(`💰 Comisión registrada en ledger para lobo ${ordenId}`);
    } catch (error) {
      console.error(`⚠️ Error al registrar comisión (no crítico):`, error);
    }

    // 3. 💳 CREAR CRÉDITOS DE SESIONES
    try {
      // Calcular expiración según frecuencia
      const expiresAt = new Date();
      const metadata = orden.paymentData as any;
      const frecuencia = metadata?.frecuencia || 'BIMESTRAL';
      
      if (frecuencia === 'ANUAL') {
        expiresAt.setFullYear(expiresAt.getFullYear() + 1);
      } else {
        expiresAt.setMonth(expiresAt.getMonth() + 2);
      }

      await createPackageCredits(ordenId, orden.cantidad, expiresAt);
      console.log(`💳 Créditos creados: ${orden.cantidad} sesiones disponibles`);
    } catch (error) {
      console.error(`⚠️ Error al crear créditos:`, error);
    }

    // 4. 👤 ASIGNAR MENTOR AL USUARIO
    try {
      await prisma.usuario.update({
        where: { id: orden.usuarioId },
        data: { assignedMentorId: orden.mentorId },
      });
      console.log(`✅ Mentor ${orden.mentorId} asignado al usuario ${orden.usuarioId}`);
    } catch (error) {
      console.error('Error al asignar mentor:', error);
    }

    // 5. 📝 CREAR O ACTUALIZAR PROGRAM ENROLLMENT
    try {
      const existingEnrollment = await prisma.programEnrollment.findFirst({
        where: {
          userId: orden.usuarioId,
          visionId: orden.visionId,
        },
      });

      if (existingEnrollment) {
        await prisma.programEnrollment.update({
          where: { id: existingEnrollment.id },
          data: {
            mentorId: orden.mentorId,
            status: 'ACTIVE',
            updatedAt: new Date(),
          },
        });
      } else {
        await prisma.programEnrollment.create({
          data: {
            userId: orden.usuarioId,
            mentorId: orden.mentorId,
            visionId: orden.visionId,
            cycleType: 'BIMESTRE',
            status: 'ACTIVE',
          },
        });
      }
      console.log(`📝 Enrollment creado/actualizado para usuario ${orden.usuarioId}`);
    } catch (error) {
      console.error('Error al crear enrollment:', error);
    }

    // ========================================================================
    // 6. 📄 LÓGICA DE CARTA DE FRUTOS Y LICENCIAS
    // ========================================================================
    
    // Primero: Asignar licencia al usuario según el plan comprado
    const metadata = orden.paymentData as any;
    const planComprado = metadata?.plan || 'STANDARD';
    
    try {
      const licenciaActiva = orden.Usuario.LicenseAssignment_LicenseAssignment_userIdToUsuario?.[0];
      
      if (!licenciaActiva) {
        // Crear licencia según el plan comprado
        await prisma.licenseAssignment.create({
          data: {
            userId: orden.usuarioId,
            licenseCode: planComprado,
            isActive: true,
            activatedAt: new Date(),
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          },
        });
        console.log(`🎫 Licencia ${planComprado} creada para usuario ${orden.usuarioId}`);
      } else if (licenciaActiva.licenseCode !== planComprado) {
        // Actualizar licencia existente si el plan es diferente
        await prisma.licenseAssignment.update({
          where: { id: licenciaActiva.id },
          data: {
            licenseCode: planComprado,
            isActive: true,
            activatedAt: new Date(),
            expiresAt: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
          },
        });
        console.log(`🎫 Licencia actualizada a ${planComprado} para usuario ${orden.usuarioId}`);
      }
      
      // ⭐ ACTUALIZAR TIER Y ESTADO DE SUSCRIPCIÓN DEL USUARIO
      await prisma.usuario.update({
        where: { id: orden.usuarioId },
        data: {
          tier: planComprado, // 'STANDARD' o 'PREMIUM'
          estadoSuscripcion: 'ACTIVO',
        },
      });
      console.log(`✅ Usuario actualizado: tier=${planComprado}, estadoSuscripcion=ACTIVO`);
      
    } catch (error) {
      console.error('Error al gestionar licencia:', error);
    }
    
    // Segundo: Determinar redirección según estado de carta
    let redirectUrl = '/dashboard';
    const cartaExistente = orden.Usuario.CartaFrutos?.[0]; // Última carta del usuario

    if (cartaExistente && cartaExistente.estado === 'APROBADA') {
      // CASO 1: Carta APROBADA → regresarla a EN_REVISION y redirigir a /resumen
      try {
        await prisma.cartaFrutos.update({
          where: { id: cartaExistente.id },
          data: {
            estado: 'EN_REVISION',
            assignedMentorId: orden.mentorId,
            updatedAt: new Date(),
          },
        });
        console.log(`📄 Carta ${cartaExistente.id} regresada a EN_REVISION y asignada a mentor ${orden.mentorId}`);
        
        // Redirigir a /resumen con parámetro para mostrar botón de reenvío
        redirectUrl = `/dashboard/carta/resumen?carta-actualizada=true&ready-to-submit=true`;
      } catch (error) {
        console.error('Error al actualizar carta:', error);
        redirectUrl = `/dashboard?success=paquete-comprado&error-carta=true`;
      }
    } else if (!cartaExistente || cartaExistente.estado === 'BORRADOR' || cartaExistente.estado === 'EN_REVISION') {
      // CASO 2: No tiene carta o está en proceso → redirigir al wizard V2
      redirectUrl = `/dashboard/carta/wizard-v2?lobo-solitario=true&mentor=${orden.mentorId}`;
      console.log(`📝 Usuario sin carta aprobada → redirigir a wizard V2`);
    } else {
      // Carta en otro estado (rechazada, etc.) → ir a dashboard
      redirectUrl = `/dashboard?success=paquete-comprado&mentor=${encodeURIComponent(orden.Mentor.nombre)}`;
    }

    console.log(`🎯 Proceso de lobo solitario completado. Redirigiendo a: ${redirectUrl}`);
    
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  } catch (error: any) {
    console.error('❌ Error al procesar confirmación de pago lobo solitario:', error);
    return NextResponse.redirect(
      new URL('/dashboard/suscripcion?error=error-procesamiento', request.url)
    );
  }
}

// ============================================================================
// VERIFICACIÓN DE PAGOS POR PASARELA
// ============================================================================

async function verifyPayPalPayment(orderId: string, payerId: string | null): Promise<boolean> {
  try {
    if (!payerId) return false;

    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const PAYPAL_API_URL =
      process.env.PAYPAL_MODE === 'production'
        ? 'https://api-m.paypal.com'
        : 'https://api-m.sandbox.paypal.com';

    if (!PAYPAL_CLIENT_ID || !PAYPAL_SECRET) {
      console.error('Credenciales de PayPal no configuradas');
      return false;
    }

    // Obtener access token
    const auth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');
    const tokenRes = await fetch(`${PAYPAL_API_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    // Capturar el pago
    const captureRes = await fetch(`${PAYPAL_API_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    const captureData = await captureRes.json();
    
    return captureData.status === 'COMPLETED';
  } catch (error) {
    console.error('Error al verificar pago PayPal:', error);
    return false;
  }
}

async function verifyStripePayment(sessionId: string): Promise<boolean> {
  try {
    const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;

    if (!STRIPE_SECRET_KEY) {
      console.error('Credenciales de Stripe no configuradas');
      return false;
    }

    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    return session.payment_status === 'paid';
  } catch (error) {
    console.error('Error al verificar pago Stripe:', error);
    return false;
  }
}

async function verifyMercadoPagoPayment(paymentId: string): Promise<boolean> {
  try {
    const MP_ACCESS_TOKEN = process.env.MERCADOPAGO_ACCESS_TOKEN;

    if (!MP_ACCESS_TOKEN) {
      console.error('Credenciales de Mercado Pago no configuradas');
      return false;
    }

    const paymentRes = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        Authorization: `Bearer ${MP_ACCESS_TOKEN}`,
      },
    });

    const paymentData = await paymentRes.json();

    return paymentData.status === 'approved';
  } catch (error) {
    console.error('Error al verificar pago Mercado Pago:', error);
    return false;
  }
}
