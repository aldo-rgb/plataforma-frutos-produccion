/**
 * Script para verificar y activar el usuario asociado a un mentor
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarYActivarUsuario() {
  console.log('🔍 Verificando usuarios de mentores...\n');

  const mentores = await prisma.perfilMentor.findMany({
    include: {
      Usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
          isActive: true,
        },
      },
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('┌─────┬─────────────────────────────┬──────────────┬──────────────┐');
  console.log('│ ID  │ Nombre                      │ Usuario      │ Mentor       │');
  console.log('│     │                             │ Activo       │ Disponible   │');
  console.log('├─────┼─────────────────────────────┼──────────────┼──────────────┤');

  mentores.forEach((mentor) => {
    const id = mentor.id.toString().padEnd(3);
    const nombre = mentor.Usuario.nombre.padEnd(27);
    const usuarioActivo = mentor.Usuario.isActive ? '✅ SI' : '❌ NO';
    const mentorDisponible = mentor.disponible ? '✅ SI' : '❌ NO';

    console.log(`│ ${id} │ ${nombre} │ ${usuarioActivo.padEnd(12)} │ ${mentorDisponible.padEnd(12)} │`);
  });

  console.log('└─────┴─────────────────────────────┴──────────────┴──────────────┘\n');

  // Buscar inconsistencias
  const inconsistencias = mentores.filter(
    (m) => m.disponible && !m.Usuario.isActive
  );

  if (inconsistencias.length > 0) {
    console.log('⚠️  INCONSISTENCIAS ENCONTRADAS:\n');
    inconsistencias.forEach((m) => {
      console.log(
        `   - Mentor ${m.id} (${m.Usuario.nombre}) está DISPONIBLE pero su usuario está INACTIVO`
      );
    });

    console.log('\n💡 Activando usuarios automáticamente...\n');

    for (const mentor of inconsistencias) {
      await prisma.usuario.update({
        where: { id: mentor.Usuario.id },
        data: { isActive: true },
      });
      console.log(`   ✅ Usuario activado: ${mentor.Usuario.nombre} (ID: ${mentor.Usuario.id})`);
    }

    console.log('\n✅ Todos los usuarios han sido activados.\n');
  } else {
    console.log('✅ No se encontraron inconsistencias. Todo está correcto.\n');
  }

  // Verificar mentor 3 específicamente
  const mentor3 = mentores.find((m) => m.id === 19);
  if (mentor3) {
    console.log(`\n🔍 MENTOR 3 (ID: 19) - ${mentor3.Usuario.nombre}:`);
    console.log(`   - Usuario ID: ${mentor3.Usuario.id}`);
    console.log(`   - Usuario activo: ${mentor3.Usuario.isActive ? '✅ SI' : '❌ NO'}`);
    console.log(`   - Mentor disponible: ${mentor3.disponible ? '✅ SI' : '❌ NO'}`);
    console.log(`   - Email: ${mentor3.Usuario.email}`);

    if (!mentor3.Usuario.isActive) {
      console.log(`\n⚠️  El usuario del mentor 3 está INACTIVO.`);
      console.log(`   Cuando lo actives desde el panel, el usuario también se activará automáticamente.\n`);
    }
  }
}

verificarYActivarUsuario()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
