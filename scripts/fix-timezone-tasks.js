/**
 * SCRIPT: Arreglar tareas con fechas UTC incorrectas
 * 
 * Problema: Las tareas se generaron con dueDate en UTC medianoche,
 * lo que al convertirse a zona horaria de México (UTC-6) muestra
 * el día anterior a las 6:00 PM.
 * 
 * Solución: 
 * 1. Borrar todas las tareas de v1@next.com y v4@next.com
 * 2. Regenerar con la función corregida que usa zonedTimeToUtc
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔧 ARREGLANDO TAREAS CON TIMEZONE INCORRECTO\n');
  console.log('=' .repeat(60));

  try {
    // 1. Identificar usuarios
    const v1 = await prisma.usuario.findUnique({
      where: { email: 'v1@next.com' },
      select: { id: true, email: true, nombre: true }
    });

    const v4 = await prisma.usuario.findUnique({
      where: { email: 'v4@next.com' },
      select: { id: true, email: true, nombre: true }
    });

    if (!v1 || !v4) {
      console.error('❌ No se encontraron los usuarios v1 o v4');
      return;
    }

    console.log(`\n📋 Usuarios identificados:`);
    console.log(`   • v1: ${v1.nombre} (ID: ${v1.id})`);
    console.log(`   • v4: ${v4.nombre} (ID: ${v4.id})`);

    // 2. Contar tareas actuales
    const v1Count = await prisma.taskInstance.count({
      where: { usuarioId: v1.id }
    });

    const v4Count = await prisma.taskInstance.count({
      where: { usuarioId: v4.id }
    });

    console.log(`\n📊 Tareas actuales con timezone incorrecto:`);
    console.log(`   • v1: ${v1Count} tareas`);
    console.log(`   • v4: ${v4Count} tareas`);

    // 3. Borrar tareas existentes
    console.log(`\n🗑️  Borrando tareas con fechas incorrectas...`);
    
    const deletedV1 = await prisma.taskInstance.deleteMany({
      where: { usuarioId: v1.id }
    });

    const deletedV4 = await prisma.taskInstance.deleteMany({
      where: { usuarioId: v4.id }
    });

    console.log(`   ✓ v1: ${deletedV1.count} tareas borradas`);
    console.log(`   ✓ v4: ${deletedV4.count} tareas borradas`);

    console.log(`\n✅ Tareas borradas exitosamente`);
    console.log(`\n📝 SIGUIENTE PASO:`);
    console.log(`   Ejecuta los siguientes comandos:`);
    console.log(`   1. npx tsx scripts/generate-tasks-v1.ts`);
    console.log(`   2. npx tsx scripts/generate-tasks-v4.ts`);
    console.log(`\n   Las tareas se regenerarán con el timezone correcto`);
    console.log(`   (medianoche en México, no medianoche en UTC)`);

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
