const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function createAdminUser() {
  try {
    // Hash password
    const hashedPassword = await bcrypt.hash('Admin123!', 10);
    
    // Create admin user
    const admin = await prisma.usuario.create({
      data: {
        nombre: 'Administrador',
        email: 'admin@frutos.com',
        password: hashedPassword,
        rol: 'ADMINISTRADOR',
        isActive: true
      }
    });
    
    console.log('✅ Usuario admin creado exitosamente:');
    console.log('   Email:', admin.email);
    console.log('   Password: Admin123!');
    console.log('   Rol:', admin.rol);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

createAdminUser();
