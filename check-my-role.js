const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMyRole() {
  try {
    // Buscar el usuario que está logueado (admin más reciente o por email)
    console.log('🔍 Buscando usuarios admin/director...\n');
    
    const adminUsers = await prisma.usuario.findMany({
      where: {
        OR: [
          { rol: 'ADMIN' },
          { rol: 'DIRECTOR' }
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('👥 Usuarios con permisos de administración:');
    console.log('==========================================');
    adminUsers.forEach(user => {
      console.log(`\n🆔 ID: ${user.id}`);
      console.log(`👤 Nombre: ${user.nombre}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🎭 Rol: ${user.rol}`);
      console.log(`📅 Creado: ${user.createdAt}`);
    });

    console.log('\n\n🔍 Buscando TODOS los usuarios...\n');
    
    const allUsers = await prisma.usuario.findMany({
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
      take: 10
    });

    console.log('📋 Últimos 10 usuarios creados:');
    console.log('================================');
    allUsers.forEach(user => {
      console.log(`\n🆔 ID: ${user.id} | 🎭 Rol: ${user.rol}`);
      console.log(`👤 ${user.nombre} (${user.email})`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkMyRole();
