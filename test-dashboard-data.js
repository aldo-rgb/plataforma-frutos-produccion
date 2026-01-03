const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function testDashboardData() {
  try {
    const organizationId = 14;

    // 1. Get all licenses
    const allLicenses = await prisma.license.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        code: true
      }
    });

    console.log(`\n📦 Total Licenses in License table: ${allLicenses.length}`);

    // 2. Get assigned licenses
    const assignedCodes = await prisma.licenseAssignment.findMany({
      where: {
        organizationId,
        isActive: true,
      },
      select: {
        licenseCode: true
      }
    });

    console.log(`✅ Assigned Licenses: ${assignedCodes.length}`);

    // 3. Calculate available
    const assignedCodesSet = new Set(assignedCodes.map(a => a.licenseCode));
    const availableLicenses = allLicenses.filter(l => !assignedCodesSet.has(l.code)).length;

    console.log(`🆓 Available Licenses: ${availableLicenses}`);

    // 4. Get school credits
    const schoolCredits = await prisma.schoolCredit.aggregate({
      where: {
        organizationId,
        isActive: true,
      },
      _sum: {
        totalPurchased: true,
      }
    });

    const totalPurchased = schoolCredits._sum.totalPurchased || 0;
    console.log(`💳 School Credits Purchased: ${totalPurchased}`);

    // 5. Get activated licenses
    const activatedLicenses = await prisma.licenseAssignment.count({
      where: {
        Organization: {
          id: organizationId
        },
        isActive: true,
        activatedAt: {
          not: null
        }
      }
    });

    console.log(`🎯 Activated Licenses: ${activatedLicenses}`);

    // 6. Calculate final availableCredits (as in dashboard)
    const totalActivated = activatedLicenses;
    const availableCredits = totalPurchased - totalActivated + availableLicenses;

    console.log(`\n🔢 FINAL CALCULATION:`);
    console.log(`   totalPurchased (${totalPurchased}) - totalActivated (${totalActivated}) + availableLicenses (${availableLicenses})`);
    console.log(`   = ${availableCredits}`);
    console.log(`\n✨ Dashboard should show: ${availableCredits} licencias disponibles\n`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDashboardData();
