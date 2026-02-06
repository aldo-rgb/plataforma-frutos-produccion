const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function findV4() {
  try {
    // Buscar usuarios con email similar
    const users = await prisma.usuario.findMany({
      where: {
        OR: [
          { email: { contains: 'v4' } },
          { email: { contains: 'next' } }
        ]
      },
      select: {
        id: true,
        nombre: true,
        email: true
      },
      take: 10
    });
    
    console.log('\n🔍 Usuarios encontrados:\n');
    users.forEach(u => {
      console.log(`   ID: ${u.id} | ${u.nombre} | ${u.email}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

findV4();
