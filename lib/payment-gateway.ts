import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export type PaymentProvider = 'stripe' | 'paypal' | 'mercadopago';

export interface PaymentGatewayCredentials {
  provider: PaymentProvider;
  publicKey: string | null;
  secretKey: string;
  webhookSecret?: string | null;
  source: 'organization' | 'platform';
}

interface PlatformPaymentSettings {
  stripeEnabled?: boolean;
  stripePublicKey?: string;
  stripeSecretKey?: string;
  paypalEnabled?: boolean;
  paypalClientId?: string;
  paypalClientSecret?: string;
  mercadoPagoEnabled?: boolean;
  mercadoPagoPublicKey?: string;
  mercadoPagoAccessToken?: string;
}

/**
 * Obtiene las credenciales de pasarela de pago para una organización
 * 
 * Orden de prioridad:
 * 1. PaymentGatewayConfig de la organización
 * 2. PaymentSettings de la plataforma (fallback global)
 * 
 * @param organizationId - ID de la organización
 * @param preferredProvider - Proveedor preferido (opcional)
 * @returns Credenciales de la pasarela o null si no hay configuración
 */
export async function getPaymentGateway(
  organizationId: number | null | undefined,
  preferredProvider?: PaymentProvider
): Promise<PaymentGatewayCredentials | null> {
  try {
    // 1. Intentar obtener configuración de la organización
    if (organizationId) {
      const orgConfig = await prisma.paymentGatewayConfig.findUnique({
        where: { organizationId },
      });

      if (orgConfig && orgConfig.isActive && orgConfig.secretKey) {
        logger.debug(`✅ Usando pasarela de organización ${organizationId}: ${orgConfig.provider}`);
        return {
          provider: orgConfig.provider.toLowerCase() as PaymentProvider,
          publicKey: orgConfig.publicKey,
          secretKey: orgConfig.secretKey,
          webhookSecret: orgConfig.webhookSecret,
          source: 'organization',
        };
      }
    }

    // 2. Fallback: Configuración de la plataforma
    const platformSettings = await prisma.paymentSettings.findFirst({
      orderBy: { createdAt: 'desc' },
    });

    if (!platformSettings?.settings) {
      logger.warn('⚠️ No hay configuración de pasarela de pago disponible');
      return null;
    }

    const settings: PlatformPaymentSettings = 
      typeof platformSettings.settings === 'string' 
        ? JSON.parse(platformSettings.settings) 
        : platformSettings.settings as PlatformPaymentSettings;

    // Determinar qué proveedor usar según preferencia o disponibilidad
    if (preferredProvider === 'stripe' || (!preferredProvider && settings.stripeEnabled)) {
      if (settings.stripeEnabled && settings.stripeSecretKey) {
        logger.debug('✅ Usando Stripe de configuración de plataforma');
        return {
          provider: 'stripe',
          publicKey: settings.stripePublicKey || null,
          secretKey: settings.stripeSecretKey,
          source: 'platform',
        };
      }
    }

    if (preferredProvider === 'paypal' || (!preferredProvider && settings.paypalEnabled)) {
      if (settings.paypalEnabled && settings.paypalClientSecret) {
        logger.debug('✅ Usando PayPal de configuración de plataforma');
        return {
          provider: 'paypal',
          publicKey: settings.paypalClientId || null,
          secretKey: settings.paypalClientSecret,
          source: 'platform',
        };
      }
    }

    if (preferredProvider === 'mercadopago' || (!preferredProvider && settings.mercadoPagoEnabled)) {
      if (settings.mercadoPagoEnabled && settings.mercadoPagoAccessToken) {
        logger.debug('✅ Usando MercadoPago de configuración de plataforma');
        return {
          provider: 'mercadopago',
          publicKey: settings.mercadoPagoPublicKey || null,
          secretKey: settings.mercadoPagoAccessToken,
          source: 'platform',
        };
      }
    }

    // Si se solicitó un proveedor específico pero no está disponible
    if (preferredProvider) {
      logger.warn(`⚠️ Proveedor ${preferredProvider} solicitado pero no configurado`);
      return null;
    }

    // Intentar cualquier proveedor disponible
    if (settings.stripeEnabled && settings.stripeSecretKey) {
      return {
        provider: 'stripe',
        publicKey: settings.stripePublicKey || null,
        secretKey: settings.stripeSecretKey,
        source: 'platform',
      };
    }

    if (settings.mercadoPagoEnabled && settings.mercadoPagoAccessToken) {
      return {
        provider: 'mercadopago',
        publicKey: settings.mercadoPagoPublicKey || null,
        secretKey: settings.mercadoPagoAccessToken,
        source: 'platform',
      };
    }

    if (settings.paypalEnabled && settings.paypalClientSecret) {
      return {
        provider: 'paypal',
        publicKey: settings.paypalClientId || null,
        secretKey: settings.paypalClientSecret,
        source: 'platform',
      };
    }

    logger.warn('⚠️ No hay ninguna pasarela de pago habilitada');
    return null;
  } catch (error) {
    logger.error('Error obteniendo configuración de pasarela:', error);
    return null;
  }
}

/**
 * Obtiene instancia de Stripe configurada para una organización
 * @param organizationId - ID de la organización
 * @returns Instancia de Stripe o null
 */
export async function getStripeInstance(organizationId: number | null | undefined): Promise<any> {
  const gateway = await getPaymentGateway(organizationId, 'stripe');
  
  if (!gateway || gateway.provider !== 'stripe') {
    return null;
  }

  const Stripe = require('stripe');
  return new Stripe(gateway.secretKey, {
    apiVersion: '2024-06-20',
  });
}

/**
 * Obtiene instancia de MercadoPago configurada para una organización
 * @param organizationId - ID de la organización
 * @returns Configuración de MercadoPago o null
 */
export async function getMercadoPagoConfig(organizationId: number | null | undefined): Promise<any> {
  const gateway = await getPaymentGateway(organizationId, 'mercadopago');
  
  if (!gateway || gateway.provider !== 'mercadopago') {
    return null;
  }

  const { MercadoPagoConfig } = require('mercadopago');
  return new MercadoPagoConfig({ accessToken: gateway.secretKey });
}

/**
 * Verifica si una organización tiene pasarela de pago configurada
 * @param organizationId - ID de la organización
 * @returns true si tiene al menos una pasarela configurada
 */
export async function hasPaymentGateway(organizationId: number | null | undefined): Promise<boolean> {
  const gateway = await getPaymentGateway(organizationId);
  return gateway !== null;
}

/**
 * Obtiene los métodos de pago disponibles para una organización
 * @param organizationId - ID de la organización
 * @returns Lista de proveedores disponibles
 */
export async function getAvailablePaymentMethods(organizationId: number | null | undefined): Promise<PaymentProvider[]> {
  const methods: PaymentProvider[] = [];

  // Verificar configuración de la organización
  if (organizationId) {
    const orgConfig = await prisma.paymentGatewayConfig.findUnique({
      where: { organizationId },
    });

    if (orgConfig && orgConfig.isActive && orgConfig.secretKey) {
      methods.push(orgConfig.provider.toLowerCase() as PaymentProvider);
      return methods; // Organización solo usa su propia pasarela
    }
  }

  // Fallback: Métodos de la plataforma
  const platformSettings = await prisma.paymentSettings.findFirst({
    orderBy: { createdAt: 'desc' },
  });

  if (platformSettings?.settings) {
    const settings: PlatformPaymentSettings = 
      typeof platformSettings.settings === 'string' 
        ? JSON.parse(platformSettings.settings) 
        : platformSettings.settings as PlatformPaymentSettings;

    if (settings.stripeEnabled && settings.stripeSecretKey) {
      methods.push('stripe');
    }
    if (settings.mercadoPagoEnabled && settings.mercadoPagoAccessToken) {
      methods.push('mercadopago');
    }
    if (settings.paypalEnabled && settings.paypalClientSecret) {
      methods.push('paypal');
    }
  }

  return methods;
}
