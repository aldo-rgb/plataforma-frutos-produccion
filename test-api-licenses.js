const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testAPI() {
  const orgId = 26;
  
  const allLicenses = await prisma.license.findMany({
    where: {
      organizationId: orgId,
      isActive: true
    },
    select: { code: true }
  });
  
  const assignedCodes = await prisma.licenseAssignment.findMany({
    where: {
      organizationId: orgId,
      isActive: true
    },
    select: { licenseCode: true }
  });
  
  const assignedSet = new Set(assignedCodes.map(a => a.licenseCode));
  const availableLicenses = allLicenses.filter(l => !assignedSet.has(l.code)).length;
  
  console.log('🔍 Simulando API endpoint:');
  console.log('organizationId:', orgId);
  console.log('Total licenses:', allLicenses.length);
  console.log('Assigned codes:', assignedCodes.length);
  console.log('availableCredits:', availableLicenses);
  
  await prisma.$disconnect();
}

testAPI();
