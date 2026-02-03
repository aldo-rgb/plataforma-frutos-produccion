const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkConfig() {
  try {
    // Buscar organizaciones con configuración de flyer
    const orgs = await prisma.organization.findMany({
      where: {
        flyerLocationDetail: { not: null }
      },
      select: {
        id: true,
        name: true,
        flyerLocationDetail: true,
        flyerBackgroundUrl: true,
        flyerHeadline: true,
        flyerWhatsappNumber: true,
      }
    });

    console.log('Organizaciones con flyerLocationDetail configurado:');
    console.log(JSON.stringify(orgs, null, 2));

    // También mostrar todas las organizaciones para ver el estado completo
    const allOrgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        flyerLocationDetail: true,
        flyerBackgroundUrl: true,
        flyerHeadline: true,
        flyerWhatsappNumber: true,
      }
    });

    console.log('\n\nTodas las organizaciones:');
    console.log(JSON.stringify(allOrgs, null, 2));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkConfig();
