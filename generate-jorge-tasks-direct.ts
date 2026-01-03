/**
 * Script para generar tareas manualmente para Jorge
 * Ejecutar con: npx ts-node generate-jorge-tasks-direct.ts
 */

import { PrismaClient } from '@prisma/client';
import { generateTasksForLetter } from './lib/taskGenerator.js';

const prisma = new PrismaClient();

async function main() {
  try {
    const email = 'jorge@frutos.com';
    
    console.log('\n========================================');
    console.log('🔧 GENERANDO TAREAS PARA JORGE');
    console.log('========================================\n');

    // 1. Obtener usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', usuario.nombre);
    console.log('   ID:', usuario.id);

    // 2. Obtener su carta aprobada
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: usuario.id,
        estado: 'APROBADA'
      },
      orderBy: { fechaCreacion: 'desc' }
    });

    if (!carta) {
      console.log('❌ No se encontró carta aprobada');
      return;
    }

    console.log('✅ Carta encontrada:', carta.id);
    console.log('   Estado:', carta.estado);
    console.log('   Fecha Aprobación:', carta.fechaActualizacion);

    // 3. Verificar si ya tiene tareas
    const tareasExistentes = await prisma.taskInstance.findMany({
      where: { usuarioId: usuario.id }
    });

    console.log('\n📊 Tareas existentes:', tareasExistentes.length);

    if (tareasExistentes.length > 0) {
      console.log('⚠️ El usuario ya tiene', tareasExistentes.length, 'tareas.');
      console.log('⚠️ La función permitirá regeneración...');
    }

    // 4. Generar tareas usando la función del sistema
    console.log('\n🚀 Generando tareas...\n');
    
    const result = await generateTasksForLetter(carta.id);

    if (!result.success) {
      console.error('\n❌ ERROR AL GENERAR TAREAS');
      console.error('Errores:', result.errors);
      return;
    }

    console.log('\n✅ TAREAS GENERADAS EXITOSAMENTE');
    console.log('   Total de tareas:', result.tasksCreated);

    // 5. Verificar las tareas creadas
    const nuevasTareas = await prisma.taskInstance.findMany({
      where: { usuarioId: usuario.id },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    console.log('\n📋 PRIMERAS 10 TAREAS CREADAS:');
    nuevasTareas.forEach((tarea, index) => {
      console.log(`\n${index + 1}. ${tarea.Accion?.texto || 'Sin título'}`);
      console.log(`   Área: ${tarea.Accion?.Meta?.categoria || 'N/A'}`);
      console.log(`   Fecha: ${tarea.dueDate.toISOString().split('T')[0]}`);
      console.log(`   Día semana: ${tarea.dayOfWeek || 'N/A'}`);
      console.log(`   Estado: ${tarea.status}`);
    });

    // 6. Contar tareas por área
    const todasLasTareas = await prisma.taskInstance.findMany({
      where: { usuarioId: usuario.id },
      include: {
        Accion: {
          include: {
            Meta: true
          }
        }
      }
    });

    const tareasPorArea: Record<string, number> = {};
    todasLasTareas.forEach(tarea => {
      const area = tarea.Accion?.Meta?.categoria || 'Sin área';
      tareasPorArea[area] = (tareasPorArea[area] || 0) + 1;
    });

    console.log('\n📊 DISTRIBUCIÓN DE TAREAS POR ÁREA:');
    Object.entries(tareasPorArea).forEach(([area, count]) => {
      console.log(`   ${area}: ${count} tareas`);
    });

    console.log('\n========================================');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('========================================\n');

  } catch (error: any) {
    console.error('\n❌ ERROR:', error);
    console.error('Detalles:', error.message);
    if (error.stack) {
      console.error('Stack:', error.stack);
    }
  } finally {
    await prisma.$disconnect();
  }
}

main();
