const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function debugCarta() {
  try {
    const cartaId = 18;
    
    console.log('🔍 Analizando Carta #18...\n');

    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: {
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    if (!carta) {
      console.error('❌ Carta no encontrada');
      return;
    }

    console.log(`✅ Carta ID: ${carta.id}`);
    console.log(`   Usuario ID: ${carta.usuarioId}`);
    console.log(`   Estado: ${carta.estado}`);
    console.log(`   Total Metas: ${carta.Meta.length}\n`);

    // Analizar cada meta y sus acciones
    for (const meta of carta.Meta) {
      console.log(`📋 Meta #${meta.id} - ${meta.categoria}`);
      console.log(`   Declaración: ${meta.declaracionPoder?.substring(0, 50)}...`);
      console.log(`   Meta Principal: ${meta.metaPrincipal?.substring(0, 50)}...`);
      console.log(`   Total Acciones: ${meta.Accion.length}`);
      
      if (meta.Accion.length === 0) {
        console.log('   ⚠️  NO HAY ACCIONES PARA ESTA META');
      } else {
        for (const accion of meta.Accion) {
          console.log(`   - Acción #${accion.id}: "${accion.texto.substring(0, 40)}..."`);
          console.log(`     Frecuencia: ${accion.frequency || 'NO DEFINIDA'}`);
          console.log(`     Días asignados: ${JSON.stringify(accion.assignedDays)}`);
          console.log(`     Requiere evidencia: ${accion.requiereEvidencia}`);
          
          if (!accion.frequency) {
            console.log('     ❌ ERROR: Frecuencia no definida - NO SE GENERARÁN TAREAS');
          } else if (accion.frequency !== 'ONE_TIME' && (!accion.assignedDays || accion.assignedDays.length === 0)) {
            console.log('     ❌ ERROR: Días no asignados para frecuencia recurrente - NO SE GENERARÁN TAREAS');
          } else {
            console.log('     ✅ Configuración válida');
          }
        }
      }
      console.log('');
    }

    // Contar acciones válidas
    let validActions = 0;
    let invalidActions = 0;
    
    for (const meta of carta.Meta) {
      for (const accion of meta.Accion) {
        if (accion.frequency) {
          const hasValidDays = accion.assignedDays?.length > 0 || accion.frequency === 'ONE_TIME';
          if (hasValidDays) {
            validActions++;
          } else {
            invalidActions++;
          }
        } else {
          invalidActions++;
        }
      }
    }

    console.log('📊 RESUMEN:');
    console.log(`   Total Metas: ${carta.Meta.length}`);
    console.log(`   Total Acciones: ${carta.Meta.reduce((sum, m) => sum + m.Accion.length, 0)}`);
    console.log(`   Acciones válidas (generarán tareas): ${validActions}`);
    console.log(`   Acciones inválidas (NO generarán tareas): ${invalidActions}`);
    
    if (validActions === 0) {
      console.log('\n❌ NO SE PUEDEN GENERAR TAREAS - No hay acciones válidas');
      console.log('   Posibles causas:');
      console.log('   1. Las acciones no tienen frequency definido');
      console.log('   2. Las acciones no tienen assignedDays configurados');
      console.log('   3. La carta fue guardada antes de configurar las acciones');
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

debugCarta();
