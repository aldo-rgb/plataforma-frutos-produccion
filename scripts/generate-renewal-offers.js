import { PrismaClient } from '@prisma/client';
import { POST_VISION_RENEWAL } from '../src/types/pricing';

const prisma = new PrismaClient();

/**
 * 🔄 CRON JOB: Generar Ofertas de Renovación Automáticas
 * 
 * Este script debe ejecutarse diariamente para:
 * 1. Detectar licencias escolares que expiran en 15 días
 * 2. Crear ofertas de renovación con 50% descuento
 * 3. Enviar notificaciones a los usuarios
 * 
 * Ejecución sugerida: Diario a las 08:00 AM
 * crontab: 0 8 * * * node scripts/generate-renewal-offers.js
 */

async function generateRenewalOffers() {
  console.log('🔄 Iniciando generación de ofertas de renovación...');

  try {
    // Fecha actual + 15 días
    const today = new Date();
    const fifteenDaysFromNow = new Date(today);
    fifteenDaysFromNow.setDate(today.getDate() + 15);

    // Buscar suscripciones que expiran en 15 días
    const expiringSubscriptions = await prisma.subscription.findMany({
      where: {
        plan: 'SCHOOL_LICENSE',
        status: 'ACTIVE',
        endDate: {
          gte: today,
          lte: fifteenDaysFromNow
        }
      },
      include: {
        RenewalOffers: true
      }
    });

    console.log(`📊 Encontradas ${expiringSubscriptions.length} suscripciones próximas a expirar`);

    let offersCreated = 0;
    let offersSkipped = 0;

    for (const subscription of expiringSubscriptions) {
      // Verificar si ya tiene oferta activa
      const hasActiveOffer = subscription.RenewalOffers.some(
        offer => offer.status === 'OFFERED' && new Date(offer.expiresAt) > today
      );

      if (hasActiveOffer) {
        console.log(`⏭️  Usuario ${subscription.userId} ya tiene oferta activa`);
        offersSkipped++;
        continue;
      }

      // Obtener información del usuario
      const user = await prisma.usuario.findUnique({
        where: { id: subscription.userId },
        select: {
          id: true,
          nombre: true,
          tier: true,
          isPostVisionUser: true,
          renewalOfferShown: true,
          Organization: {
            select: { 
              name: true,
              renewalOfferEnabled: true,
              renewalOfferDiscount: true
            }
          }
        }
      });

      if (!user) {
        console.log(`❌ Usuario ${subscription.userId} no encontrado`);
        continue;
      }

      // Verificar si la organización tiene habilitada la renovación
      if (!user.Organization?.renewalOfferEnabled) {
        console.log(`⏭️  Organización de usuario ${user.id} no tiene renovación habilitada`);
        offersSkipped++;
        continue;
      }

      // Determinar precios según tier
      const tier = user.tier === 'PREMIUM' ? 'PREMIUM' : 'STANDARD';
      const renewalData = POST_VISION_RENEWAL[tier];

      // Aplicar descuento de la organización (por defecto 50%)
      const discountPercent = user.Organization.renewalOfferDiscount || 50;
      const offeredPrice = Math.round(renewalData.original_price * (1 - discountPercent / 100));

      // Calcular fecha de expiración de la oferta (15 días)
      const offerExpiresAt = new Date(today);
      offerExpiresAt.setDate(today.getDate() + 15);

      // Crear oferta de renovación
      await prisma.renewalOffer.create({
        data: {
          subscriptionId: subscription.id,
          userId: user.id,
          originalPrice: renewalData.original_price,
          offeredPrice: offeredPrice,
          discountPercent: discountPercent,
          status: 'OFFERED',
          expiresAt: offerExpiresAt,
          message: `¡Hola ${user.nombre}! Tu ciclo de visión en ${user.Organization?.name || 'tu escuela'} está por terminar. ${renewalData.copywriting}`
        }
      });

      // Marcar al usuario como post-visión
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          isPostVisionUser: true,
          renewalOfferShown: true,
          lastRenewalOfferDate: today,
          originalOrganizationId: user.Organization ? (await prisma.organization.findFirst({ where: { name: user.Organization.name } }))?.id : null
        }
      });

      console.log(`✅ Oferta creada para ${user.nombre} (${tier}) - $${offeredPrice} con ${discountPercent}% OFF`);
      offersCreated++;

      // TODO: Enviar notificación push/email
      // await sendRenewalNotification(user.id, offeredPrice, discountPercent);
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Ofertas creadas: ${offersCreated}`);
    console.log(`   ⏭️  Ofertas omitidas: ${offersSkipped}`);
    console.log(`   📝 Total procesadas: ${expiringSubscriptions.length}`);

  } catch (error) {
    console.error('❌ Error generando ofertas de renovación:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * 🔄 Marcar Ofertas Expiradas
 */
async function expireOldOffers() {
  console.log('⏰ Marcando ofertas expiradas...');

  try {
    const result = await prisma.renewalOffer.updateMany({
      where: {
        status: 'OFFERED',
        expiresAt: {
          lt: new Date()
        }
      },
      data: {
        status: 'EXPIRED'
      }
    });

    console.log(`✅ ${result.count} ofertas marcadas como expiradas`);

  } catch (error) {
    console.error('❌ Error expirando ofertas:', error);
  }
}

/**
 * 📉 Downgrade Usuarios con Licencias Expiradas
 */
async function downgradeExpiredLicenses() {
  console.log('📉 Procesando licencias expiradas...');

  try {
    const today = new Date();

    // Buscar usuarios con licencias expiradas
    const expiredUsers = await prisma.usuario.findMany({
      where: {
        subscriptionStatus: 'ACTIVE',
        subscriptionPlan: 'SCHOOL_LICENSE',
        subscriptionEndDate: {
          lt: today
        }
      }
    });

    console.log(`📊 Encontrados ${expiredUsers.length} usuarios con licencias expiradas`);

    for (const user of expiredUsers) {
      // Downgrade a FREE
      await prisma.usuario.update({
        where: { id: user.id },
        data: {
          tier: 'FREE',
          subscriptionStatus: 'INACTIVE',
          subscriptionPlan: 'NONE'
        }
      });

      console.log(`📉 Usuario ${user.nombre} downgradeado a FREE`);
    }

    console.log(`✅ ${expiredUsers.length} usuarios procesados`);

  } catch (error) {
    console.error('❌ Error downgradeando usuarios:', error);
  }
}

// Ejecutar el script
async function main() {
  console.log('🚀 Iniciando Retention Loop System...\n');

  await expireOldOffers();
  await generateRenewalOffers();
  await downgradeExpiredLicenses();

  console.log('\n✅ Proceso completado exitosamente');
}

main()
  .catch((error) => {
    console.error('💥 Error fatal:', error);
    process.exit(1);
  });
