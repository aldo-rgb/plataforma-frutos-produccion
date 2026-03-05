import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];

/**
 * GET /api/treasury/organization-prices
 * Obtiene los precios configurados para la organización del usuario
 * Incluye precios base y promocionales para Básico, Avanzado, Liderato y Combos
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    // Buscar usuario para obtener organizationId
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ success: false, error: 'Organización no encontrada' }, { status: 400 });
    }

    // Buscar precios predeterminados para esta organización
    const defaultPrices = await prisma.defaultPrice.findMany({
      where: { organizationId: user.organizationId },
      orderBy: { levelType: 'asc' },
    });

    // Convertir a un objeto más fácil de usar
    const pricesMap: Record<string, {
      basePrice: number;
      promoPrice: number | null;
      promoDeadline: string | null;
      isPromoActive: boolean;
      currency: string;
    }> = {};

    const now = new Date();

    defaultPrices.forEach((p) => {
      const isPromoActive = p.promoPrice !== null && 
        (p.promoDeadline === null || new Date(p.promoDeadline) >= now);
      
      pricesMap[p.levelType] = {
        basePrice: Number(p.basePrice),
        promoPrice: p.promoPrice ? Number(p.promoPrice) : null,
        promoDeadline: p.promoDeadline ? p.promoDeadline.toISOString() : null,
        isPromoActive,
        currency: p.currency || 'MXN',
      };
    });

    // Generar opciones de precios para cada nivel según la lógica de negocio
    // Flujo específico solicitado:
    // - Básico: precio base O combo completo ($27,000)
    // - Avanzado: promo, base, o parcial (para 2 pagos)
    // - Liderato: promo, base, o completar combo avanzado+PL

    const priceOptions = {
      BASIC: generateBasicOptions(pricesMap),
      ADVANCED: generateAdvancedOptions(pricesMap),
      PL: generatePLOptions(pricesMap),
    };

    return NextResponse.json({ 
      success: true, 
      prices: pricesMap,
      priceOptions,
      currency: defaultPrices[0]?.currency || 'MXN'
    });
  } catch (error) {
    logger.error('Error fetching organization prices:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar precios' },
      { status: 500 }
    );
  }
}

/**
 * Genera opciones de precio para nivel BÁSICO
 * Según el requerimiento:
 * - $6,500 (precio base)
 * - $27,000 (combo completo)
 */
function generateBasicOptions(prices: Record<string, any>) {
  const options: { label: string; amount: number; description: string; type: string }[] = [];
  
  // Precio base de Básico
  const basicPrice = prices.BASIC;
  if (basicPrice) {
    // Si hay promo activa, mostrarla primero
    if (basicPrice.isPromoActive && basicPrice.promoPrice) {
      options.push({
        label: `$${formatNumber(basicPrice.promoPrice)} - Básico (Promoción)`,
        amount: basicPrice.promoPrice,
        description: 'Entrenamiento Básico - Precio promocional',
        type: 'BASIC_PROMO'
      });
    }
    // Precio base
    options.push({
      label: `$${formatNumber(basicPrice.basePrice)} - Básico`,
      amount: basicPrice.basePrice,
      description: 'Inscripción Entrenamiento Básico',
      type: 'BASIC'
    });
  }

  // Combo Completo (Básico + Avanzado + PL)
  const comboFull = prices.COMBO_FULL;
  if (comboFull) {
    if (comboFull.isPromoActive && comboFull.promoPrice) {
      options.push({
        label: `$${formatNumber(comboFull.promoPrice)} - Combo Completo (Promoción)`,
        amount: comboFull.promoPrice,
        description: 'Básico + Avanzado + PL con descuento',
        type: 'COMBO_FULL_PROMO'
      });
    }
    options.push({
      label: `$${formatNumber(comboFull.basePrice)} - Combo Completo`,
      amount: comboFull.basePrice,
      description: 'Básico + Avanzado + Liderato (Paquete completo)',
      type: 'COMBO_FULL'
    });
  }

  return options;
}

/**
 * Genera opciones de precio para nivel AVANZADO
 * Según el requerimiento específico:
 * - $7,500 (precio promo)
 * - $9,000 (precio base)  
 * - $1,500 (abono fijo para dividir el pago en 2)
 */
function generateAdvancedOptions(prices: Record<string, any>) {
  const options: { label: string; amount: number; description: string; type: string }[] = [];
  
  const advancedPrice = prices.ADVANCED;
  if (advancedPrice) {
    // Precio promocional si está activo - PRIMERO
    if (advancedPrice.isPromoActive && advancedPrice.promoPrice) {
      options.push({
        label: `$${formatNumber(advancedPrice.promoPrice)} - Avanzado (Promoción)`,
        amount: advancedPrice.promoPrice,
        description: 'Entrenamiento Avanzado - Precio promocional',
        type: 'ADVANCED_PROMO'
      });
    }
    
    // Precio base
    options.push({
      label: `$${formatNumber(advancedPrice.basePrice)} - Avanzado`,
      amount: advancedPrice.basePrice,
      description: 'Inscripción Entrenamiento Avanzado',
      type: 'ADVANCED'
    });

    // Opción de upgrade a Liderato - MONTO FIJO $1,500
    // Para quien ya pagó Avanzado y quiere agregar Liderato
    const UPGRADE_AMOUNT = 1500;
    options.push({
      label: `$${formatNumber(UPGRADE_AMOUNT)} - Upgrade a Liderato`,
      amount: UPGRADE_AMOUNT,
      description: 'Para quien ya pagó Avanzado (Upgrade a Liderato)',
      type: 'ADVANCED_UPGRADE_PL'
    });
  }

  // Combo Avanzado + PL
  const comboAdvPL = prices.COMBO_ADV_PL;
  if (comboAdvPL) {
    if (comboAdvPL.isPromoActive && comboAdvPL.promoPrice) {
      options.push({
        label: `$${formatNumber(comboAdvPL.promoPrice)} - Combo Avanzado+PL (Promoción)`,
        amount: comboAdvPL.promoPrice,
        description: 'Avanzado + Programa de Liderato con descuento',
        type: 'COMBO_ADV_PL_PROMO'
      });
    }
    options.push({
      label: `$${formatNumber(comboAdvPL.basePrice)} - Combo Avanzado+PL`,
      amount: comboAdvPL.basePrice,
      description: 'Avanzado + Programa de Liderato',
      type: 'COMBO_ADV_PL'
    });
  }

  return options;
}

/**
 * Genera opciones de precio para nivel LIDERATO (PL)
 * Según el requerimiento específico:
 * - $5,500 (precio promo)
 * - $11,000 (precio base)
 * - $7,500 (completar combo Avanzado+PL para quien ya pagó Avanzado base)
 */
function generatePLOptions(prices: Record<string, any>) {
  const options: { label: string; amount: number; description: string; type: string }[] = [];
  
  const plPrice = prices.PL;
  if (plPrice) {
    // Precio promocional si está activo - PRIMERO
    if (plPrice.isPromoActive && plPrice.promoPrice) {
      options.push({
        label: `$${formatNumber(plPrice.promoPrice)} - Liderato (Promoción)`,
        amount: plPrice.promoPrice,
        description: 'Programa de Liderato - Precio promocional',
        type: 'PL_PROMO'
      });
    }
    
    // Precio base
    options.push({
      label: `$${formatNumber(plPrice.basePrice)} - Liderato`,
      amount: plPrice.basePrice,
      description: 'Programa de Liderato completo',
      type: 'PL'
    });
  }

  // Opción para completar combo Avanzado+PL
  // Monto fijo: $7,500 para quien ya pagó Avanzado y quiere agregar PL
  // Cálculo: Combo Avanzado+PL ($9,000 promo) - Avanzado ($7,500 promo) = $1,500 NO
  // En realidad es: El precio de PL con descuento por ya tener Avanzado
  // Según requerimiento: $7,500 fijo
  const comboAdvPL = prices.COMBO_ADV_PL;
  if (comboAdvPL) {
    // Calcular upgrade: Combo promo - Avanzado promo OR usar valor fijo si no hay datos
    const advancedPrice = prices.ADVANCED;
    let upgradePrice = 7500; // Valor por defecto según requerimiento
    
    if (advancedPrice) {
      // Si hay combo promo y avanzado promo, calcular diferencia
      const comboPromoOrBase = comboAdvPL.isPromoActive && comboAdvPL.promoPrice 
        ? comboAdvPL.promoPrice 
        : comboAdvPL.basePrice;
      const advPromoOrBase = advancedPrice.isPromoActive && advancedPrice.promoPrice 
        ? advancedPrice.promoPrice 
        : advancedPrice.basePrice;
      
      const calculatedUpgrade = comboPromoOrBase - advPromoOrBase;
      // Solo usar el calculado si es positivo, si no, usar el fijo
      if (calculatedUpgrade > 0) {
        upgradePrice = calculatedUpgrade;
      }
    }
    
    options.push({
      label: `$${formatNumber(upgradePrice)} - Completar Combo Avanzado+PL`,
      amount: upgradePrice,
      description: 'Para quien ya pagó Avanzado (upgrade a combo)',
      type: 'PL_UPGRADE'
    });
  }

  return options;
}

function formatNumber(num: number): string {
  return num.toLocaleString('es-MX');
}
