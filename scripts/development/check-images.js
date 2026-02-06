const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const users = await prisma.usuario.findMany({
    where: { id: { in: [34, 29, 33, 42, 22, 30] } },
    select: { id: true, nombre: true, profileImage: true, imagen: true }
  });
  users.forEach(u => {
    console.log(`${u.id} ${u.nombre}`);
    console.log(`   profileImage: ${u.profileImage || 'NULL'}`);
    console.log(`   imagen: ${u.imagen || 'NULL'}`);
  });
  await prisma.$disconnect();
}
check();
