const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findFirst({
    where: { id: 37 },
    select: {
      id: true,
      nombre: true,
      goals: true,
      CartaFrutos: {
        take: 1,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          estado: true,
          finanzasDeclaracion: true,
          Meta: { select: { metaPrincipal: true } }
        }
      }
    }
  });
  console.log('Usuario:', JSON.stringify(user, null, 2));
  await prisma.$disconnect();
}
check();
