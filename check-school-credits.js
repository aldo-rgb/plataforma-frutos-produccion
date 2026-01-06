const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSchoolCredits() {
  try {
    // Primero, obtener todas las organizaciones
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        nombre: true,
        slug: true
      }
    });

    console.log(`\n📊 Total de organizaciones: ${organizations.length}\n`);

    // Para cada organización, verificar sus créditos
    for (const org of organizations) {
      console.log(`\n🏫 Organización: ${org.nombre} (ID: ${org.id})`);
      
      const credits = await prisma.schoolCredit.findMany({
        where: {
          organizationId: org.id
        },
        select: {
          id: true,
          totalPurchased: true,
          totalAllocated: true,
          isActive: true,
          createdAt: true
        }
      });

      if (credits.length === 0) {
        console.log('   ⚠️ NO TIENE CRÉDITOS CONFIGURADOS');
      } else {
        credits.forEach((credit, index) => {
          const available = credit.totalPurchased - credit.totalAllocated;
          const status = credit.isActive ? '✅' : '❌';
          console.log(`   ${status} Crédito #${index + 1}:`);
          console.log(`      - Comprados: ${credit.totalPurchased}`);
          console.log(`      - Asignados: ${credit.totalAllocated}`);
          console.log(`      - Disponibles: ${available}`);
          console.log(`      - Activo: ${credit.isActive ? 'Sí' : 'No'}`);
          console.log(`      - Creado: ${credit.createdAt.toLocaleDateString()}`);
        });
      }

      // Contar mentores (LIDER) de esta organización
      const mentores = await prisma.usuario.count({
        where: {
          organizationId: org.id,
          rol: 'LIDER'
        }
      });

      console.log(`   👥 Mentores creados: ${mentores}`);
    }

    console.log('\n✅ Análisis completado\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSchoolCredits();
