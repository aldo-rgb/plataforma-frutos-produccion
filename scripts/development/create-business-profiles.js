const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar usuarios con QuantumWebsite pero sin BusinessProfile
  const websites = await prisma.quantumWebsite.findMany({
    where: {
      isPublished: true,
      user: {
        BusinessProfile: null
      }
    },
    include: {
      user: {
        select: {
          id: true,
          nombre: true,
          organizationId: true,
          email: true,
          VisionParticipante_VisionParticipante_participanteIdToUsuario: {
            where: { Vision: { isActive: true } },
            select: { visionId: true },
            take: 1
          }
        }
      }
    }
  });

  console.log('Sitios sin BusinessProfile:', websites.length);
  
  // Buscar categoría 'Otro'
  let otroCategory = await prisma.businessCategory.findFirst({
    where: { slug: 'otro' }
  });
  
  if (!otroCategory) {
    otroCategory = await prisma.businessCategory.create({
      data: { name: 'Otro', slug: 'otro', icon: '✨', isActive: true }
    });
    console.log('Creada categoría Otro');
  }

  for (const site of websites) {
    if (!site.user.organizationId) {
      console.log('Skip ' + site.user.nombre + ' - sin organización');
      continue;
    }

    const visionId = site.user.VisionParticipante_VisionParticipante_participanteIdToUsuario[0]?.visionId || null;
    
    try {
      const profile = await prisma.businessProfile.create({
        data: {
          userId: site.user.id,
          organizationId: site.user.organizationId,
          visionId: visionId,
          headline: site.businessName.substring(0, 100),
          categoryId: otroCategory.id,
          description: site.businessDescription || site.aboutText || 'Mi negocio',
          discountOffer: '10% de descuento para miembros',
          city: (site.address || '').split(',')[0] || 'Por definir',
          state: (site.address || '').split(',')[1] || 'Por definir',
          whatsappPhone: site.whatsapp || site.phone || '',
          email: site.email || site.user.email,
          website: 'quantummatter.app/site/' + site.slug,
          logoUrl: site.logoUrl,
          status: 'HIDDEN'
        }
      });
      console.log('✅ Creado BusinessProfile para ' + site.user.nombre + ' - ' + site.businessName);
    } catch (err) {
      console.log('❌ Error para ' + site.user.nombre + ': ' + err.message);
    }
  }
  
  console.log('Done!');
}

main().finally(() => prisma.$disconnect());
