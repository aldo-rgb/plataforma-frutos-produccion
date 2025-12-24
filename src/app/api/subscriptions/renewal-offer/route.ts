import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { POST_VISION_RENEWAL } from '@/types/pricing';

const prisma = new PrismaClient();

/**
 * 🔄 API: Generar Oferta de Renovación (Retention Loop)
 * POST /api/subscriptions/renewal-offer
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        tier: true,
        subscriptionEndDate: true,
        isPostVisionUser: true,
        renewalOfferShown: true,
        originalOrganizationId: true,
        Organization: {
          select: { name: true }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar si ya se mostró la oferta
    if (user.renewalOfferShown) {
      return NextResponse.json({ 
        error: 'Ya se generó una oferta de renovación para este usuario' 
      }, { status: 400 });
    }

    // Verificar si es ex-alumno de escuela
    if (!user.isPostVisionUser) {
      return NextResponse.json({ 
        error: 'Este usuario no es elegible para oferta de renovación post-visión' 
      }, { status: 400 });
    }

    // Determinar precios según tier actual
    const tier = user.tier === 'PREMIUM' ? 'PREMIUM' : 'STANDARD';
    const renewalData = POST_VISION_RENEWAL[tier];

    // Buscar suscripción activa o expirada recientemente
    const lastSubscription = await prisma.subscription.findFirst({
      where: { 
        userId: user.id,
        plan: 'SCHOOL_LICENSE'
      },
      orderBy: { endDate: 'desc' }
    });

    if (!lastSubscription) {
      return NextResponse.json({ 
        error: 'No se encontró suscripción previa' 
      }, { status: 404 });
    }

    // Calcular fecha de expiración (15 días desde ahora)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 15);

    // Crear oferta de renovación
    const renewalOffer = await prisma.renewalOffer.create({
      data: {
        subscriptionId: lastSubscription.id,
        userId: user.id,
        originalPrice: renewalData.original_price,
        offeredPrice: renewalData.renewal_price,
        discountPercent: 50.00,
        status: 'OFFERED',
        expiresAt,
        message: `¡Hola ${user.nombre}! Tu ciclo de visión en ${user.Organization?.name || 'tu escuela'} está terminando. ${renewalData.copywriting}`
      }
    });

    // Marcar que ya se mostró la oferta
    await prisma.usuario.update({
      where: { id: user.id },
      data: {
        renewalOfferShown: true,
        lastRenewalOfferDate: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      renewalOffer,
      message: 'Oferta de renovación generada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error generando oferta de renovación:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 📋 API: Obtener Oferta de Renovación Activa
 * GET /api/subscriptions/renewal-offer
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Buscar oferta activa
    const renewalOffer = await prisma.renewalOffer.findFirst({
      where: {
        userId,
        status: 'OFFERED',
        expiresAt: { gte: new Date() }
      },
      orderBy: { offeredAt: 'desc' },
      include: {
        Subscription: {
          select: {
            plan: true,
            originalOrganization: true
          }
        }
      }
    });

    if (!renewalOffer) {
      return NextResponse.json({
        success: true,
        hasOffer: false,
        message: 'No hay ofertas de renovación activas'
      });
    }

    return NextResponse.json({
      success: true,
      hasOffer: true,
      renewalOffer
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo oferta de renovación:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * ✅ API: Aceptar Oferta de Renovación
 * PUT /api/subscriptions/renewal-offer
 */
export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { renewalOfferId, acceptOffer } = await req.json();
    const userId = parseInt(session.user.id);

    if (!renewalOfferId) {
      return NextResponse.json({ error: 'ID de oferta requerido' }, { status: 400 });
    }

    // Obtener oferta
    const offer = await prisma.renewalOffer.findUnique({
      where: { id: parseInt(renewalOfferId) },
      include: { Subscription: true }
    });

    if (!offer || offer.userId !== userId) {
      return NextResponse.json({ error: 'Oferta no encontrada' }, { status: 404 });
    }

    if (offer.status !== 'OFFERED') {
      return NextResponse.json({ error: 'Esta oferta ya no está disponible' }, { status: 400 });
    }

    // Actualizar estado de la oferta
    const newStatus = acceptOffer ? 'ACCEPTED' : 'DECLINED';
    await prisma.renewalOffer.update({
      where: { id: offer.id },
      data: {
        status: newStatus,
        respondedAt: new Date()
      }
    });

    // Si aceptó, crear nueva suscripción
    if (acceptOffer) {
      const tier = offer.Subscription.plan.includes('PREMIUM') ? 'PREMIUM' : 'STANDARD';
      const newPlan = tier === 'PREMIUM' ? 'ANNUAL_PREMIUM' : 'ANNUAL_STANDARD';

      const startDate = new Date();
      const endDate = new Date();
      endDate.setFullYear(endDate.getFullYear() + 1);

      await prisma.subscription.create({
        data: {
          userId,
          plan: newPlan,
          status: 'ACTIVE',
          basePrice: offer.originalPrice,
          finalPrice: offer.offeredPrice,
          discount: 50,
          isPostVisionDiscount: true,
          startDate,
          endDate,
          originalOrganization: offer.Subscription.originalOrganization
        }
      });

      // Actualizar usuario
      await prisma.usuario.update({
        where: { id: userId },
        data: {
          tier,
          subscriptionStatus: 'ACTIVE',
          subscriptionPlan: newPlan,
          subscriptionStartDate: startDate,
          subscriptionEndDate: endDate
        }
      });

      return NextResponse.json({
        success: true,
        message: `¡Bienvenido de vuelta! Tu suscripción ${tier} ha sido activada con 50% de descuento.`
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Oferta rechazada. Seguirás en modo gratuito.'
    });

  } catch (error: any) {
    console.error('❌ Error respondiendo oferta de renovación:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
