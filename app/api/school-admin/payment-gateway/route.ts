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

    // Solo SCHOOL_ADMIN o ADMINISTRADOR puede acceder
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN'];
    if (!allowedRoles.includes(session.user.rol)) {
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

    // Permitir SCHOOL_ADMIN y ADMINISTRADOR
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN'];
    if (!allowedRoles.includes(session.user.rol)) {
      logger.error('🔴 [payment-gateway] Rol no autorizado:', session.user.rol);
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    let body;
    try {
      body = await request.json();
      logger.debug('🔵 [payment-gateway] Body parseado OK');
    } catch (parseError: any) {
      logger.error('🔴 [payment-gateway] Error parseando body:', parseError?.message);
      return NextResponse.json({ error: 'Error en formato de datos' }, { status: 400 });
    }
    
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

    logger.debug('🔵 [payment-gateway] organizationId:', organizationId, 'provider:', provider);

    let config;

    // Función para detectar si un valor está enmascarado
    const isMaskedValue = (value: string | null | undefined): boolean => {
      if (!value) return true;
      // Detectar asteriscos, puntos de contraseña (•), o si el valor es mayormente caracteres repetidos
      if (value.includes('*') || value.includes('•') || value.includes('·')) return true;
      // Si más del 50% son el mismo carácter, probablemente está enmascarado
      const chars = value.split('');
      const charCount = chars.reduce((acc, char) => {
        acc[char] = (acc[char] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);
      const maxCount = Math.max(...Object.values(charCount));
      if (maxCount > value.length * 0.5 && value.length > 10) return true;
      return false;
    };

    // Preparar datos para create/update
    const createData = {
      organizationId,
      provider,
      publicKey: publicKey || null,
      secretKey: secretKey || null,
      webhookSecret: webhookSecret || null,
      isActive: isActive !== undefined ? isActive : true,
    };

    const updateData: any = {
      publicKey,
      isActive: isActive !== undefined ? isActive : true,
      updatedAt: new Date(),
    };

    // Solo actualizar secretKey si no está enmascarada
    if (secretKey && !isMaskedValue(secretKey)) {
      updateData.secretKey = secretKey;
      logger.debug('🟢 [payment-gateway] Actualizando secretKey (nueva credencial)');
    } else {
      logger.debug('🟡 [payment-gateway] Manteniendo secretKey existente (valor enmascarado o vacío)');
    }

    // Solo actualizar webhookSecret si no está enmascarado
    if (webhookSecret && !isMaskedValue(webhookSecret)) {
      updateData.webhookSecret = webhookSecret;
    }

    logger.debug('🔵 [payment-gateway] Usando upsert para organizationId:', organizationId, 'provider:', provider);

    // Usar upsert que es atómico y más confiable
    try {
      config = await prisma.paymentGatewayConfig.upsert({
        where: {
          organizationId_provider: {
            organizationId,
            provider,
          },
        },
        create: createData,
        update: updateData,
      });
      
      logger.debug('🟢 [payment-gateway] Upsert exitoso, id:', config.id);
    } catch (upsertError: any) {
      logger.error('🔴 [payment-gateway] Error en upsert:', upsertError?.message);
      logger.error('🔴 [payment-gateway] Code:', upsertError?.code);
      
      // Si falla el upsert con índice compuesto, intentar con findFirst + create/update
      if (upsertError?.code === 'P2002' || upsertError?.message?.includes('Unique constraint')) {
        logger.debug('🟡 [payment-gateway] Fallback: usando findFirst + update');
        
        const existing = await prisma.paymentGatewayConfig.findFirst({
          where: { organizationId, provider },
        });
        
        if (existing) {
          config = await prisma.paymentGatewayConfig.update({
            where: { id: existing.id },
            data: updateData,
          });
          logger.debug('🟢 [payment-gateway] Fallback update exitoso');
        } else {
          // Si realmente no existe, crear sin índice compuesto
          config = await prisma.paymentGatewayConfig.create({
            data: createData,
          });
          logger.debug('🟢 [payment-gateway] Fallback create exitoso');
        }
      } else {
        throw upsertError;
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración guardada exitosamente',
      config: {
        id: config.id,
        provider: config.provider,
        publicKey: config.publicKey,
        secretKey: maskSecret(config.secretKey || ''),
        webhookSecret: config.webhookSecret ? maskSecret(config.webhookSecret) : null,
        isActive: config.isActive,
      },
    });
  } catch (error: any) {
    logger.error('🔴 [payment-gateway] Error saving config:', error?.message || error);
    logger.error('🔴 [payment-gateway] Error name:', error?.name);
    logger.error('🔴 [payment-gateway] Error code:', error?.code);
    logger.error('🔴 [payment-gateway] Stack:', error?.stack);
    
    // Errores específicos de Prisma
    if (error?.code === 'P2002') {
      // Unique constraint violation - intentar hacer update en vez de crear
      logger.debug('🟡 [payment-gateway] P2002 detectado, intentando upsert...');
      
      try {
        // Buscar el registro que causa el conflicto
        const conflictConfig = await prisma.paymentGatewayConfig.findFirst({
          where: { organizationId: error?.meta?.target?.[0] === 'organizationId' ? undefined : undefined }
        });
        
        if (conflictConfig) {
          logger.debug('🔵 [payment-gateway] Encontrado conflicto, actualizando id:', conflictConfig.id);
        }
      } catch (e) {
        // Ignorar error secundario
      }
      
      return NextResponse.json({ 
        error: 'Error de constraint único. Por favor intenta de nuevo.',
        code: 'P2002'
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error?.message || 'Unknown error'
    }, { status: 500 });
  }
}

// DELETE - Eliminar configuración de pasarela de pagos (por proveedor específico)
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const allowedRolesDelete = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN'];
    if (!allowedRolesDelete.includes(session.user.rol)) {
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
