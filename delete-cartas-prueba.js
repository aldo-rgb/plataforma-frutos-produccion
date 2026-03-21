const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  // Buscar usuario Prueba Sistema
  const usuario = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Prueba Sistema' } },
    select: { id: true, nombre: true, email: true }
  });
  
  console.log('Usuario:', usuario);
  
  if (!usuario) {
    console.log('Usuario no encontrado');
    return;
  }
  
  // Buscar cartas del usuario
  const cartas = await prisma.cartaFrutos.findMany({
    where: { usuarioId: usuario.id },
    select: { id: true, estado: true, fechaCreacion: true }
  });
  
  console.log('Cartas encontradas:', cartas);
  
  // Eliminar todas las cartas
  if (cartas.length > 0) {
    const deleted = await prisma.cartaFrutos.deleteMany({
      where: { usuarioId: usuario.id }
    });
    console.log('Cartas eliminadas:', deleted.count);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
