const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdmins() {
  try {
    console.log('🔐 Creando usuarios administradores...\n');

    // Hashear contraseñas
    const password1 = await bcrypt.hash('admin123', 10);
    const password2 = await bcrypt.hash('admin123', 10);

    // Crear admin@frutos.com
    const admin1 = await prisma.usuario.upsert({
      where: { email: 'admin@frutos.com' },
      update: {},
      create: {
        email: 'admin@frutos.com',
        nombre: 'Administrador Principal',
        password: password1,
        rol: 'ADMINISTRADOR',
        isActive: true,
        tier: 'PREMIUM',
        subscriptionStatus: 'ACTIVE'
      }
    });

    console.log('✅ Creado:', admin1.email, '-', admin1.nombre);

    // Crear aldo@zaia.mx
    const admin2 = await prisma.usuario.upsert({
      where: { email: 'aldo@zaia.mx' },
      update: {},
      create: {
        email: 'aldo@zaia.mx',
        nombre: 'Aldo Administrador',
        password: password2,
        rol: 'ADMINISTRADOR',
        isActive: true,
        tier: 'PREMIUM',
        subscriptionStatus: 'ACTIVE'
      }
    });

    console.log('✅ Creado:', admin2.email, '-', admin2.nombre);

    console.log('\n✨ Usuarios administradores creados exitosamente!');
    console.log('\n📝 Credenciales:');
    console.log('   - admin@frutos.com / admin123');
    console.log('   - aldo@zaia.mx / admin123');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmins();
