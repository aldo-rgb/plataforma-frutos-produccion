/**
 * Script para generar tareas usando la API de review
 * Simula aprobación de cartas para triggear generación automática
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateTasksViaAPI() {
  console.log('\n🔍 Buscando usuarios con carta APROBADA sin tareas...\n');
  
  try {
    // Buscar todas las cartas APROBADAS
    const cartas = await prisma.cartaFrutos.findMany({
      where: {
        estado: 'APROBADA'
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: { usuarioId: 'asc' }
    });

    console.log(`📊 Total de cartas APROBADAS: ${cartas.length}\n`);

    let fixed = 0;
    let alreadyOk = 0;

    for (const carta of cartas) {
      const user = carta.Usuario;
      
      // Verificar si tiene tareas
      const taskCount = await prisma.taskInstance.count({
        where: { usuarioId: user.id }
      });

      if (taskCount === 0) {
        console.log(`❌ Usuario ${user.id} (${user.nombre}) - Carta ${carta.id} - SIN TAREAS`);
        console.log(`   📝 Generando tareas manualmente...`);
        
        // Hacer request a la API de review para triggear generación
        try {
          const response = await fetch('http://localhost:3000/api/carta/review', {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              cartaId: carta.id,
              area: 'finanzas', // Trigger con área dummy
              status: 'APROBADA', // Ya está aprobada, solo trigger
              feedback: 'Regeneración de tareas',
              reviewerId: 1 // Admin
            })
          });

          if (response.ok) {
            const data = await response.json();
            console.log(`   ✅ Tareas generadas: ${data.tasksGenerated || 'OK'}\n`);
            fixed++;
          } else {
            console.log(`   ⚠️  API error: ${response.statusText}\n`);
          }
        } catch (err) {
          console.log(`   ⚠️  Servidor no disponible, generando directo en DB...\n`);
          
          // Fallback: Generar directo
          await generateTasksDirectly(carta.id, user.id);
          fixed++;
        }
      } else {
        console.log(`✅ Usuario ${user.id} (${user.nombre}) - ${taskCount} tareas - OK`);
        alreadyOk++;
      }
    }

    console.log('\n📊 RESUMEN:');
    console.log(`   ✅ Ya tenían tareas: ${alreadyOk}`);
    console.log(`   🔧 Corregidos: ${fixed}`);
    console.log(`   📝 Total procesados: ${cartas.length}\n`);

  } catch (error) {
    console.error('❌ Error general:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

async function generateTasksDirectly(cartaId, usuarioId) {
  // Lógica simplificada de generación de tareas
  // Basada en taskGenerator.ts pero sin todas las dependencias
  
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

  if (!carta) return;

  const startDate = new Date();
  const cycleDays = 100; // Modo SOLO por defecto
  let tasksCreated = 0;

  for (const meta of carta.Meta) {
    for (const accion of meta.Accion) {
      const frequency = accion.frequency || 'WEEKLY';
      const assignedDays = accion.assignedDays || [];

      if (frequency === 'ONE_TIME') {
        // Una sola tarea al inicio
        await prisma.taskInstance.create({
          data: {
            accionId: accion.id,
            usuarioId: usuarioId,
            dueDate: startDate,
            originalDueDate: startDate,
            status: 'PENDING'
          }
        });
        tasksCreated++;
      } else if (frequency === 'WEEKLY' && assignedDays.length > 0) {
        // Generar para cada día asignado en el ciclo
        for (let dayOffset = 0; dayOffset < cycleDays; dayOffset++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + dayOffset);
          
          const dayOfWeek = currentDate.getDay(); // 0=Dom, 1=Lun, ..., 6=Sab
          
          if (assignedDays.includes(dayOfWeek)) {
            await prisma.taskInstance.create({
              data: {
                accionId: accion.id,
                usuarioId: usuarioId,
                dueDate: currentDate,
                originalDueDate: currentDate,
                status: 'PENDING'
              }
            });
            tasksCreated++;
          }
        }
      } else if (frequency === 'DAILY') {
        // Generar diariamente
        for (let dayOffset = 0; dayOffset < cycleDays; dayOffset++) {
          const currentDate = new Date(startDate);
          currentDate.setDate(currentDate.getDate() + dayOffset);
          
          await prisma.taskInstance.create({
            data: {
              accionId: accion.id,
              usuarioId: usuarioId,
              dueDate: currentDate,
              originalDueDate: currentDate,
              status: 'PENDING'
            }
          });
          tasksCreated++;
        }
      }
    }
  }

  console.log(`   ✅ ${tasksCreated} tareas creadas directamente`);
}

generateTasksViaAPI();
