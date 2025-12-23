const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

async function recreateUsers() {
  try {
    console.log('🔄 Recreando usuarios que se perdieron...\n');
    
    // Usuario10
    const hashUsuario10 = await bcrypt.hash('password123', 10);
    const usuario10 = await prisma.usuario.create({
      data: {
        nombre: 'Usuario 10',
        email: 'usuario10@frutos.com',
        password: hashUsuario10,
        rol: 'PARTICIPANTE',
        isActive: true
      }
    });
    console.log('✅ Creado: usuario10@frutos.com (Password: password123)');
    
    // Mentor5
    const hashMentor5 = await bcrypt.hash('mentor123', 10);
    const mentor5 = await prisma.usuario.create({
      data: {
        nombre: 'Mentor 5',
        email: 'mentor5@frutos.com',
        password: hashMentor5,
        rol: 'MENTOR',
        isActive: true
      }
    });
    console.log('✅ Creado: mentor5@frutos.com (Password: mentor123)');
    
    console.log('\n✅ Usuarios recreados exitosamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

recreateUsers();
