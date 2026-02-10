import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import logger from '@/lib/logger';
import { getPaymentGateway } from '@/lib/payment-gateway';

export async function POST(req: NextRequest) {
  try {
    logger.debug('🔵 [CHECKOUT] Iniciando procesamiento de pago...');
    
    const session = await getServerSession(authOptions);
    logger.debug('🔵 [CHECKOUT] Sesión:', session?.user?.email);

    if (!session?.user) {
      logger.debug('❌ [CHECKOUT] No hay sesión');
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    logger.debug('🔵 [CHECKOUT] Usuario:', { id: user?.id, rol: user?.rol, orgId: user?.organizationId });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      logger.debug('❌ [CHECKOUT] Usuario no autorizado');
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { orderId, paymentMethod, codeId, discount } = body;
    logger.debug('🔵 [CHECKOUT] Datos recibidos:', { orderId, paymentMethod, codeId, discount });

    if (!orderId || !paymentMethod) {
      logger.debug('❌ [CHECKOUT] Datos incompletos');
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    logger.debug('🔵 [CHECKOUT] Buscando orden...');
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    logger.debug('🔵 [CHECKOUT] Orden encontrada:', order ? `ID: ${order.id}, Status: ${order.status}` : 'NO ENCONTRADA');

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    if (order.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (order.status !== 'PENDING') {
      return NextResponse.json({ error: 'Esta orden ya ha sido procesada' }, { status: 400 });
    }

    // Obtener paymentData existente
    let existingPaymentData: any = {};
    try {
      if (order.paymentData) {
        if (typeof order.paymentData === 'string') {
          existingPaymentData = JSON.parse(order.paymentData);
        } else {
          existingPaymentData = order.paymentData;
        }
      }
    } catch (error) {
      logger.error('Error parseando paymentData:', error);
    }

    // 🎫 SI ES PAGO CON CÓDIGO, PROCESAR DIRECTAMENTE
    if (paymentMethod === 'code' && codeId) {
      logger.debug('🎫 [CHECKOUT] Procesando pago con código...');
      
      // Verificar y marcar el código como usado
      const codigoAcceso = await prisma.codigoAcceso.findUnique({
        where: { id: codeId },
      });

      if (!codigoAcceso || codigoAcceso.estado !== 'DISPONIBLE') {
        return NextResponse.json({ 
          error: 'El código ya no está disponible' 
        }, { status: 400 });
      }

      // Marcar código como canjeado
      await prisma.codigoAcceso.update({
        where: { id: codeId },
        data: {
          estado: 'CANJEADO',
          canjeadoPorId: user.id,
          canjeadoEn: new Date(),
          updatedAt: new Date(),
        },
      });

      // Completar la orden con descuento aplicado
      const finalAmount = discount ? Math.max(0, order.amount - discount) : 0;
      
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'code',
          paidAt: new Date(),
          amount: finalAmount,
          paymentData: {
            ...(typeof existingPaymentData === 'object' ? existingPaymentData : {}),
            method: 'code',
            status: 'completed',
            paidAt: new Date().toISOString(),
            codeId: codeId,
            codeApplied: codigoAcceso.codigo,
            originalAmount: order.amount,
            discount: discount || order.amount,
            callsFromCode: codigoAcceso.cantidadLlamadas,
          },
        },
      });

      logger.debug('✅ Pago con código completado:', {
        orderId: updatedOrder.id,
        codeUsed: codigoAcceso.codigo,
        discount,
        finalAmount,
      });

      // Procesar asignación de mentores para pago con código
      if (existingPaymentData.type === 'VISION_MENTOR_PAYMENT') {
        const visionId = existingPaymentData.visionId;
        const mentorAssignments = existingPaymentData.mentorAssignments || [];
        const totalStudents = existingPaymentData.totalStudents || 0;

        // Asignar mentores y crear MentorPackageOrder
        for (const assignment of mentorAssignments) {
          const { mentorId, studentCount, ratePerCall, totalCost } = assignment;
          
          // Crear VisionMentor si no existe
          const existingAssignment = await prisma.visionMentor.findFirst({
            where: { visionId, mentorId },
          });

          if (!existingAssignment) {
            await prisma.visionMentor.create({
              data: {
                visionId,
                mentorId,
                asignadoPorId: user.id,
              },
            });
          }
          
          // 📦 CREAR MentorPackageOrder para este mentor
          const totalSessions = (studentCount || 1) * 18; // 18 llamadas por estudiante
          const packageOrderId = `MPO-V${visionId}-M${mentorId}-${Date.now()}`;
          
          await prisma.mentorPackageOrder.create({
            data: {
              id: packageOrderId,
              usuarioId: user.id,
              mentorId: mentorId,
              visionId: visionId,
              organizationId: user.organizationId,
              cantidad: studentCount || 1, // Cantidad de paquetes (estudiantes)
              precioUnitario: ratePerCall || 90,
              precioTotal: totalCost || 0,
              currency: 'MXN',
              metodoPago: 'code',
              status: 'COMPLETED',
              externalPaymentId: `CODE-${orderId}`,
              paidAt: new Date(),
              updatedAt: new Date(),
            },
          });
          
          logger.debug(`📦 MentorPackageOrder creado: ${packageOrderId} para mentor ${mentorId}`);
        }

        // Acreditar llamadas - usar el valor real del paquete, no el fijo de 18
        const callsPerStudent = existingPaymentData.totalCallsPerStudent || 18;
        const totalCalls = totalStudents * callsPerStudent;
        
        logger.debug(`📞 Calculando llamadas: ${totalStudents} estudiantes × ${callsPerStudent} llamadas = ${totalCalls} total`);

        let schoolCredit = await prisma.schoolCredit.findFirst({
          where: { organizationId: user.organizationId!, isActive: true },
        });

        if (schoolCredit) {
          schoolCredit = await prisma.schoolCredit.update({
            where: { id: schoolCredit.id },
            data: {
              totalPurchased: schoolCredit.totalPurchased + totalCalls,
              totalPaid: schoolCredit.totalPaid + finalAmount,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              updatedAt: new Date(),
            },
          });
        } else {
          schoolCredit = await prisma.schoolCredit.create({
            data: {
              organizationId: user.organizationId!,
              planType: 'STANDARD',
              totalPurchased: totalCalls,
              totalAllocated: 0,
              unitPrice: finalAmount > 0 ? finalAmount / totalCalls : 0,
              totalPaid: finalAmount,
              expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
              isActive: true,
              notes: `Llamadas de mentoría (código ${codigoAcceso.codigo}) - Orden ${orderId}`,
              updatedAt: new Date(),
            },
          });
        }

        return NextResponse.json({
          success: true,
          order: updatedOrder,
          mentorsAssigned: mentorAssignments.length,
          callsCredits: totalCalls,
          codeUsed: codigoAcceso.codigo,
          message: 'Pago con código procesado, mentores asignados y llamadas acreditadas',
        });
      }

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        codeUsed: codigoAcceso.codigo,
        message: 'Pago con código procesado exitosamente',
      });
    }

    // 🔵 SI ES STRIPE, CREAR SESIÓN DE CHECKOUT REAL
    if (paymentMethod === 'stripe') {
      logger.debug('🔵 [CHECKOUT] Verificando pasarela de pago de la PLATAFORMA...');
      
      // Obtener pasarela de pago de la PLATAFORMA (no de la organización)
      // porque la organización le paga a la plataforma
      const gateway = await getPaymentGateway(null, 'stripe');
      
      if (!gateway) {
        logger.debug('❌ [CHECKOUT] No hay pasarela Stripe configurada en la plataforma');
        return NextResponse.json({
          error: 'Stripe no está configurado en la plataforma. Contacta al administrador.',
        }, { status: 503 });
      }

      logger.debug('🔵 [CHECKOUT] Creando sesión de Stripe Checkout...');
      
      try {
        const stripe = new Stripe(gateway.secretKey, { apiVersion: '2024-06-20' });

        const checkoutSession = await stripe.checkout.sessions.create({
          payment_method_types: ['card'],
          line_items: [
            {
              price_data: {
                currency: 'mxn',
                product_data: {
                  name: `Mentorías - ${existingPaymentData.visionName || 'Visión'}`,
                  description: `${existingPaymentData.totalStudents || order.quantity} estudiantes × 18 llamadas`,
                },
                unit_amount: Math.round(order.amount * 100), // Stripe usa centavos
              },
              quantity: 1,
            },
          ],
          mode: 'payment',
          success_url: `${process.env.NEXTAUTH_URL}/api/school-admin/visiones/stripe-success?session_id={CHECKOUT_SESSION_ID}&orderId=${orderId}`,
          cancel_url: `${process.env.NEXTAUTH_URL}/dashboard/school-admin/visiones/payment?orderId=${orderId}&payment=cancelled`,
          metadata: {
            orderId: orderId,
            visionId: existingPaymentData.visionId?.toString() || '',
            userId: user.id.toString(),
            organizationId: user.organizationId?.toString() || '',
          },
        });

        logger.debug('✅ [CHECKOUT] Sesión de Stripe creada:', checkoutSession.id);

        return NextResponse.json({
          success: true,
          requiresRedirect: true,
          checkoutUrl: checkoutSession.url,
          sessionId: checkoutSession.id,
        });
      } catch (stripeError: any) {
        logger.error('❌ [CHECKOUT] Error de Stripe:', stripeError);
        return NextResponse.json({
          error: 'Error al crear sesión de pago con Stripe',
          details: stripeError.message,
        }, { status: 500 });
      }
    }

    // 🟢 SI ES MERCADOPAGO, CREAR PREFERENCIA DE PAGO
    if (paymentMethod === 'mercadopago') {
      logger.debug('🟢 [CHECKOUT] Verificando pasarela de MercadoPago...');
      
      // Obtener pasarela de pago de la plataforma
      const gateway = await getPaymentGateway(null, 'mercadopago');
      
      if (!gateway) {
        logger.debug('❌ [CHECKOUT] No hay pasarela de MercadoPago configurada');
        return NextResponse.json({
          error: 'MercadoPago no está configurado. Contacta al administrador.',
        }, { status: 503 });
      }

      if (gateway.provider !== 'mercadopago') {
        return NextResponse.json({
          error: `La pasarela configurada es ${gateway.provider.toUpperCase()}, no MercadoPago`,
        }, { status: 400 });
      }

      logger.debug('🟢 [CHECKOUT] Creando preferencia de MercadoPago...');
      
      try {
        const { MercadoPagoConfig, Preference } = require('mercadopago');
        const client = new MercadoPagoConfig({ accessToken: gateway.secretKey });
        const preference = new Preference(client);

        const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
        
        const preferenceData = await preference.create({
          body: {
            items: [
              {
                id: `mentorias-${orderId.slice(0, 8)}`,
                title: `Mentorías - ${existingPaymentData.visionName || 'Visión'}`,
                description: `${existingPaymentData.totalStudents || order.quantity} estudiantes × 18 llamadas`,
                quantity: 1,
                unit_price: order.amount,
                currency_id: 'MXN',
              },
            ],
            back_urls: {
              success: `${baseUrl}/api/school-admin/visiones/mp-success?orderId=${orderId}`,
              failure: `${baseUrl}/dashboard/school-admin/visiones/payment?orderId=${orderId}&payment=failed`,
              pending: `${baseUrl}/dashboard/school-admin/visiones/payment?orderId=${orderId}&payment=pending`,
            },
            auto_return: 'approved',
            external_reference: orderId,
            metadata: {
              orderId: orderId,
              visionId: existingPaymentData.visionId?.toString() || '',
              userId: user.id.toString(),
              organizationId: user.organizationId?.toString() || '',
            },
          },
        });

        // Determinar si usar sandbox o producción
        const isTest = gateway.secretKey.startsWith('TEST-');
        const paymentUrl = isTest 
          ? (preferenceData.sandbox_init_point || preferenceData.init_point)
          : preferenceData.init_point;

        logger.debug('✅ [CHECKOUT] Preferencia de MercadoPago creada:', preferenceData.id);

        return NextResponse.json({
          success: true,
          requiresRedirect: true,
          checkoutUrl: paymentUrl,
          preferenceId: preferenceData.id,
        });
      } catch (mpError: any) {
        logger.error('❌ [CHECKOUT] Error de MercadoPago:', mpError);
        return NextResponse.json({
          error: 'Error al crear sesión de pago con MercadoPago',
          details: mpError.message,
        }, { status: 500 });
      }
    }

    // Para PayPal (por implementar)
    if (paymentMethod === 'paypal') {
      return NextResponse.json({
        error: 'PayPal aún no está implementado completamente',
      }, { status: 501 });
    }

    return NextResponse.json({
      error: 'Método de pago no válido',
    }, { status: 400 });
  } catch (error: any) {
    logger.error('❌ [CHECKOUT] Error general:', error);
    return NextResponse.json({
      error: 'Error al procesar el pago',
      details: error.message,
    }, { status: 500 });
  }
}
