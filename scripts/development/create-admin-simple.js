const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function createAdmin() {
  try {
    console.log('🔐 Creando usuario ADMINISTRADOR...');

    // Hash de la contraseña
    const hashedPassword = await bcrypt.hash('admin123', 10);

    // Crear usuario ADMINISTRADOR (sin organización)
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@frutos.com',
        password: hashedPassword,
        rol: 'ADMINISTRADOR',
        tier: 'PREMIUM',
        isActive: true,
        experienciaXP: 0,
        puntosCuanticos: 0,
        nivelActual: 1,
        updatedAt: new Date()
      }
    });

    console.log('✅ Usuario ADMINISTRADOR creado exitosamente');
    console.log('\n🎉 ¡Listo para usar!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    admin@frutos.com');
    console.log('🔑 Password: admin123');
    console.log('👤 Rol:      ADMINISTRADOR');
    console.log('👤 User ID: ', admin.id);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n✅ Ahora puedes iniciar sesión en: http://localhost:3000/login');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

createAdmin();
