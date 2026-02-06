const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Verificando mentores y game changers...\n');

  // Buscar mentores activos
  const mentores = await prisma.usuario.findMany({
    where: {
      rol: { in: ['MENTOR', 'LIDER'] },
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      email: true,
      rol: true
    },
    orderBy: {
      nombre: 'asc'
    }
  });

  console.log(`📊 Mentores/Líderes activos: ${mentores.length}`);
  if (mentores.length > 0) {
    mentores.forEach(mentor => {
      console.log(`   ✅ ${mentor.nombre} (${mentor.email}) - ${mentor.rol}`);
    });
  } else {
    console.log('   ⚠️  No hay mentores activos en la base de datos');
  }

  console.log('');

  // Buscar game changers activos
  const gameChangers = await prisma.usuario.findMany({
    where: {
      rol: 'GAMECHANGER',
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      email: true
    },
    orderBy: {
      nombre: 'asc'
    }
  });

  console.log(`🎮 Game Changers activos: ${gameChangers.length}`);
  if (gameChangers.length > 0) {
    gameChangers.forEach(gc => {
      console.log(`   ✅ ${gc.nombre} (${gc.email})`);
    });
  } else {
    console.log('   ⚠️  No hay game changers activos en la base de datos');
  }

  console.log('');
  console.log('💡 Si no hay mentores, el dashboard mostrará datos de ejemplo.');
  console.log('   Para crear mentores reales, usa el panel de administración');
  console.log('   en /dashboard/admin/mentores');
}

main()
  .catch((e) => {
    console.error('❌ Error:', e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
