const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCodigo() {
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: 'director3@frutos.com' }
    });
    
    if (user) {
      console.log('Usuario:', user.nombre, '- org:', user.organizationId);
      
      const org = await prisma.organization.findUnique({
        where: { id: user.organizationId }
      });
      
      console.log('\nOrganización:', org.name);
      console.log('totalLicenses:', org.totalLicenses);
      
      const codigo = await prisma.codigoAcceso.findFirst({
        where: {
          canjeadoPorId: user.id,
          tipo: 'LICENCIAS_INSTITUCIONAL'
        }
      });
      
      console.log('\nCódigo canjeado:');
      console.log('- Código:', codigo.codigo);
      console.log('- cantidadLicencias:', codigo.cantidadLicencias);
      console.log('- licenciasUsadas:', codigo.licenciasUsadas);
    }
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkCodigo();
