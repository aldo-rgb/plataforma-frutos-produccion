/**
 * SCRIPT: Verificar que el fix de timezone esté funcionando correctamente
 * 
 * Este script verifica que las tareas se estén almacenando con la hora correcta
 * para que se muestren como el día correcto en la zona horaria de México.
 * 
 * Solución implementada:
 * - dateCalculator.ts crea fechas a las 12:00 PM hora local (mediodía)
 * - Esto se almacena como 18:00 UTC (12:00 PM + 6 horas offset)
 * - Al convertir a hora local de México (UTC-6), se muestra como 12:00 PM del día correcto
 * 
 * Alternativa aceptable:
 * - Fecha a las 06:00 UTC = medianoche en México = fecha correcta pero hora 00:00
 * 
 * ERROR si se ve:
 * - Fecha a las 00:00 UTC = 6:00 PM del día ANTERIOR en México ❌
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('\n🔍 VERIFICACIÓN DE TIMEZONE FIX');
  console.log('=' .repeat(70));
  
  try {
    // Buscar las primeras 5 tareas más recientes
    const tasks = await prisma.taskInstance.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: {
        id: true,
        dueDate: true,
        createdAt: true,
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (tasks.length === 0) {
      console.log('\n⚠️  No hay tareas en la base de datos para verificar');
      return;
    }

    console.log(`\n📋 Verificando ${tasks.length} tareas más recientes:\n`);

    let correctCount = 0;
    let warningCount = 0;
    let errorCount = 0;

    tasks.forEach((task, i) => {
      const utc = task.dueDate.toISOString();
      const mx = task.dueDate.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' });
      const [fecha, hora] = mx.split(', ');
      
      console.log(`Tarea #${i + 1} (ID: ${task.id}) - Usuario: ${task.Usuario.nombre}`);
      console.log(`  Creada: ${task.createdAt.toLocaleString('es-MX', { timeZone: 'America/Mexico_City' })}`);
      console.log(`  Due Date (UTC): ${utc}`);
      console.log(`  Due Date (MX):  ${mx}`);

      // Verificar el formato
      if (utc.includes('T18:00:00.000Z')) {
        console.log(`  ✅ PERFECTO - Almacenada a las 18:00 UTC (mediodía en México)`);
        correctCount++;
      } else if (utc.includes('T06:00:00.000Z')) {
        console.log(`  ⚠️  ACEPTABLE - Almacenada a las 06:00 UTC (medianoche en México)`);
        warningCount++;
      } else if (utc.includes('T00:00:00.000Z')) {
        console.log(`  ❌ ERROR - Almacenada a las 00:00 UTC (6PM día anterior en México)`);
        console.log(`     Esta tarea muestra fecha incorrecta para el usuario`);
        errorCount++;
      } else {
        console.log(`  ⚠️  HORA INUSUAL - Verificar manualmente`);
        warningCount++;
      }
      console.log('');
    });

    // Resumen
    console.log('=' .repeat(70));
    console.log('\n📊 RESUMEN:');
    console.log(`  ✅ Correctas: ${correctCount}`);
    console.log(`  ⚠️  Aceptables: ${warningCount}`);
    console.log(`  ❌ Erróneas: ${errorCount}`);
    
    if (errorCount === 0 && correctCount > 0) {
      console.log('\n🎉 TIMEZONE FIX FUNCIONANDO CORRECTAMENTE');
      console.log('   Las nuevas tareas se almacenan con la hora correcta');
    } else if (errorCount === 0 && warningCount > 0) {
      console.log('\n✅ TIMEZONE FIX FUNCIONAL');
      console.log('   Las fechas se muestran correctamente aunque usen medianoche');
    } else if (errorCount > 0) {
      console.log('\n⚠️  HAY TAREAS CON TIMEZONE INCORRECTO');
      console.log('   Verifica que los nuevos usuarios usen el código actualizado');
    } else {
      console.log('\n⚠️  NO SE ENCONTRARON TAREAS RECIENTES PARA VERIFICAR');
    }

  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

main();
