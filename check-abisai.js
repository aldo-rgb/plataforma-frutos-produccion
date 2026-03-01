const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'perezcruza1b4@gmail.com' },
    select: { id: true, nombre: true, email: true }
  });
  
  console.log('Usuario:', JSON.stringify(user, null, 2));
  
  if (user) {
    const cartas = await prisma.cartaFrutos.findMany({
      where: { usuarioId: user.id },
      select: {
        id: true,
        estado: true,
        fechaCreacion: true,
        wizardStep: true,
        wizardCompletedAt: true
      }
    });
    
    console.log('Cartas encontradas:', cartas.length);
    console.log(JSON.stringify(cartas, null, 2));
  }
  
  await prisma.$disconnect();
}
check().catch(console.error);
