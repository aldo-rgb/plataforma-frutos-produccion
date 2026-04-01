import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Buscar organización con disciplina configurada
  const orgs = await prisma.organization.findMany({
    where: {
      disciplineEnabled: true
    },
    select: {
      id: true,
      name: true,
      disciplineEnabled: true,
      disciplineDays: true,
      disciplineStartTime: true,
      disciplineEndTime: true
    }
  });
  
  console.log('=== ORGANIZACIONES CON DISCIPLINA ===');
  orgs.forEach(o => {
    console.log(`\n${o.name} (ID: ${o.id})`);
    console.log(`  Días: ${o.disciplineDays}`);
    console.log(`  Horario: ${o.disciplineStartTime} - ${o.disciplineEndTime}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
