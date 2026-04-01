import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const reports = await prisma.bugReport.findMany({
    orderBy: { createdAt: 'desc' },
    take: 10,
    include: {
      Usuario: { select: { id: true, nombre: true, email: true } }
    }
  });
  
  console.log('Total reportes:', reports.length);
  
  if (reports.length > 0) {
    reports.forEach(r => {
      console.log(`\n--- Reporte #${r.id} ---`);
      console.log('Usuario:', r.Usuario.nombre, r.Usuario.email);
      console.log('Estado:', r.status);
      console.log('Descripción:', r.description?.substring(0, 100) + '...');
      console.log('Fecha:', r.createdAt);
      console.log('URL:', r.pageUrl);
    });
  } else {
    console.log('No hay reportes en la base de datos');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
