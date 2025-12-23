/**
 * Script para cambiar el estado de disponibilidad de un mentor
 * 
 * Uso:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/cambiar-estado-mentor.ts <mentorId> <true|false>
 * 
 * Ejemplo:
 * npx ts-node --compiler-options '{"module":"commonjs"}' scripts/cambiar-estado-mentor.ts 3 false
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cambiarEstado() {
  const mentorId = parseInt(process.argv[2]);
  const nuevoEstado = process.argv[3] === 'true';

  if (!mentorId || isNaN(mentorId)) {
    console.error('❌ Debes proporcionar un ID de mentor válido');
    console.log('💡 Uso: npx ts-node --compiler-options \'{"module":"commonjs"}\' scripts/cambiar-estado-mentor.ts <mentorId> <true|false>');
    process.exit(1);
  }

  if (process.argv[3] !== 'true' && process.argv[3] !== 'false') {
    console.error('❌ El estado debe ser "true" o "false"');
    process.exit(1);
  }

  console.log(`\n🔄 Buscando mentor con ID ${mentorId}...`);

  const mentor = await prisma.perfilMentor.findUnique({
    where: { id: mentorId },
    include: {
      Usuario: {
        select: {
          nombre: true,
          email: true,
        },
      },
    },
  });

  if (!mentor) {
    console.error(`❌ No se encontró mentor con ID ${mentorId}`);
    process.exit(1);
  }

  console.log(`\n📋 Mentor encontrado:`);
  console.log(`   - Nombre: ${mentor.Usuario.nombre}`);
  console.log(`   - Email: ${mentor.Usuario.email}`);
  console.log(`   - Estado actual: ${mentor.disponible ? '✅ ACTIVO' : '❌ INACTIVO'}`);
  console.log(`   - Nuevo estado: ${nuevoEstado ? '✅ ACTIVO' : '❌ INACTIVO'}`);

  if (mentor.disponible === nuevoEstado) {
    console.log(`\n⚠️  El mentor ya tiene ese estado. No es necesario actualizar.`);
    process.exit(0);
  }

  console.log(`\n🔄 Actualizando estado...`);

  await prisma.perfilMentor.update({
    where: { id: mentorId },
    data: {
      disponible: nuevoEstado,
    },
  });

  console.log(`\n✅ Estado actualizado correctamente!`);
  console.log(`   ${mentor.Usuario.nombre} ahora está ${nuevoEstado ? '✅ ACTIVO' : '❌ INACTIVO'}\n`);
}

cambiarEstado()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
