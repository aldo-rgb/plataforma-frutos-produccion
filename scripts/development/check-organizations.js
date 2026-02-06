const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkOrgs() {
  try {
    const orgs = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        schoolAdminId: true
      }
    });
    
    console.log('📊 Organizaciones encontradas:', orgs.length);
    orgs.forEach(org => {
      console.log(`  - ID: ${org.id}, Name: ${org.name}, Slug: ${org.slug}, AdminID: ${org.schoolAdminId}`);
    });
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkOrgs();
