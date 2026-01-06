const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllCredits() {
  try {
    // Obtener todas las organizaciones con sus school admins
    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        nombre: true,
        name: true,
        slug: true,
        Usuario_Organization_schoolAdminIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      },
      orderBy: { id: 'asc' }
    });

    console.log(`\n📊 ANÁLISIS DE SCHOOL CREDITS\n`);
    console.log(`Total de organizaciones: ${organizations.length}\n`);
    console.log('='.repeat(80));

    for (const org of organizations) {
      const orgName = org.nombre || org.name || 'Sin nombre';
      const admin = org.Usuario_Organization_schoolAdminIdToUsuario;
      
      console.log(`\n🏫 Organización ID ${org.id}: ${orgName}`);
      if (admin) {
        console.log(`   Admin: ${admin.nombre} (${admin.email})`);
      }

      // Buscar SchoolCredits
      const credits = await prisma.schoolCredit.findMany({
        where: { organizationId: org.id },
        orderBy: { createdAt: 'desc' }
      });

      if (credits.length === 0) {
        console.log('   ⚠️  NO TIENE SCHOOL CREDITS');
      } else {
        credits.forEach((credit, index) => {
          const available = credit.totalPurchased - credit.totalAllocated;
          const status = credit.isActive ? '✅ ACTIVO' : '❌ INACTIVO';
          console.log(`\n   ${status} - Credit #${index + 1} (ID: ${credit.id})`);
          console.log(`      Plan: ${credit.planType}`);
          console.log(`      Comprados: ${credit.totalPurchased}`);
          console.log(`      Asignados: ${credit.totalAllocated}`);
          console.log(`      Disponibles: ${available}`);
          console.log(`      Pagado: $${credit.totalPaid}`);
          console.log(`      Precio unitario: $${credit.unitPrice}`);
          if (credit.expirationDate) {
            console.log(`      Expira: ${credit.expirationDate.toLocaleDateString()}`);
          }
          if (credit.notes) {
            console.log(`      Notas: ${credit.notes}`);
          }
        });
      }

      // Contar LIDERs creados
      const lideres = await prisma.usuario.count({
        where: {
          organizationId: org.id,
          rol: 'LIDER'
        }
      });

      // Contar LicenseAssignments
      const assignments = await prisma.licenseAssignment.count({
        where: {
          organizationId: org.id,
          isActive: true
        }
      });

      console.log(`\n   👥 Mentores (LIDER) creados: ${lideres}`);
      console.log(`   📄 LicenseAssignments activos: ${assignments}`);
      console.log('   ' + '-'.repeat(76));
    }

    console.log('\n' + '='.repeat(80));
    console.log('✅ Análisis completado\n');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkAllCredits();
