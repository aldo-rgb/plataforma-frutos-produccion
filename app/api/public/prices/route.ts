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

    if (organizationId) {
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

    // Get default prices from database if they exist
    const defaultPrices = await prisma.defaultPrice.findMany({
      where: {
        organizationId: organizationId ? parseInt(organizationId) : null,
      },
    });

    if (defaultPrices.length > 0) {
      defaultPrices.forEach((dp: any) => {
        // Use promoPrice if available, otherwise basePrice
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
      }
    }

    return NextResponse.json({
      success: true,
      prices,
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
        }
      },
      { status: 200 }
    );
  }
}
