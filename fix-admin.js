const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function fix() {
  const hashedPassword = await bcrypt.hash('admin123', 10);
  
  const updated = await prisma.usuario.update({
    where: { email: 'admin@frutos.com' },
    data: {
      password: hashedPassword,
      rol: 'ADMINISTRADOR',
      nombre: 'Laura Administrador'
    }
  });
  
  console.log('✅ Usuario actualizado:', updated.email, '- Rol:', updated.rol);
  console.log('✅ Contraseña configurada: admin123');
  
  await prisma.$disconnect();
}

fix();
