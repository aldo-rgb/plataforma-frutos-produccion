import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listUsers() {
  try {
    const usuarios = await prisma.usuario.findMany({
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        password: true,
        isActive: true
      },
      orderBy: { id: 'asc' }
    });

    console.log('\n═══════════════════════════════════════════════════');
    console.log('📋 LISTA DE USUARIOS DEL SISTEMA');
    console.log('═══════════════════════════════════════════════════\n');

    usuarios.forEach(user => {
      const status = user.isActive ? '✅ Activo' : '❌ Inactivo';
      
      console.log(`ID: ${user.id}`);
      console.log(`Nombre: ${user.nombre}`);
      console.log(`Email: ${user.email}`);
      console.log(`Rol: ${user.rol}`);
      console.log(`Password Hash: ${user.password ? user.password.substring(0, 30) + '...' : 'Sin contraseña'}`);
      console.log(`Estado: ${status}`);
      console.log('─────────────────────────────────────────────────\n');
    });

    console.log(`\n✅ Total de usuarios: ${usuarios.length}\n`);
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listUsers();
