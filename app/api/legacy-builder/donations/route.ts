import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16'
});

// POST - Procesar donación
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      campaignId,
      amount,
      donorName,
      donorEmail,
      donorPhone,
      message,
      isAnonymous,
      referralCode, // Código del miembro que refirió
      paymentMethod // 'stripe' o 'mercadopago'
    } = body;

    // Validaciones
    if (!campaignId || !amount || !donorEmail) {
      return NextResponse.json(
        { error: 'campaignId, amount y donorEmail son requeridos' },
        { status: 400 }
      );
    }

    if (amount < 50) {
      return NextResponse.json(
        { error: 'El monto mínimo de donación es $50 MXN' },
        { status: 400 }
      );
    }

    // Verificar que la campaña existe y está activa
    const campaign = await prisma.legacyCampaign.findFirst({
      where: {
        id: campaignId,
        status: 'ACTIVE'
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            organizationId: true
          }
        },
        vision: {
          select: {
            nombre: true
          }
        }
      }
    });

    if (!campaign) {
      return NextResponse.json(
        { error: 'Campaña no encontrada o no activa' },
        { status: 404 }
      );
    }

    // Buscar miembro referidor si hay código
    let referredById: number | null = null;
    if (referralCode) {
      const referrer = await prisma.legacyCampaignMember.findUnique({
        where: { referralCode: referralCode }
      });
      if (referrer && referrer.campaignId === campaignId) {
        referredById = referrer.id;
      }
    }

    // Crear la donación en estado pendiente
    const donation = await prisma.legacyDonation.create({
      data: {
        campaignId: campaignId,
        donorName: donorName || null,
        donorEmail: donorEmail,
        donorPhone: donorPhone || null,
        amount: amount,
        message: message || null,
        isAnonymous: isAnonymous || false,
        showMessage: !isAnonymous && !!message,
        referredById: referredById,
        paymentMethod: paymentMethod || 'stripe',
        paymentStatus: 'PENDING',
        moneyStatus: 'PENDING'
      }
    });

    // Crear sesión de pago con Stripe
    if (paymentMethod === 'stripe' || !paymentMethod) {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price_data: {
              currency: 'mxn',
              product_data: {
                name: `Donación a ${campaign.title}`,
                description: `Apoyo para: ${campaign.project.title}`,
                images: campaign.coverImage ? [campaign.coverImage] : []
              },
              unit_amount: Math.round(amount * 100) // Stripe usa centavos
            },
            quantity: 1
          }
        ],
        mode: 'payment',
        success_url: `${process.env.NEXT_PUBLIC_APP_URL}/legado/${campaign.slug}/gracias?donationId=${donation.id}`,
        cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/legado/${campaign.slug}`,
        customer_email: donorEmail,
        metadata: {
          donationId: donation.id.toString(),
          campaignId: campaignId.toString(),
          type: 'legacy_donation'
        }
      });

      // Actualizar donación con ID de Stripe
      await prisma.legacyDonation.update({
        where: { id: donation.id },
        data: {
          paymentId: session.id,
          paymentStatus: 'PROCESSING'
        }
      });

      return NextResponse.json({
        success: true,
        checkoutUrl: session.url,
        donationId: donation.id
      });
    }

    // TODO: Implementar MercadoPago
    return NextResponse.json({
      error: 'Método de pago no implementado'
    }, { status: 400 });

  } catch (error) {
    console.error('Error processing donation:', error);
    return NextResponse.json(
      { error: 'Error procesando la donación' },
      { status: 500 }
    );
  }
}

// GET - Obtener donaciones de una campaña (para página pública)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');

    if (!campaignId) {
      return NextResponse.json(
        { error: 'campaignId requerido' },
        { status: 400 }
      );
    }

    const donations = await prisma.legacyDonation.findMany({
      where: {
        campaignId: parseInt(campaignId),
        paymentStatus: 'COMPLETED'
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
      select: {
        id: true,
        donorName: true,
        amount: true,
        message: true,
        showMessage: true,
        isAnonymous: true,
        createdAt: true
      }
    });

    const total = await prisma.legacyDonation.count({
      where: {
        campaignId: parseInt(campaignId),
        paymentStatus: 'COMPLETED'
      }
    });

    return NextResponse.json({
      donations: donations.map(d => ({
        id: d.id,
        donorName: d.isAnonymous ? 'Donador Anónimo' : d.donorName,
        amount: d.amount,
        message: d.showMessage ? d.message : null,
        createdAt: d.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching donations:', error);
    return NextResponse.json(
      { error: 'Error obteniendo donaciones' },
      { status: 500 }
    );
  }
}
