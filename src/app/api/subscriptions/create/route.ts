import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getPlanPrice, PRICING, POST_VISION_RENEWAL } from '@/types/pricing';

const prisma = new PrismaClient();

/**
 * 💰 API: Crear Suscripción Individual
 * POST /api/subscriptions/create
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { plan, isPostVisionDiscount } = await req.json();
    const userId = parseInt(session.user.id);

    // Validar plan
    if (!['MONTHLY_STANDARD', 'ANNUAL_STANDARD', 'MONTHLY_PREMIUM', 'ANNUAL_PREMIUM'].includes(plan)) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 });
    }

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        isPostVisionUser: true, 
        originalOrganizationId: true,
        tier: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Calcular precio
    let basePrice = getPlanPrice(plan);
    let finalPrice = basePrice;
    let discount = 0;
    let isPostVision = false;

    // Aplicar descuento 50% si es ex-alumno y eligió anual
    if (user.isPostVisionUser && isPostVisionDiscount && (plan === 'ANNUAL_STANDARD' || plan === 'ANNUAL_PREMIUM')) {
      const tier = plan.includes('STANDARD') ? 'STANDARD' : 'PREMIUM';
      finalPrice = tier === 'STANDARD' 
        ? POST_VISION_RENEWAL.STANDARD.renewal_price 
        : POST_VISION_RENEWAL.PREMIUM.renewal_price;
      discount = 50;
      isPostVision = true;
    }

    // Determinar tier
    const newTier = plan.includes('STANDARD') ? 'STANDARD' : 'PREMIUM';

    // Calcular fechas
    const startDate = new Date();
    const endDate = new Date();
    
    if (plan.includes('MONTHLY')) {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setFullYear(endDate.getFullYear() + 1);
    }

    // Crear suscripción
    const subscription = await prisma.subscription.create({
      data: {
        userId: user.id,
        plan,
        status: 'ACTIVE',
        basePrice,
        finalPrice,
        discount,
        isPostVisionDiscount: isPostVision,
        startDate,
        endDate,
        nextBillingDate: plan.includes('MONTHLY') ? endDate : null,
        originalOrganization: user.originalOrganizationId 
          ? (await prisma.organization.findUnique({ where: { id: user.originalOrganizationId } }))?.name 
          : null
      }
    });

    // Actualizar usuario
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        tier: newTier,
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: plan,
        subscriptionStartDate: startDate,
        subscriptionEndDate: endDate
      }
    });

    return NextResponse.json({
      success: true,
      subscription,
      message: isPostVision 
        ? `¡Bienvenido de vuelta! Activaste ${newTier} con 50% de descuento.`
        : `Suscripción ${newTier} activada exitosamente.`
    });

  } catch (error: any) {
    console.error('❌ Error creando suscripción:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
