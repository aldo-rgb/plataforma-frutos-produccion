import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Forzar que esta ruta sea dinámica (sin caché)
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// GET - Obtener configuración de pasarela de pagos (soporta múltiples proveedores)
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

    // Obtener la organización con TODAS sus configuraciones de gateway
    const organization = await prisma.organization.findUnique({
      where: { id: usuario.organizationId },
      select: {
        id: true,
        name: true,
        bankName: true,
        bankAccountClabe: true,
        bankAccountHolder: true,
        bankAccountNumber: true,
        transferWhatsappNumber: true,
        PaymentGatewayConfigs: true, // Ahora es plural - múltiples configuraciones
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    const configs = organization.PaymentGatewayConfigs || [];

    // Ocultar la secretKey parcialmente por seguridad en cada config
    const safeConfigs = configs.map(config => ({
      id: config.id,
      provider: config.provider,
      publicKey: config.publicKey,
      secretKey: config.secretKey ? maskSecret(config.secretKey) : null,
      webhookSecret: config.webhookSecret ? maskSecret(config.webhookSecret) : null,
      isActive: config.isActive,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    }));

    // Para retrocompatibilidad, también enviar el primer config activo como "config"
    const firstActiveConfig = safeConfigs.find(c => c.isActive) || safeConfigs[0] || null;

    const response = NextResponse.json({
      success: true,
      config: firstActiveConfig, // Retrocompatibilidad
      configs: safeConfigs, // Nuevo: array de todas las configuraciones
      organizationName: organization.name,
      bankConfig: {
        bankName: organization.bankName || '',
        bankAccountClabe: organization.bankAccountClabe || '',
        bankAccountHolder: organization.bankAccountHolder || '',
        bankAccountNumber: organization.bankAccountNumber || '',
        transferWhatsappNumber: organization.transferWhatsappNumber || '',
      },
    });
    
    // Prevenir caché del navegador
    response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    response.headers.set('Pragma', 'no-cache');
    
    return response;
  } catch (error) {
    logger.error('Error fetching payment gateway config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST/PUT - Crear o actualizar configuración de pasarela de pagos (por proveedor)
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

    // Log detallado para debug
    logger.debug('🔵 [payment-gateway] POST body recibido:', JSON.stringify({
      provider: provider || 'undefined',
      publicKeyLen: publicKey?.length || 0,
      secretKeyLen: secretKey?.length || 0,
      secretKeyFirst4: secretKey?.substring(0, 4) || 'N/A',
      secretKeyHasAsterisk: secretKey?.includes('*') || false,
      isActive: isActive,
    }));

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

    // Verificar si ya existe una configuración para este proveedor específico
    const existingConfig = await prisma.paymentGatewayConfig.findUnique({
      where: { 
        organizationId_provider: {
          organizationId,
          provider,
        }
      },
    });

    let config;

    if (existingConfig) {
      // Actualizar configuración existente para este proveedor
      // Solo actualizar secretKey si se proporciona una nueva (no enmascarada)
      const updateData: any = {
        publicKey,
        isActive: isActive !== undefined ? isActive : true,
      };

      // Solo actualizar secretKey si no está enmascarada (contiene asteriscos)
      if (secretKey && !secretKey.includes('*')) {
        updateData.secretKey = secretKey;
        logger.debug('🟢 [payment-gateway] Actualizando secretKey (nueva credencial)');
      } else {
        logger.debug('🟡 [payment-gateway] Manteniendo secretKey existente (valor enmascarado)');
      }

      // Solo actualizar webhookSecret si no está enmascarado
      if (webhookSecret && !webhookSecret.includes('*')) {
        updateData.webhookSecret = webhookSecret;
      }

      logger.debug('🔵 [payment-gateway] updateData keys:', Object.keys(updateData));

      config = await prisma.paymentGatewayConfig.update({
        where: { id: existingConfig.id },
        data: updateData,
      });
      
      logger.debug('🟢 [payment-gateway] Config actualizada, id:', config.id);
    } else {
      // Crear nueva configuración para este proveedor
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
      
      logger.debug('🟢 [payment-gateway] Nueva config creada para proveedor:', provider);
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
    logger.error('Error saving payment gateway config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// DELETE - Eliminar configuración de pasarela de pagos (por proveedor específico)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el proveedor a eliminar de query params
    const { searchParams } = new URL(request.url);
    const provider = searchParams.get('provider');

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

    // Si se especifica un proveedor, eliminar solo ese
    if (provider) {
      const existingConfig = await prisma.paymentGatewayConfig.findUnique({
        where: { 
          organizationId_provider: {
            organizationId: usuario.organizationId,
            provider,
          }
        },
      });

      if (!existingConfig) {
        return NextResponse.json({ error: `No hay configuración de ${provider} para eliminar` }, { status: 404 });
      }

      await prisma.paymentGatewayConfig.delete({
        where: { id: existingConfig.id },
      });

      return NextResponse.json({
        success: true,
        message: `Configuración de ${provider} eliminada`,
      });
    }

    // Si no se especifica proveedor, eliminar todas las configuraciones (para retrocompatibilidad)
    const deletedCount = await prisma.paymentGatewayConfig.deleteMany({
      where: { organizationId: usuario.organizationId },
    });

    if (deletedCount.count === 0) {
      return NextResponse.json({ error: 'No hay configuración para eliminar' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      message: `${deletedCount.count} configuración(es) eliminada(s)`,
    });
  } catch (error) {
    logger.error('Error deleting payment gateway config:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Función para enmascarar secretos
function maskSecret(secret: string): string {
  if (!secret || secret.length < 8) return '****';
  return secret.substring(0, 4) + '*'.repeat(secret.length - 8) + secret.substring(secret.length - 4);
}
