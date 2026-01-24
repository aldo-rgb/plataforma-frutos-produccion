import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener configuración de pasarela de pagos
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Solo SCHOOL_ADMIN puede acceder
    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el organizationId del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    // Obtener la organización con su configuración de gateway
    const organization = await prisma.organization.findUnique({
      where: { id: usuario.organizationId },
      include: {
        PaymentGatewayConfig: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const config = organization.PaymentGatewayConfig;

    // Ocultar la secretKey parcialmente por seguridad
    const safeConfig = config ? {
      id: config.id,
      provider: config.provider,
      publicKey: config.publicKey,
      secretKey: config.secretKey ? maskSecret(config.secretKey) : null,
      webhookSecret: config.webhookSecret ? maskSecret(config.webhookSecret) : null,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    } : null;

    return NextResponse.json({
      success: true,
      config: safeConfig,
      organizationName: organization.name,
    });
  } catch (error) {
    console.error('Error fetching payment gateway config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST/PUT - Crear o actualizar configuración de pasarela de pagos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { provider, publicKey, secretKey, webhookSecret, isActive } = body;

    // Validar provider
    const validProviders = ['MERCADOPAGO', 'STRIPE', 'PAYPAL'];
    if (!provider || !validProviders.includes(provider)) {
      return NextResponse.json({ 
        error: 'Proveedor inválido. Debe ser MERCADOPAGO, STRIPE o PAYPAL' 
      }, { status: 400 });
    }

    // Validar que se proporcionen las credenciales necesarias
    if (!publicKey && !secretKey) {
      return NextResponse.json({ 
        error: 'Debe proporcionar al menos la llave pública o secreta' 
      }, { status: 400 });
    }

    // Obtener el organizationId del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    const organizationId = usuario.organizationId;

    // Verificar si ya existe una configuración
    const existingConfig = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId },
    });

    let config;

    if (existingConfig) {
      // Actualizar configuración existente
      // Solo actualizar secretKey si se proporciona una nueva (no enmascarada)
      const updateData: any = {
        provider,
        publicKey,
        isActive: isActive !== undefined ? isActive : true,
      };

      // Solo actualizar secretKey si no está enmascarada (contiene asteriscos)
      if (secretKey && !secretKey.includes('*')) {
        updateData.secretKey = secretKey;
      }

      // Solo actualizar webhookSecret si no está enmascarado
      if (webhookSecret && !webhookSecret.includes('*')) {
        updateData.webhookSecret = webhookSecret;
      }

      config = await prisma.paymentGatewayConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });
    } else {
      // Crear nueva configuración
      config = await prisma.paymentGatewayConfig.create({
        data: {
          organizationId,
          provider,
          publicKey,
          secretKey,
          webhookSecret,
          isActive: isActive !== undefined ? isActive : true,
        },
      });
    }

    return NextResponse.json({
      success: true,
      message: existingConfig ? 'Configuración actualizada' : 'Configuración creada',
      config: {
        id: config.id,
        provider: config.provider,
        publicKey: config.publicKey,
        secretKey: maskSecret(config.secretKey || ''),
        webhookSecret: config.webhookSecret ? maskSecret(config.webhookSecret) : null,
        isActive: config.isActive,
      },
    });
  } catch (error) {
    console.error('Error saving payment gateway config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar configuración de pasarela de pagos
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el organizationId del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        organizationId: true,
      },
    });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    // Verificar si existe la configuración
    const existingConfig = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId: usuario.organizationId },
    });

    if (!existingConfig) {
      return NextResponse.json({ error: 'No hay configuración para eliminar' }, { status: 404 });
    }

    await prisma.paymentGatewayConfig.delete({
      where: { id: existingConfig.id },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración eliminada',
    });
  } catch (error) {
    console.error('Error deleting payment gateway config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función para enmascarar secretos
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
}
