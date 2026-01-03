const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLicenses() {
  try {
    // Buscar el usuario
    const user = await prisma.usuario.findUnique({
      where: { email: 'director@final.com' },
      include: {
        Organization_Organization_schoolAdminIdToUsuario: {
          include: {
            License: {
              take: 5, // Solo las primeras 5 para ver
            }
          }
        }
      }
    });

    console.log('Usuario:', user.nombre);
    console.log('Email:', user.email);
    console.log('Rol:', user.rol);
    console.log('Organization ID:', user.organizationId);
    
    if (user.Organization_Organization_schoolAdminIdToUsuario) {
      const org = user.Organization_Organization_schoolAdminIdToUsuario;
      console.log('\nOrganización:', org.name);
      console.log('ID:', org.id);
      console.log('Total Licenses:', org.totalLicenses);
      console.log('Active Licenses:', org.activeLicenses);
      console.log('Licencias encontradas:', org.License.length);
      
      if (org.License.length > 0) {
        console.log('\nPrimeras licencias:');
        org.License.forEach((lic, i) => {
          console.log(`${i + 1}. Code: ${lic.code}, Active: ${lic.isActive}`);
        });
      }
    }

    // Contar licencias totales de la organización
    const totalLicenses = await prisma.license.count({
      where: { organizationId: user.organizationId }
    });
    
    console.log('\nTotal de licencias en BD:', totalLicenses);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkLicenses();
