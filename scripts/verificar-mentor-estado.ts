/**
 * Script para verificar y actualizar el estado de disponibilidad de un mentor
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarEstados() {
  console.log('📊 Verificando estados de mentores...\n');

  const mentores = await prisma.perfilMentor.findMany({
    include: {
      Usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('┌─────┬─────────────────────────────┬────────────────────────┬─────────────┬────────────┐');
  console.log('│ ID  │ Nombre                      │ Email                  │ Disponible  │ Destacado  │');
  console.log('├─────┼─────────────────────────────┼────────────────────────┼─────────────┼────────────┤');

  mentores.forEach((mentor) => {
    const id = mentor.id.toString().padEnd(3);
    const nombre = mentor.Usuario.nombre.padEnd(27);
    const email = mentor.Usuario.email.padEnd(22);
    const disponible = mentor.disponible ? '✅ SI' : '❌ NO';
    const destacado = mentor.destacado ? '⭐ SI' : '   NO';

    console.log(`│ ${id} │ ${nombre} │ ${email} │ ${disponible.padEnd(11)} │ ${destacado.padEnd(10)} │`);
  });

  console.log('└─────┴─────────────────────────────┴────────────────────────┴─────────────┴────────────┘\n');

  // Buscar específicamente el mentor con id 3 (junior)
  const mentor3 = mentores.find((m) => m.id === 3);
  
  if (mentor3) {
    console.log(`\n🔍 MENTOR 3 (${mentor3.Usuario.nombre}):`);
    console.log(`   - ID Perfil: ${mentor3.id}`);
    console.log(`   - ID Usuario: ${mentor3.Usuario.id}`);
    console.log(`   - Disponible en DB: ${mentor3.disponible}`);
    console.log(`   - Destacado en DB: ${mentor3.destacado}`);
    console.log(`   - Nivel: ${mentor3.nivel}`);
    
    if (mentor3.disponible) {
      console.log(`\n⚠️  El mentor 3 está ACTIVO en la base de datos.`);
      console.log(`\n💡 Para cambiar su estado a INACTIVO, ejecuta:`);
      console.log(`   npx ts-node --compiler-options '{"module":"commonjs"}' scripts/cambiar-estado-mentor.ts 3 false\n`);
    } else {
      console.log(`\n✅ El mentor 3 está INACTIVO en la base de datos (correcto).`);
    }
  }
}

verificarEstados()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
