import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentGateway } from '@/lib/payment-gateway';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';
import { EventRegistrationStatus, AmbassadorProductType } from '@prisma/client';
import { createEventInvoice, getFacturapiConfig } from '@/lib/facturapi';
import { sendWelcomeNotifications, DEFAULT_PASSWORD } from '@/lib/welcome-notification';
import logger from '@/lib/logger';

// Tasa de comisión para talleres: 20%
const WORKSHOP_COMMISSION_RATE = 0.20;

// Helper function para procesar facturación
async function processInvoice(registration: any, amountPaid: number, paymentProvider: string) {
  if (!registration.requiresInvoice) return null;
  
  console.log('📄 Procesando factura para registro:', registration.id);
  console.log('📄 Datos de facturación:', {
    requiresInvoice: registration.requiresInvoice,
    invoiceRfc: registration.invoiceRfc,
    invoiceName: registration.invoiceName,
    invoiceRegime: registration.invoiceRegime,
    invoiceZipCode: registration.invoiceZipCode,
    invoiceCfdiUse: registration.invoiceCfdiUse,
  });
  
  // Verificar si Facturapi está configurado para esta organización
  const facturapiConfig = await getFacturapiConfig(registration.organizationId);
  
  if (!facturapiConfig || !facturapiConfig.isActive) {
    console.log('⚠️ Facturapi no configurado para esta organización - factura quedará pendiente');
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { invoiceStatus: 'PENDING' },
    });
    return { status: 'PENDING', message: 'Sistema de facturación no configurado' };
  }

  // Validar RFC (debe tener 12 o 13 caracteres)
  const rfc = registration.invoiceRfc?.trim();
  if (!rfc || rfc.length < 12 || rfc.length > 13) {
    console.log('⚠️ RFC inválido o faltante:', rfc);
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { 
        invoiceStatus: 'ERROR',
        invoiceError: `RFC inválido o faltante. RFC recibido: "${rfc || 'vacío'}" (debe tener 12-13 caracteres)`,
      },
    });
    return { status: 'ERROR', message: 'RFC inválido o faltante' };
  }

  if (!registration.invoiceName) {
    console.log('⚠️ Nombre/Razón social faltante');
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: { 
        invoiceStatus: 'ERROR',
        invoiceError: 'Nombre o razón social faltante',
      },
    });
    return { status: 'ERROR', message: 'Datos de facturación incompletos' };
  }

  try {
    const result = await createEventInvoice({
      registrationId: registration.id,
      organizationId: registration.organizationId,
      rfc: rfc.toUpperCase().replace(/[^A-Z0-9]/g, ''), // RFC limpio y en mayúsculas
      legalName: registration.invoiceName.trim(),
      taxSystem: registration.invoiceRegime || '616',
      zipCode: registration.invoiceZipCode || '00000',
      cfdiUse: registration.invoiceCfdiUse || 'G03',
      productName: registration.SchoolProduct.name,
      amount: amountPaid,
      email: registration.email,
      paymentProvider,
    });

    if (result.success) {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          invoiceId: result.invoiceId,
          invoiceStatus: 'COMPLETED',
          invoicePdfUrl: result.pdfUrl,
          invoiceXmlUrl: result.xmlUrl,
        },
      });
      console.log('✅ Factura generada:', result.invoiceId);
      return { status: 'COMPLETED', invoiceId: result.invoiceId, pdfUrl: result.pdfUrl };
    } else {
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          invoiceStatus: 'ERROR',
          invoiceError: result.error,
        },
      });
      console.log('❌ Error generando factura:', result.error);
      return { status: 'ERROR', message: result.error };
    }
  } catch (error: any) {
    console.error('❌ Error en facturación:', error);
    await prisma.eventRegistration.update({
      where: { id: registration.id },
      data: {
        invoiceStatus: 'ERROR',
        invoiceError: error.message || 'Error interno al generar factura',
      },
    });
    return { status: 'ERROR', message: error.message };
  }
}

// POST - Verificar pago y actualizar registro
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
    const { sessionId, registrationId, simulatePayment } = body;

    if (!registrationId) {
      return NextResponse.json(
        { success: false, error: 'ID de registro requerido' },
        { status: 400 }
      );
    }

    // Buscar el registro con relaciones
    const registration = await prisma.eventRegistration.findUnique({
      where: { id: parseInt(registrationId) },
      include: {
        SchoolProduct: {
          select: {
            id: true,
            name: true,
            startDate: true,
            location: true,
            organizationId: true,
            basePrice: true,
            promoPrice: true,
            type: true,
            visionId: true,
            imageUrl: true,
          }
        },
      }
    });

    if (!registration) {
      return NextResponse.json(
        { success: false, error: 'Registro no encontrado' },
        { status: 404 }
      );
    }

    // Si ya está pagado (REGISTERED), devolver éxito
    if (registration.status === EventRegistrationStatus.REGISTERED) {
      return NextResponse.json({
        success: true,
        data: {
          eventName: registration.SchoolProduct.name,
          userName: registration.nombre,
          userEmail: registration.email,
          startDate: registration.SchoolProduct.startDate,
          location: registration.SchoolProduct.location,
          ticketCode: registration.ticketCode,
          productImage: registration.SchoolProduct.imageUrl,
        }
      });
    }

    // Buscar quien invitó
    let inviterInfo = null;
    if (registration.invitedByUserId) {
      inviterInfo = await prisma.usuario.findUnique({
        where: { id: registration.invitedByUserId },
        select: {
          id: true,
          nombre: true,
          referralCode: true,
          isGraduated: true,
        }
      });
    }

    // ======= SIMULACIÓN DE PAGO (SOLO PARA TESTING) =======
    if (simulatePayment) {
      console.log('🧪 SIMULATING PAYMENT for registration:', registrationId);
      
      // Calcular el monto (usar promoPrice si existe, sino basePrice)
      const amountPaid = registration.SchoolProduct.promoPrice 
        ? Number(registration.SchoolProduct.promoPrice) 
        : Number(registration.SchoolProduct.basePrice);

      // ====== CREAR USUARIO SI NO EXISTE ======
      let payerUser = await prisma.usuario.findUnique({
        where: { email: registration.email.toLowerCase() },
        select: { id: true, nombre: true, referralCode: true }
      });

      if (!payerUser) {
        console.log('👤 Creando nuevo usuario para:', registration.email);
        const bcrypt = require('bcryptjs');
        const defaultPassword = 'Quantum123.';
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);
        
        // Generar referralCode único
        const timestamp = Date.now().toString(36).toUpperCase();
        const random = Math.random().toString(36).substring(2, 6).toUpperCase();
        const namePrefix = registration.nombre.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
        const referralCode = `${namePrefix}${timestamp}${random}`;

        payerUser = await prisma.usuario.create({
          data: {
            nombre: registration.nombre,
            email: registration.email.toLowerCase(),
            telefono: registration.telefono || null,
            password: hashedPassword,
            organizationId: registration.organizationId,
            isActive: true,
            rol: 'PARTICIPANTE',
            referralCode,
          },
          select: { id: true, nombre: true, referralCode: true }
        });
        console.log('✅ Usuario creado:', payerUser.id, payerUser.referralCode);
      }

      // Actualizar registro como pagado
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          status: EventRegistrationStatus.REGISTERED,
          paymentStatus: 'PAID',
          paymentProvider: 'test_simulation',
          paymentSessionId: `simulated_${Date.now()}`,
          amountPaid: new Decimal(amountPaid),
          paidAt: new Date(),
        }
      });

      // Incrementar contador de inscritos
      await prisma.schoolProduct.update({
        where: { id: registration.productId },
        data: {
          currentEnrollment: { increment: 1 },
          updatedAt: new Date(),
        }
      });

      // ====== GENERAR TICKET CODE ======
      const ticketCode = `TKT-${registration.id}-${Date.now().toString(36).toUpperCase()}`;
      
      // Actualizar registro con ticketCode y userId
      await prisma.eventRegistration.update({
        where: { id: registration.id },
        data: {
          ticketCode,
          userId: payerUser.id,
        }
      });
      console.log('🎫 Ticket generado:', ticketCode);

      // Procesar comisión si fue invitado por alguien graduado
      if (inviterInfo?.isGraduated && amountPaid > 0) {
        const commissionAmount = amountPaid * WORKSHOP_COMMISSION_RATE;
        
        // Verificar si ya existe la comisión
        const existingCommission = await prisma.ambassador_wallet_transactions.findFirst({
          where: {
            ambassadorId: inviterInfo.id,
            referredUserId: payerUser.id,
            productType: AmbassadorProductType.WORKSHOP,
          }
        });

        if (!existingCommission) {
          // Crear transacción de comisión
          await prisma.ambassador_wallet_transactions.create({
            data: {
              ambassadorId: inviterInfo.id,
              referredUserId: payerUser.id,
              productType: AmbassadorProductType.WORKSHOP,
              saleAmount: new Decimal(amountPaid),
              commissionPercent: new Decimal(WORKSHOP_COMMISSION_RATE),
              commissionAmount: new Decimal(commissionAmount),
              status: 'PENDING',
              notes: `Comisión por invitación a ${registration.SchoolProduct.name} (SIMULADO)`,
            }
          });
          console.log(`✅ Comisión de $${commissionAmount.toFixed(2)} creada para ${inviterInfo.nombre}`);
        } else {
          console.log('⚠️ Comisión ya existía para este referido');
        }
      }

      // Procesar factura si es requerida
      const invoiceResult = await processInvoice(registration, amountPaid, 'simulated');

      return NextResponse.json({
        success: true,
        simulated: true,
        data: {
          eventName: registration.SchoolProduct.name,
          userName: registration.nombre,
          userEmail: registration.email,
          startDate: registration.SchoolProduct.startDate,
          location: registration.SchoolProduct.location,
          amountPaid,
          requiresInvoice: registration.requiresInvoice,
          ticketCode,
          userId: payerUser.id,
          invoice: invoiceResult,
          productImage: registration.SchoolProduct.imageUrl,
        }
      });
    }

    // Verificar el pago con Stripe si hay sessionId
    if (sessionId) {
      const gateway = await getPaymentGateway(
        registration.SchoolProduct.organizationId,
        'stripe'
      );

      if (gateway) {
        // @ts-ignore - Stripe API version mismatch
        const stripe = new Stripe(gateway.secretKey, { apiVersion: '2024-12-18.acacia' });
        
        try {
          const session = await stripe.checkout.sessions.retrieve(sessionId);
          
          if (session.payment_status === 'paid') {
            // Calcular el monto pagado
            const amountPaid = session.amount_total ? session.amount_total / 100 : 0;

            // ====== CREAR USUARIO SI NO EXISTE ======
            let payerUser = await prisma.usuario.findUnique({
              where: { email: registration.email.toLowerCase() },
              select: { id: true, nombre: true, referralCode: true }
            });

            if (!payerUser) {
              console.log('👤 [Stripe] Creando nuevo usuario para:', registration.email);
              const bcrypt = require('bcryptjs');
              const defaultPassword = 'Quantum123.';
              const hashedPassword = await bcrypt.hash(defaultPassword, 10);
              
              // Generar referralCode único
              const timestamp = Date.now().toString(36).toUpperCase();
              const random = Math.random().toString(36).substring(2, 6).toUpperCase();
              const namePrefix = registration.nombre.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
              const referralCode = `${namePrefix}${timestamp}${random}`;

              payerUser = await prisma.usuario.create({
                data: {
                  nombre: registration.nombre,
                  email: registration.email.toLowerCase(),
                  telefono: registration.telefono || null,
                  password: hashedPassword,
                  organizationId: registration.organizationId,
                  isActive: true,
                  rol: 'PARTICIPANTE',
                  referralCode,
                },
                select: { id: true, nombre: true, referralCode: true }
              });
              console.log('✅ [Stripe] Usuario creado:', payerUser.id, payerUser.referralCode);

              // 📱 Enviar WhatsApp de bienvenida con plantilla quantum_confirmar
              const org = await prisma.organization.findUnique({
                where: { id: registration.organizationId },
                select: { name: true }
              });
              
              sendWelcomeNotifications({
                userId: payerUser.id,
                email: registration.email.toLowerCase(),
                telefono: registration.telefono || '',
                nombre: registration.nombre,
                password: defaultPassword,
                organizationName: org?.name || 'Impacto Cuántico',
                visionName: registration.SchoolProduct.name,
              }).catch(err => console.error('Error enviando notificación de bienvenida:', err));
            }

            // ====== GENERAR TICKET CODE ======
            const ticketCode = `TKT-${registration.id}-${Date.now().toString(36).toUpperCase()}`;

            // Actualizar registro como pagado con ticketCode y userId
            await prisma.eventRegistration.update({
              where: { id: registration.id },
              data: {
                status: EventRegistrationStatus.REGISTERED,
                paymentStatus: 'PAID',
                paymentProvider: 'stripe',
                paymentSessionId: sessionId,
                amountPaid: new Decimal(amountPaid),
                paidAt: new Date(),
                ticketCode,
                userId: payerUser.id,
              }
            });
            console.log('🎫 [Stripe] Ticket generado:', ticketCode);

            // Incrementar contador de inscritos
            await prisma.schoolProduct.update({
              where: { id: registration.productId },
              data: {
                currentEnrollment: { increment: 1 },
                updatedAt: new Date(),
              }
            });

            // Procesar comisión si fue invitado por alguien graduado
            if (inviterInfo?.isGraduated && amountPaid > 0) {
              const commissionAmount = amountPaid * WORKSHOP_COMMISSION_RATE;
              
              // Verificar si ya existe la comisión
              const existingCommission = await prisma.ambassador_wallet_transactions.findFirst({
                where: {
                  ambassadorId: inviterInfo.id,
                  referredUserId: payerUser.id,
                  productType: AmbassadorProductType.WORKSHOP,
                }
              });

              if (!existingCommission) {
                // Crear transacción de comisión
                await prisma.ambassador_wallet_transactions.create({
                  data: {
                    ambassadorId: inviterInfo.id,
                    referredUserId: payerUser.id,
                    productType: AmbassadorProductType.WORKSHOP,
                    saleAmount: new Decimal(amountPaid),
                    commissionPercent: new Decimal(WORKSHOP_COMMISSION_RATE),
                    commissionAmount: new Decimal(commissionAmount),
                    status: 'CLEARED',
                    notes: `Comisión por referido: ${registration.nombre} - ${registration.SchoolProduct.name}`,
                    organizationId: registration.organizationId,
                    visionId: registration.SchoolProduct.visionId,
                  }
                });

                // Actualizar balance del embajador
                await prisma.usuario.update({
                  where: { id: inviterInfo.id },
                  data: {
                    ambassadorBalance: { increment: commissionAmount }
                  }
                });
                console.log(`✅ [Stripe] Comisión de $${commissionAmount.toFixed(2)} creada para ${inviterInfo.nombre}`);
              } else {
                console.log('⚠️ [Stripe] Comisión ya existía para este referido');
              }
            }

            // Procesar factura si es requerida
            const invoiceResult = await processInvoice(registration, amountPaid, 'stripe');

            return NextResponse.json({
              success: true,
              data: {
                eventName: registration.SchoolProduct.name,
                userName: registration.nombre,
                userEmail: registration.email,
                startDate: registration.SchoolProduct.startDate,
                location: registration.SchoolProduct.location,
                ticketCode,
                userId: payerUser.id,
                invoice: invoiceResult,
                productImage: registration.SchoolProduct.imageUrl,
              }
            });
          }
        } catch (stripeError) {
          console.error('Error verifying Stripe payment:', stripeError);
        }
      }
    }

    // ====== VERIFICAR PAGO CON MERCADOPAGO ======
    // MercadoPago puede verificarse por el preference_id almacenado
    if (!sessionId && registration.paymentProvider === 'mercadopago' && registration.paymentSessionId) {
      console.log('🔵 [MercadoPago] Verificando pago para registro:', registration.id);
      
      try {
        const gateway = await getPaymentGateway(
          registration.SchoolProduct.organizationId,
          'mercadopago'
        );

        if (gateway) {
          const { MercadoPagoConfig, Payment } = require('mercadopago');
          const client = new MercadoPagoConfig({ accessToken: gateway.secretKey });
          const paymentApi = new Payment(client);

          // Buscar pagos asociados a esta preferencia usando la API de búsqueda
          const searchResponse = await fetch(
            `https://api.mercadopago.com/v1/payments/search?external_reference=${encodeURIComponent(JSON.stringify({ registrationId: registration.id }))}`,
            {
              headers: {
                'Authorization': `Bearer ${gateway.secretKey}`,
                'Content-Type': 'application/json',
              }
            }
          );

          if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            const approvedPayment = searchData.results?.find((p: any) => p.status === 'approved');

            if (approvedPayment) {
              console.log('✅ [MercadoPago] Pago aprobado encontrado:', approvedPayment.id);
              const amountPaid = approvedPayment.transaction_amount || 0;

              // ====== CREAR USUARIO SI NO EXISTE ======
              let payerUser = await prisma.usuario.findUnique({
                where: { email: registration.email.toLowerCase() },
                select: { id: true, nombre: true, referralCode: true }
              });

              if (!payerUser) {
                console.log('👤 [MercadoPago] Creando nuevo usuario para:', registration.email);
                const bcrypt = require('bcryptjs');
                const defaultPassword = 'Quantum123.';
                const hashedPassword = await bcrypt.hash(defaultPassword, 10);
                
                // Generar referralCode único
                const timestamp = Date.now().toString(36).toUpperCase();
                const random = Math.random().toString(36).substring(2, 6).toUpperCase();
                const namePrefix = registration.nombre.substring(0, 3).toUpperCase().replace(/[^A-Z]/g, 'X');
                const referralCode = `${namePrefix}${timestamp}${random}`;

                payerUser = await prisma.usuario.create({
                  data: {
                    nombre: registration.nombre,
                    email: registration.email.toLowerCase(),
                    telefono: registration.telefono || null,
                    password: hashedPassword,
                    organizationId: registration.organizationId,
                    isActive: true,
                    rol: 'PARTICIPANTE',
                    referralCode,
                  },
                  select: { id: true, nombre: true, referralCode: true }
                });
                console.log('✅ [MercadoPago] Usuario creado:', payerUser.id, payerUser.referralCode);

                // 📱 Enviar WhatsApp de bienvenida con plantilla quantum_confirmar
                const org = await prisma.organization.findUnique({
                  where: { id: registration.organizationId },
                  select: { name: true }
                });
                
                sendWelcomeNotifications({
                  userId: payerUser.id,
                  email: registration.email.toLowerCase(),
                  telefono: registration.telefono || '',
                  nombre: registration.nombre,
                  password: defaultPassword,
                  organizationName: org?.name || 'Impacto Cuántico',
                  visionName: registration.SchoolProduct.name,
                }).catch(err => console.error('Error enviando notificación de bienvenida:', err));
              }

              // ====== GENERAR TICKET CODE ======
              const ticketCode = `TKT-${registration.id}-${Date.now().toString(36).toUpperCase()}`;

              // Actualizar registro como pagado
              await prisma.eventRegistration.update({
                where: { id: registration.id },
                data: {
                  status: EventRegistrationStatus.REGISTERED,
                  paymentStatus: 'PAID',
                  amountPaid: new Decimal(amountPaid),
                  paidAt: new Date(),
                  ticketCode,
                  userId: payerUser.id,
                }
              });
              console.log('🎫 [MercadoPago] Ticket generado:', ticketCode);

              // Incrementar contador de inscritos
              await prisma.schoolProduct.update({
                where: { id: registration.productId },
                data: {
                  currentEnrollment: { increment: 1 },
                  updatedAt: new Date(),
                }
              });

              // Procesar comisión si fue invitado por alguien graduado
              if (inviterInfo?.isGraduated && amountPaid > 0) {
                const commissionAmount = amountPaid * WORKSHOP_COMMISSION_RATE;
                
                // Verificar si ya existe la comisión
                const existingCommission = await prisma.ambassador_wallet_transactions.findFirst({
                  where: {
                    ambassadorId: inviterInfo.id,
                    referredUserId: payerUser.id,
                    productType: AmbassadorProductType.WORKSHOP,
                  }
                });

                if (!existingCommission) {
                  await prisma.ambassador_wallet_transactions.create({
                    data: {
                      ambassadorId: inviterInfo.id,
                      referredUserId: payerUser.id,
                      productType: AmbassadorProductType.WORKSHOP,
                      saleAmount: new Decimal(amountPaid),
                      commissionPercent: new Decimal(WORKSHOP_COMMISSION_RATE),
                      commissionAmount: new Decimal(commissionAmount),
                      status: 'CLEARED',
                      notes: `Comisión por referido: ${registration.nombre} - ${registration.SchoolProduct.name}`,
                      organizationId: registration.organizationId,
                      visionId: registration.SchoolProduct.visionId,
                    }
                  });

                  await prisma.usuario.update({
                    where: { id: inviterInfo.id },
                    data: {
                      ambassadorBalance: { increment: commissionAmount }
                    }
                  });
                  console.log(`✅ [MercadoPago] Comisión de $${commissionAmount.toFixed(2)} creada para ${inviterInfo.nombre}`);
                }
              }

              // Procesar factura si es requerida
              const invoiceResult = await processInvoice(registration, amountPaid, 'mercadopago');

              return NextResponse.json({
                success: true,
                data: {
                  eventName: registration.SchoolProduct.name,
                  userName: registration.nombre,
                  userEmail: registration.email,
                  startDate: registration.SchoolProduct.startDate,
                  location: registration.SchoolProduct.location,
                  ticketCode,
                  userId: payerUser.id,
                  invoice: invoiceResult,
                  productImage: registration.SchoolProduct.imageUrl,
                }
              });
            }
          }
        }
      } catch (mpError) {
        console.error('Error verifying MercadoPago payment:', mpError);
      }
    }

    // Si llegamos aquí y el pago no se verificó, verificar el estado actual
    // Esto es para cuando ya se procesó el pago anteriormente
    if (registration.status === EventRegistrationStatus.REGISTERED) {
      return NextResponse.json({
        success: true,
        data: {
          eventName: registration.SchoolProduct.name,
          userName: registration.nombre,
          userEmail: registration.email,
          startDate: registration.SchoolProduct.startDate,
          location: registration.SchoolProduct.location,
          ticketCode: registration.ticketCode,
          userId: registration.userId,
          productImage: registration.SchoolProduct.imageUrl,
        }
      });
    }

    return NextResponse.json(
      { success: false, error: 'El pago no se ha completado' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Error verifying payment:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar el pago' },
      { status: 500 }
    );
  }
}
