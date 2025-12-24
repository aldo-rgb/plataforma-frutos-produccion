const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    const usuarios = await prisma.usuario.findMany({
      where: {
        email: {
          in: ['admin@frutos.com', 'usuario1@frutos.com']
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        password: true
      }
    });
    
    console.log('Usuarios encontrados:', usuarios.length);
    usuarios.forEach(u => {
      console.log(JSON.stringify({
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        isActive: u.isActive,
        hasPassword: !!u.password
      }, null, 2));
    });
  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await prisma.$disconnect();
  }
})();
