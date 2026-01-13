const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient({
  log: [] // Sin logs de SQL
});

async function check() {
  try {
    // Verificar coordinadores
    const coordinadores = await prisma.usuario.findMany({
      where: {
        rol: { in: ['coordinadorBasico', 'coordinadorAvanzado', 'admin', 'superAdmin'] }
      },
      select: { id: true, nombre: true, rol: true, organizationId: true }
    });
    console.log('=== COORDINADORES ===');
    coordinadores.forEach(c => {
      console.log(`ID: ${c.id}, Nombre: ${c.nombre}, Rol: ${c.rol}, OrgID: ${c.organizationId}`);
    });
    
    // Squads y sus organizaciones
    const squads = await prisma.smallGroup.findMany({
      select: { id: true, name: true, organizationId: true }
    });
    console.log('\n=== SQUADS ===');
    squads.forEach(s => {
      console.log(`ID: ${s.id}, Nombre: ${s.name}, OrgID: ${s.organizationId}`);
    });

    // Intentos de llamada
    const attempts = await prisma.gCCallAttempt.count();
    console.log('\n=== ATTEMPTS ===');
    console.log(`Total: ${attempts}`);

  } catch (e) {
    console.error('Error:', e.message);
  }
  await prisma.$disconnect();
}

check();
