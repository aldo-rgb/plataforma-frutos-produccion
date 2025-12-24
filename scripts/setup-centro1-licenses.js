const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupCentro1Licenses() {
  try {
    console.log('🔍 Buscando Centro 1...');
    
    // Encontrar Centro 1
    const centro1 = await prisma.organization.findFirst({
      where: {
        name: {
          contains: 'Centro 1'
        }
      }
    });

    if (!centro1) {
      console.error('❌ No se encontró Centro 1');
      return;
    }

    console.log('✅ Centro 1 encontrado:', centro1.name, '(ID:', centro1.id, ')');

    // Verificar si ya existe un SchoolCredit
    const existingCredit = await prisma.schoolCredit.findFirst({
      where: {
        organizationId: centro1.id
      }
    });

    if (existingCredit) {
      console.log('⚠️  Ya existe un SchoolCredit para Centro 1');
      console.log('   Actualizando...');
      
      const updated = await prisma.schoolCredit.update({
        where: { id: existingCredit.id },
        data: {
          totalPurchased: 100,
          totalAllocated: 0,
          isActive: true,
          planType: 'STANDARD',
          unitPrice: 800.00,
          totalPaid: 80000.00
        }
      });
      
      console.log('✅ SchoolCredit actualizado:', updated);
    } else {
      console.log('📝 Creando nuevo SchoolCredit para Centro 1...');
      
      const newCredit = await prisma.schoolCredit.create({
        data: {
          organizationId: centro1.id,
          planType: 'STANDARD',
          totalPurchased: 100,
          totalAllocated: 0,
          unitPrice: 800.00,
          totalPaid: 80000.00,
          isActive: true
        }
      });
      
      console.log('✅ SchoolCredit creado:', newCredit);
    }

    // Verificar el resultado
    const allCredits = await prisma.schoolCredit.findMany({
      where: { organizationId: centro1.id }
    });

    console.log('\n📊 Resumen de créditos para Centro 1:');
    allCredits.forEach(credit => {
      console.log(`   - Plan: ${credit.planType}`);
      console.log(`     Total compradas: ${credit.totalPurchased}`);
      console.log(`     Total asignadas: ${credit.totalAllocated}`);
      console.log(`     Disponibles: ${credit.totalPurchased - credit.totalAllocated}`);
      console.log(`     Precio unitario: $${credit.unitPrice} MXN`);
      console.log(`     Total pagado: $${credit.totalPaid} MXN`);
      console.log(`     Activo: ${credit.isActive}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupCentro1Licenses();
