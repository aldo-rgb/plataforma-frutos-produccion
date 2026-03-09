/**
 * Script para corregir TaskInstances que quedaron con evidenceStatus: PENDING
 * pero su EvidenciaAccion ya fue APROBADA
 */
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixStuckTasks() {
  console.log('🔍 Buscando TaskInstances con evidenceStatus PENDING pero evidencia APROBADA...\n');

  // Buscar todos los TaskInstances que tienen evidenciaId y evidenceStatus = PENDING
  const tasksPending = await prisma.taskInstance.findMany({
    where: {
      evidenceStatus: 'PENDING',
      evidenciaId: { not: null }
    },
    include: {
      EvidenciaAccion: {
        select: {
          id: true,
          estado: true,
          fechaRevision: true
        }
      },
      Usuario: {
        select: { nombre: true }
      },
      Accion: {
        select: { texto: true }
      }
    }
  });

  console.log(`📊 Encontrados ${tasksPending.length} TaskInstances con evidenceStatus PENDING y evidenciaId vinculado\n`);

  let fixed = 0;
  let skipped = 0;

  for (const task of tasksPending) {
    if (!task.EvidenciaAccion) {
      console.log(`⚠️ TaskInstance ${task.id} tiene evidenciaId ${task.evidenciaId} pero no se encontró la evidencia`);
      skipped++;
      continue;
    }

    if (task.EvidenciaAccion.estado === 'APROBADA') {
      console.log(`✅ Corrigiendo TaskInstance ${task.id}:`);
      console.log(`   Usuario: ${task.Usuario?.nombre}`);
      console.log(`   Acción: ${task.Accion?.texto?.substring(0, 50)}...`);
      console.log(`   Evidencia ${task.evidenciaId} estado: ${task.EvidenciaAccion.estado}`);
      
      await prisma.taskInstance.update({
        where: { id: task.id },
        data: {
          status: 'COMPLETED',
          completedAt: task.EvidenciaAccion.fechaRevision || new Date(),
          evidenceStatus: 'APPROVED'
        }
      });
      
      console.log(`   → Actualizado a COMPLETED + APPROVED\n`);
      fixed++;
    } else if (task.EvidenciaAccion.estado === 'RECHAZADA') {
      console.log(`🔄 Corrigiendo TaskInstance ${task.id} (evidencia rechazada):`);
      console.log(`   Usuario: ${task.Usuario?.nombre}`);
      console.log(`   Acción: ${task.Accion?.texto?.substring(0, 50)}...`);
      
      await prisma.taskInstance.update({
        where: { id: task.id },
        data: {
          evidenceStatus: 'REJECTED'
        }
      });
      
      console.log(`   → Actualizado evidenceStatus a REJECTED\n`);
      fixed++;
    } else {
      console.log(`⏳ TaskInstance ${task.id} - Evidencia ${task.evidenciaId} aún en estado ${task.EvidenciaAccion.estado}`);
      skipped++;
    }
  }

  console.log('\n========================================');
  console.log(`📊 RESUMEN:`);
  console.log(`   ✅ Corregidos: ${fixed}`);
  console.log(`   ⏳ Omitidos (pendientes reales): ${skipped}`);
  console.log('========================================\n');

  await prisma.$disconnect();
}

fixStuckTasks().catch(console.error);
