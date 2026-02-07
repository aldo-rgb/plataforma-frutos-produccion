import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/school-admin/payment-methods
 * Retorna los métodos de pago disponibles desde la configuración de la PLATAFORMA
 * (no de la organización)
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener el usuario y verificar rol
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, organizationId: true, rol: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Usar configuración de la PLATAFORMA (PaymentSettings)
    let methods = {
      stripe: false,
      paypal: false,
      mercadopago: false,
    };

    const platformSettings = await prisma.paymentSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    if (platformSettings?.settings) {
      const settings = typeof platformSettings.settings === 'string'
        ? JSON.parse(platformSettings.settings)
        : platformSettings.settings;

      methods.stripe = !!(settings.stripeEnabled && settings.stripeSecretKey);
      methods.paypal = !!(settings.paypalEnabled && settings.paypalClientSecret);
      methods.mercadopago = !!(settings.mercadoPagoEnabled && settings.mercadoPagoAccessToken);
    }

    return NextResponse.json({
      success: true,
      methods,
      source: 'platform',
    });

  } catch (error: any) {
    logger.error('Error fetching payment methods:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
