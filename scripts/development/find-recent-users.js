const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findRecentUsers() {
  try {
    // Buscar los últimos usuarios
    const recentUsers = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 15
    });

    console.log('\n📋 Últimos 15 usuarios creados:');
    console.log('================================\n');
    
    recentUsers.forEach((user, index) => {
      const isAdmin = user.rol === 'ADMIN' || user.rol === 'DIRECTOR';
      const icon = isAdmin ? '👑' : '👤';
      console.log(`${index + 1}. ${icon} ${user.nombre || 'Sin nombre'}`);
      console.log(`   📧 ${user.email}`);
      console.log(`   🎭 Rol: ${user.rol}`);
      console.log(`   🆔 ID: ${user.id}`);
      console.log(`   📅 ${user.createdAt}\n`);
    });

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

findRecentUsers();
