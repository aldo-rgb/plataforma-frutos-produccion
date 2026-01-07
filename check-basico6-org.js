const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkBasico6Organization() {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'basico6@frutos.com' },
      include: {
        Organization_Usuario_organizationIdToOrganization: true
      }
    });

    console.log('\n📊 Usuario basico6@frutos.com:');
    console.log('ID:', usuario?.id);
    console.log('Nombre:', usuario?.nombre);
    console.log('Rol:', usuario?.rol);
    console.log('Organization ID:', usuario?.organizationId);
    console.log('Organization:', usuario?.Organization_Usuario_organizationIdToOrganization);

    if (usuario?.organizationId) {
      const schoolCredits = await prisma.schoolCredit.findMany({
        where: { 
          organizationId: usuario.organizationId,
          isActive: true
        }
      });

      console.log('\n💰 School Credits de la organización:');
      console.log('Total registros:', schoolCredits.length);
      schoolCredits.forEach(credit => {
        console.log({
          id: credit.id,
          totalPurchased: credit.totalPurchased,
          totalAllocated: credit.totalAllocated,
          available: credit.totalPurchased - credit.totalAllocated
        });
      });

      const totalAvailable = schoolCredits.reduce((sum, credit) => {
        return sum + (credit.totalPurchased - credit.totalAllocated);
      }, 0);

      console.log('\n✅ Total Licencias Disponibles:', totalAvailable);
    } else {
      console.log('\n⚠️ Usuario no tiene organizationId asignado');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkBasico6Organization();
