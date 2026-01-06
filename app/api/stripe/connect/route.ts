import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', {
  apiVersion: '2024-12-18.acacia',
});

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        Organization_Organization_schoolAdminIdToUsuario: true,
      }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const organization = user.Organization_Organization_schoolAdminIdToUsuario;
    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // Verificar si ya tiene cuenta de Stripe Connect
    let stripeConfig = await prisma.stripeConnectConfig.findUnique({
      where: { organizationId: organization.id },
    });

    let accountId: string;

    if (stripeConfig) {
      accountId = stripeConfig.stripeAccountId;
    } else {
      // Crear cuenta de Stripe Connect
      const account = await stripe.accounts.create({
        type: 'express',
        country: 'MX',
        email: user.email,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_type: 'individual',
        business_profile: {
          name: organization.name,
          url: `https://plataforma-frutos.com/org/${organization.slug}`,
        },
      });

      accountId = account.id;

      // Guardar configuración
      stripeConfig = await prisma.stripeConnectConfig.create({
        data: {
          organizationId: organization.id,
          stripeAccountId: accountId,
          accountStatus: 'pending',
          platformFeePercent: 1.0,
        },
      });
    }

    // Crear link de onboarding
    const accountLink = await stripe.accountLinks.create({
      account: accountId,
      refresh_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finances/stripe/refresh`,
      return_url: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/finances/stripe/success`,
      type: 'account_onboarding',
    });

    return NextResponse.json({
      success: true,
      url: accountLink.url,
      accountId,
    });
  } catch (error) {
    console.error('Error en Stripe Connect:', error);
    return NextResponse.json(
      { error: 'Error al conectar con Stripe' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        Organization_Organization_schoolAdminIdToUsuario: true,
      }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const organization = user.Organization_Organization_schoolAdminIdToUsuario;
    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const stripeConfig = await prisma.stripeConnectConfig.findUnique({
      where: { organizationId: organization.id },
    });

    if (!stripeConfig) {
      return NextResponse.json({ connected: false });
    }

    // Obtener estado actual de la cuenta
    const account = await stripe.accounts.retrieve(stripeConfig.stripeAccountId);

    // Actualizar estado en base de datos
    await prisma.stripeConnectConfig.update({
      where: { id: stripeConfig.id },
      data: {
        chargesEnabled: account.charges_enabled,
        payoutsEnabled: account.payouts_enabled,
        detailsSubmitted: account.details_submitted,
        onboardingCompleted: account.details_submitted && account.charges_enabled,
        accountStatus: account.charges_enabled ? 'active' : 'pending',
      },
    });

    return NextResponse.json({
      connected: true,
      accountId: stripeConfig.stripeAccountId,
      chargesEnabled: account.charges_enabled,
      payoutsEnabled: account.payouts_enabled,
      detailsSubmitted: account.details_submitted,
      platformFeePercent: stripeConfig.platformFeePercent,
    });
  } catch (error) {
    console.error('Error obteniendo estado de Stripe:', error);
    return NextResponse.json(
      { error: 'Error al obtener estado' },
      { status: 500 }
    );
  }
}
