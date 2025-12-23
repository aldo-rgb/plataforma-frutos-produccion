/**
 * Script para desactivar un usuario
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function desactivarUsuario() {
  const usuarioId = parseInt(process.argv[2]);

  if (!usuarioId || isNaN(usuarioId)) {
    console.error('❌ Debes proporcionar un ID de usuario válido');
    console.log('💡 Uso: npx ts-node --compiler-options \'{"module":"commonjs"}\' scripts/desactivar-usuario.ts <usuarioId>');
    process.exit(1);
  }

  console.log(`\n🔍 Buscando usuario con ID ${usuarioId}...`);

  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
  });

  if (!usuario) {
    console.error(`❌ No se encontró usuario con ID ${usuarioId}`);
    process.exit(1);
  }

  console.log(`\n📋 Usuario encontrado:`);
  console.log(`   - Nombre: ${usuario.nombre}`);
  console.log(`   - Email: ${usuario.email}`);
  console.log(`   - Rol: ${usuario.rol}`);
  console.log(`   - Estado actual: ${usuario.isActive ? '✅ ACTIVO' : '❌ INACTIVO'}`);

  if (!usuario.isActive) {
    console.log(`\n⚠️  El usuario ya está INACTIVO. No es necesario actualizar.`);
    process.exit(0);
  }

  console.log(`\n🔄 Desactivando usuario...`);

  await prisma.usuario.update({
    where: { id: usuarioId },
    data: { isActive: false },
  });

  console.log(`\n✅ Usuario desactivado correctamente!`);
  console.log(`   ${usuario.nombre} ahora está ❌ INACTIVO\n`);
}

desactivarUsuario()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
