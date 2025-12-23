const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function countUsuariosConAlertas() {
  try {
    const alertas = await prisma.mentorAlert.findMany({
      where: {
        mentorId: 51, // Mentor 5
        read: false,
        type: 'RISK_ALERT'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    console.log(`📊 Total alertas no leídas: ${alertas.length}`);

    // Contar usuarios únicos
    const usuariosUnicos = new Set();
    alertas.forEach(alert => {
      usuariosUnicos.add(alert.usuarioId);
    });

    console.log(`\n👥 Usuarios únicos con alertas: ${usuariosUnicos.size}`);
    
    console.log('\n�� Detalle por usuario:');
    const usuariosMap = {};
    alertas.forEach(alert => {
      if (!usuariosMap[alert.usuarioId]) {
        usuariosMap[alert.usuarioId] = {
          nombre: alert.Usuario.nombre,
          alertas: []
        };
      }
      usuariosMap[alert.usuarioId].alertas.push(alert);
    });

    Object.entries(usuariosMap).forEach(([userId, data]) => {
      console.log(`  ${data.nombre}: ${data.alertas.length} alerta(s)`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

countUsuariosConAlertas();
