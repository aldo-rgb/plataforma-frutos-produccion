import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getPaymentGateway } from '@/lib/payment-gateway';
import Stripe from 'stripe';
import { Decimal } from '@prisma/client/runtime/library';
import { EventRegistrationStatus, AmbassadorProductType } from '@prisma/client';

// Tasa de comisión para talleres: 20%
const WORKSHOP_COMMISSION_RATE = 0.20;

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
        const tempPassword = Math.random().toString(36).slice(-8);
        const hashedPassword = await bcrypt.hash(tempPassword, 10);
        
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

      // TODO: Procesar factura si requiresInvoice es true
      if (registration.requiresInvoice) {
        console.log('📄 Usuario requiere factura - Datos:', {
          rfc: registration.invoiceRfc,
          name: registration.invoiceName,
          zipCode: registration.invoiceZipCode,
          regime: registration.invoiceRegime,
          cfdiUse: registration.invoiceCfdiUse,
        });
        // Aquí iría la llamada a createInvoice() cuando esté listo
      }

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
              const tempPassword = Math.random().toString(36).slice(-8);
              const hashedPassword = await bcrypt.hash(tempPassword, 10);
              
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
                const tempPassword = Math.random().toString(36).slice(-8);
                const hashedPassword = await bcrypt.hash(tempPassword, 10);
                
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
