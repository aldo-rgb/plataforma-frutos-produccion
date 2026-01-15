const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  // Buscar productos con fechas de enero 2026
  const productos = await prisma.schoolProduct.findMany({
    where: {
      type: 'CORE_TRAINING',
      isActive: true,
      startDate: {
        gte: new Date('2026-01-01'),
        lt: new Date('2026-02-01')
      }
    },
    include: {
      Trainer: { select: { id: true, nombre: true } },
      Coordinator: { select: { id: true, nombre: true } },
      Vision: { select: { id: true, nombre: true } },
      Organization: { select: { id: true, name: true } }
    }
  });
  
  console.log('=== PRODUCTOS DE ENERO 2026 ===\n');
  
  for (const p of productos) {
    console.log(`\nProducto ${p.id} (${p.levelType}):`);
    console.log(`  Visión: ${p.Vision?.id} - ${p.Vision?.nombre}`);
    console.log(`  Org: ${p.Organization.name}`);
    console.log(`  Fechas: ${p.startDate?.toISOString().split('T')[0]} - ${p.endDate?.toISOString().split('T')[0]}`);
    console.log(`  coordinatorId: ${p.coordinatorId} -> ${p.Coordinator?.nombre || 'null'}`);
    console.log(`  trainerId: ${p.trainerId} -> ${p.Trainer?.nombre || 'null'}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
