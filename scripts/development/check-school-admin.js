const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAdmin() {
  try {
    // Buscar usuarios SCHOOL_ADMIN
    const admins = await prisma.usuario.findMany({
      where: {
        rol: 'SCHOOL_ADMIN'
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
      }
    });

    console.log('School Admins:');
    for (const admin of admins) {
      console.log(`\n- ${admin.nombre} (${admin.email})`);
      console.log(`  ID: ${admin.id}`);
      console.log(`  Organization ID: ${admin.organizationId}`);
      
      if (admin.organizationId) {
        const org = await prisma.organization.findUnique({
          where: { id: admin.organizationId },
          select: {
            id: true,
            name: true,
            flyerLocationDetail: true,
            flyerWhatsappNumber: true
          }
        });
        console.log(`  Organización: ${org?.name}`);
        console.log(`  flyerLocationDetail: ${org?.flyerLocationDetail}`);
        console.log(`  flyerWhatsappNumber: ${org?.flyerWhatsappNumber}`);
      }
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAdmin();
