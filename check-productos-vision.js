const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Obtener todas las visiones activas con sus productos
  const visiones = await prisma.vision.findMany({
    where: {
      isActive: true
    },
    include: {
      Organization: {
        select: { name: true }
      }
    },
    take: 5
  });
  
  console.log('=== VISIONES ACTIVAS ===\n');
  
  for (const vision of visiones) {
    console.log(`\n--- Visión ${vision.id}: ${vision.name} (${vision.Organization.name}) ---`);
    
    const productos = await prisma.schoolProduct.findMany({
      where: {
        visionId: vision.id,
        type: 'CORE_TRAINING',
        isActive: true
      },
      include: {
        Trainer: {
          select: { id: true, nombre: true, email: true }
        },
        Coordinator: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });
    
    console.log(`Productos encontrados: ${productos.length}`);
    
    for (const p of productos) {
      console.log(`\n  📦 ${p.levelType}:`);
      console.log(`     - ID: ${p.id}`);
      console.log(`     - coordinatorId: ${p.coordinatorId}`);
      console.log(`     - trainerId: ${p.trainerId}`);
      console.log(`     - Coordinator: ${JSON.stringify(p.Coordinator)}`);
      console.log(`     - Trainer: ${JSON.stringify(p.Trainer)}`);
    }
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
