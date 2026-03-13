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
    const { sessionId, registrationId } = body;

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

            // Actualizar registro como pagado
            await prisma.eventRegistration.update({
              where: { id: registration.id },
              data: {
                status: EventRegistrationStatus.REGISTERED,
                paymentStatus: 'PAID',
                paymentProvider: 'stripe',
                paymentSessionId: sessionId,
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

            // Procesar comisión si fue invitado por alguien graduado
            if (inviterInfo?.isGraduated && amountPaid > 0) {
              const commissionAmount = amountPaid * WORKSHOP_COMMISSION_RATE;
              
              // Buscar al usuario que pagó
              const payerUser = await prisma.usuario.findUnique({
                where: { email: registration.email },
                select: { id: true }
              });

              if (payerUser) {
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
              }
            });
          }
        } catch (stripeError) {
          console.error('Error verifying Stripe payment:', stripeError);
        }
      }
    }

    // Si llegamos aquí y el pago no se verificó, verificar el estado actual
    // Esto es para MercadoPago que usa webhooks
    if (registration.status === EventRegistrationStatus.REGISTERED) {
      return NextResponse.json({
        success: true,
        data: {
          eventName: registration.SchoolProduct.name,
          userName: registration.nombre,
          userEmail: registration.email,
          startDate: registration.SchoolProduct.startDate,
          location: registration.SchoolProduct.location,
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
