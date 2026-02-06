const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkUser() {
  try {
    const user = await prisma.usuario.findUnique({
      where: { email: 'trainer6@frutos.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        isActive: true,
        organizationId: true,
        createdAt: true
      }
    });

    if (!user) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('\n📋 INFORMACIÓN DEL USUARIO trainer6@frutos.com');
    console.log('='.repeat(60));
    console.log(`ID: ${user.id}`);
    console.log(`Nombre: ${user.nombre}`);
    console.log(`Email: ${user.email}`);
    console.log(`ROL: ${user.rol}`);
    console.log(`Activo: ${user.isActive ? '✅ SÍ' : '❌ NO'}`);
    console.log(`Organization ID: ${user.organizationId || 'Sin organización'}`);
    console.log(`Creado: ${user.createdAt}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkUser();
