const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkApplications() {
  try {
    console.log('\n🔍 Verificando solicitudes de mentor...\n');
    
    // Obtener todas las aplicaciones
    const allApplications = await prisma.mentorApplication.findMany({
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    
    console.log(`📊 Total de aplicaciones: ${allApplications.length}\n`);
    
    // Agrupar por estado
    const byStatus = allApplications.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});
    
    console.log('📋 Por estado:');
    Object.entries(byStatus).forEach(([status, count]) => {
      console.log(`   ${status}: ${count}`);
    });
    
    console.log('\n📝 Detalles de cada aplicación:\n');
    allApplications.forEach((app, index) => {
      console.log(`${index + 1}. ${app.Usuario.nombre} (ID: ${app.id})`);
      console.log(`   Email: ${app.Usuario.email}`);
      console.log(`   Estado: ${app.status}`);
      console.log(`   Pago: ${app.paymentStatus || 'NO PAGADO'}`);
      console.log(`   Especialidad: ${app.especialidad}`);
      console.log(`   Creado: ${app.createdAt}`);
      console.log(`   Usuario Rol: ${app.Usuario.rol}`);
      console.log('');
    });
    
    // Verificar solicitudes PENDING específicamente
    const pendingApps = allApplications.filter(app => app.status === 'PENDING');
    console.log(`\n✅ Solicitudes PENDING: ${pendingApps.length}`);
    
    // Verificar solicitudes DRAFT
    const draftApps = allApplications.filter(app => app.status === 'DRAFT');
    console.log(`📝 Solicitudes DRAFT: ${draftApps.length}`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApplications();
