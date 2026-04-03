import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';

export async function GET(req: NextRequest) {
  try {
    // Rate limiting para APIs públicas
    const { response } = rateLimit(req, RateLimitPresets.public);
    if (response) {
      logger.warn('Rate limit exceeded on public/prices');
      return response;
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    // Try to get organization-specific prices
    let prices = {
      BASIC: 3500,
      ADVANCED: 4500,
      PL: 5500,
      FULL_VISION: 12000,
    };

    // Bank config defaults
    let bankConfig = {
      bankName: '',
      bankAccountClabe: '',
      bankAccountHolder: '',
      bankAccountNumber: '',
      transferWhatsappNumber: '',
    };

    // Branding defaults
    let branding = {
      brandColor: '#6366F1',
      logoUrl: null as string | null,
      name: '',
    };

    if (organizationId) {
      // Get organization with bank config and branding
      const organization = await prisma.organization.findUnique({
        where: { id: parseInt(organizationId) },
        select: {
          name: true,
          logoUrl: true,
          brandColor: true,
          bankName: true,
          bankAccountClabe: true,
          bankAccountHolder: true,
          bankAccountNumber: true,
          transferWhatsappNumber: true,
        },
      });

      if (organization) {
        bankConfig = {
          bankName: organization.bankName || '',
          bankAccountClabe: organization.bankAccountClabe || '',
          bankAccountHolder: organization.bankAccountHolder || '',
          bankAccountNumber: organization.bankAccountNumber || '',
          transferWhatsappNumber: organization.transferWhatsappNumber || '',
        };
        branding = {
          brandColor: organization.brandColor || '#6366F1',
          logoUrl: organization.logoUrl,
          name: organization.name,
        };
      }

      // Check if organization has custom prices
      const orgPrices = await prisma.ticketPriceConfig.findFirst({
        where: {
          organizationId: parseInt(organizationId),
        },
      });

      if (orgPrices) {
        prices = {
          BASIC: orgPrices.basicPrice || prices.BASIC,
          ADVANCED: orgPrices.advancedPrice || prices.ADVANCED,
          PL: orgPrices.plPrice || prices.PL,
          FULL_VISION: orgPrices.fullVisionPrice || (orgPrices.basicPrice + orgPrices.advancedPrice + orgPrices.plPrice) * 0.85,
        };
      }
    }

    // Base prices (sin promociones) - para calcular becas de porcentaje
    let basePrices = {
      BASIC: prices.BASIC,
      ADVANCED: prices.ADVANCED,
      PL: prices.PL,
      FULL_VISION: prices.FULL_VISION,
    };

    // Get default prices from database if they exist
    const defaultPrices = await prisma.defaultPrice.findMany({
      where: {
        organizationId: organizationId ? parseInt(organizationId) : null,
      },
    });

    if (defaultPrices.length > 0) {
      defaultPrices.forEach((dp: any) => {
        // basePrices siempre usa el precio base (sin promociones)
        if (dp.levelType === 'BASIC') basePrices.BASIC = dp.basePrice;
        if (dp.levelType === 'ADVANCED') basePrices.ADVANCED = dp.basePrice;
        if (dp.levelType === 'PL') basePrices.PL = dp.basePrice;
        if (dp.levelType === 'COMBO_FULL') basePrices.FULL_VISION = dp.basePrice;
        
        // prices usa promoPrice si está disponible
        const price = dp.promoPrice || dp.basePrice;
        if (dp.levelType === 'BASIC') prices.BASIC = price;
        if (dp.levelType === 'ADVANCED') prices.ADVANCED = price;
        if (dp.levelType === 'PL') prices.PL = price;
        if (dp.levelType === 'COMBO_FULL') prices.FULL_VISION = price;
      });

      // If FULL_VISION wasn't set directly, calculate from individual prices
      if (!defaultPrices.some((dp: any) => dp.levelType === 'COMBO_FULL')) {
        const fullPrice = prices.BASIC + prices.ADVANCED + prices.PL;
        prices.FULL_VISION = Math.round(fullPrice * 0.85);
        const fullBasePrice = basePrices.BASIC + basePrices.ADVANCED + basePrices.PL;
        basePrices.FULL_VISION = Math.round(fullBasePrice * 0.85);
      }
    }

    return NextResponse.json({
      success: true,
      prices,
      basePrices, // Precios base para calcular becas de porcentaje
      bankConfig,
      branding,
    });
  } catch (error) {
    logger.error('Error fetching prices:', error);
    return NextResponse.json(
      { 
        success: true, 
        prices: {
          BASIC: 3500,
          ADVANCED: 4500,
          PL: 5500,
          FULL_VISION: 12000,
        },
        basePrices: {
          BASIC: 3500,
          ADVANCED: 4500,
          PL: 5500,
          FULL_VISION: 12000,
        },
        bankConfig: {
          bankName: '',
          bankAccountClabe: '',
          bankAccountHolder: '',
          bankAccountNumber: '',
          transferWhatsappNumber: '',
        },
        branding: {
          brandColor: '#6366F1',
          logoUrl: null,
          name: '',
        },
      },
      { status: 200 }
    );
  }
}
