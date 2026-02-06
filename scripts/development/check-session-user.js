const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkSessionUser() {
  try {
    // Buscar usuario por el email que aparece en el log
    const user = await prisma.usuario.findUnique({
      where: { email: 'aldo@frutos.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        createdAt: true
      }
    });

    if (user) {
      console.log('\n👤 Tu usuario actual:');
      console.log('====================');
      console.log(`🆔 ID: ${user.id}`);
      console.log(`👤 Nombre: ${user.nombre}`);
      console.log(`📧 Email: ${user.email}`);
      console.log(`🎭 Rol: ${user.rol}`);
      console.log(`📅 Creado: ${user.createdAt}`);
      
      if (user.rol === 'ADMIN' || user.rol === 'DIRECTOR') {
        console.log('\n✅ TIENES PERMISOS de administración');
      } else {
        console.log('\n❌ NO TIENES PERMISOS de administración');
        console.log(`   Tu rol actual es: ${user.rol}`);
        console.log('   Necesitas rol ADMIN o DIRECTOR');
      }
    } else {
      console.log('\n❌ No se encontró el usuario aldo@frutos.com');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkSessionUser();
