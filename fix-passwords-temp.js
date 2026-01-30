const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fixPasswords() {
  try {
    // Buscar usuarios con contraseña 'Quantum123' en texto plano
    const users = await prisma.usuario.findMany({
      where: { password: 'Quantum123' }
    });
    
    console.log('Usuarios con contraseña en texto plano:', users.length);
    
    if (users.length > 0) {
      const hashedPassword = await bcrypt.hash('Quantum123', 10);
      
      const result = await prisma.usuario.updateMany({
        where: { password: 'Quantum123' },
        data: { password: hashedPassword }
      });
      
      console.log('Usuarios actualizados:', result.count);
    } else {
      console.log('No hay usuarios con contraseñas en texto plano');
    }
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixPasswords();
