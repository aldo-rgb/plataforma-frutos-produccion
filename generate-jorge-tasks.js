const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Importar la función de generación de tareas
// Como es un script Node.js y la lib está en TypeScript, necesitamos hacerlo manualmente

async function generateTasksForJorge() {
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
      console.log('⚠️ El usuario ya tiene tareas. ¿Quieres eliminarlas primero?');
      console.log('   Ejecuta: node delete-jorge-tasks.js');
      console.log('   Luego vuelve a ejecutar este script');
      return;
    }

    // 4. Llamar al API interno para generar tareas
    console.log('\n🚀 Generando tareas llamando al API...');
    
    // Como estamos en un script, necesitamos hacer la llamada HTTP
    const fetch = (await import('node-fetch')).default;
    
    const response = await fetch('http://localhost:3000/api/carta/approve', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ cartaId: carta.id })
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('❌ Error del API:', error);
      return;
    }

    const result = await response.json();
    console.log('\n✅ TAREAS GENERADAS EXITOSAMENTE');
    console.log('   Total de tareas:', result.tasksCreated);
    console.log('   Mensaje:', result.message);

    // 5. Verificar las tareas creadas
    const nuevasTareas = await prisma.taskInstance.findMany({
      where: { usuarioId: usuario.id },
      include: {
        Accion: {
          include: {
            AreaDesarrollo: true
          }
        }
      },
      orderBy: { dueDate: 'asc' },
      take: 10
    });

    console.log('\n📋 PRIMERAS 10 TAREAS CREADAS:');
    nuevasTareas.forEach((tarea, index) => {
      console.log(`\n${index + 1}. ${tarea.Accion?.titulo || 'Sin título'}`);
      console.log(`   Área: ${tarea.Accion?.AreaDesarrollo?.nombre || 'N/A'}`);
      console.log(`   Fecha: ${tarea.dueDate.toISOString().split('T')[0]}`);
      console.log(`   Día semana: ${tarea.dayOfWeek || 'N/A'}`);
    });

    console.log('\n========================================');
    console.log('✅ PROCESO COMPLETADO EXITOSAMENTE');
    console.log('========================================\n');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Detalles:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
generateTasksForJorge();
