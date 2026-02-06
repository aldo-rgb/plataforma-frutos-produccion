import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden acceder' },
        { status: 403 }
      );
    }

    // Buscar configuración existente
    const config = await prisma.paymentSettings.findFirst({
      orderBy: { updatedAt: 'desc' },
    });

    // Si no existe, devolver valores por defecto
    const settings = config ? config.settings : {
      bankName: 'BBVA',
      accountNumber: '0123456789',
      clabe: '012345678901234567',
      beneficiary: 'Frutos del Espíritu A.C.',
      stripePublicKey: '',
      stripeSecretKey: '',
      stripeEnabled: false,
      paypalClientId: '',
      paypalClientSecret: '',
      paypalEnabled: false,
      mercadoPagoPublicKey: '',
      mercadoPagoAccessToken: '',
      mercadoPagoEnabled: false,
    };

    return NextResponse.json({
      success: true,
      settings,
    });
  } catch (error: any) {
    logger.error('Error fetching payment settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json(
        { success: false, error: 'Solo administradores pueden modificar' },
        { status: 403 }
      );
    }

    const settings = await req.json();

    // Guardar o actualizar configuración
    const config = await prisma.paymentSettings.upsert({
      where: { id: 1 }, // Siempre usa el mismo ID para tener un solo registro
      update: {
        settings,
        updatedAt: new Date(),
      },
      create: {
        id: 1,
        settings,
      },
    });

    logger.debug('✅ Configuración de pagos actualizada');

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
    });
  } catch (error: any) {
    logger.error('❌ Error saving payment settings:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
