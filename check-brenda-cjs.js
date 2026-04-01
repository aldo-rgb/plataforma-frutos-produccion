const { PrismaClient } = require('./node_modules/@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const brenda = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Brenda Elizabeth' } },
    select: { id: true, nombre: true }
  });

  if (!brenda) {
    console.log('Usuario no encontrado');
    await prisma.$disconnect();
    return;
  }

  console.log('Usuario:', brenda.nombre, 'ID:', brenda.id);

  const carta = await prisma.cartaFrutos.findFirst({
    where: { usuarioId: brenda.id }
  });

  if (!carta) {
    console.log('No tiene carta');
    await prisma.$disconnect();
    return;
  }

  console.log('Estado:', carta.estado);
  console.log('Finanzas Ser:', carta.finanzasSer || '(vacío)');
  console.log('Finanzas Obj:', carta.finanzasDeclaracion || '(vacío)');
  console.log('Relaciones Ser:', carta.relacionesSer || '(vacío)');
  console.log('Relaciones Obj:', carta.relacionesDeclaracion || '(vacío)');
  console.log('Talentos Ser:', carta.talentosSer || '(vacío)');
  console.log('Salud Ser:', carta.saludSer || '(vacío)');
  await prisma.$disconnect();
})();
