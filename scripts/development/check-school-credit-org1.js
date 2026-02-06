const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndCreateSchoolCredit() {
  try {
    console.log('🔍 Verificando SchoolCredit para organización 1...\n');

    const schoolCredit = await prisma.schoolCredit.findFirst({
      where: {
        organizationId: 1,
        isActive: true
      }
    });

    if (!schoolCredit) {
      console.log('❌ No existe SchoolCredit activo para organización 1');
      console.log('✨ Creando SchoolCredit con 100 licencias...\n');

      const newCredit = await prisma.schoolCredit.create({
        data: {
          organizationId: 1,
          totalPurchased: 100,
          totalAllocated: 0,
          isActive: true,
          notes: 'Créditos iniciales - Zero Mty'
        }
      });

      console.log('✅ SchoolCredit creado:', newCredit);
    } else {
      console.log('✅ SchoolCredit encontrado:');
      console.log(`   ID: ${schoolCredit.id}`);
      console.log(`   Total comprado: ${schoolCredit.totalPurchased}`);
      console.log(`   Total asignado: ${schoolCredit.totalAllocated}`);
      console.log(`   Disponible: ${schoolCredit.totalPurchased - schoolCredit.totalAllocated}`);
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAndCreateSchoolCredit();
