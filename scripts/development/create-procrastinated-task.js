const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  try {
    // 1. Verificar usuario 57 (Usuario 10)
    const usuario = await prisma.usuario.findUnique({
      where: { id: 57 },
      select: {
        id: true,
        nombre: true,
        email: true,
        assignedMentorId: true,
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });
    
    if (!usuario) {
      console.log('❌ Usuario 57 (Usuario 10) no encontrado');
      process.exit(1);
    }
    
    console.log('✅ Usuario encontrado:');
    console.log(`   Nombre: ${usuario.nombre}`);
    console.log(`   Email: ${usuario.email}`);
    console.log(`   Mentor: ${usuario.Usuario_Usuario_assignedMentorIdToUsuario?.nombre || 'Sin mentor'}`);
    
    // 2. Buscar carta aprobada
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: 57,
        estado: 'APROBADA'
      },
      include: {
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });
    
    if (!carta) {
      console.log('❌ No se encontró carta aprobada para usuario 57 (Usuario 10)');
      process.exit(1);
    }
    
    console.log(`\n✅ Carta aprobada encontrada: ID ${carta.id}`);
    console.log(`   Metas: ${carta.Meta.length}`);
    
    // 3. Buscar una acción
    let accion = null;
    for (const meta of carta.Meta) {
      if (meta.Accion.length > 0) {
        accion = meta.Accion[0];
        console.log(`\n✅ Acción encontrada:`);
        console.log(`   ID: ${accion.id}`);
        console.log(`   Texto: ${accion.texto}`);
        console.log(`   Meta: ${meta.categoria}`);
        break;
      }
    }
    
    if (!accion) {
      console.log('❌ No se encontraron acciones en la carta');
      process.exit(1);
    }
    
    // 4. Buscar TaskInstance existente o crear una nueva
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    
    let taskInstance = await prisma.taskInstance.findFirst({
      where: {
        usuarioId: 57,
        accionId: accion.id,
        status: 'PENDING'
      }
    });
    
    if (!taskInstance) {
      console.log('\n📝 Creando nueva TaskInstance...');
      taskInstance = await prisma.taskInstance.create({
        data: {
          usuarioId: 57,
          accionId: accion.id,
          dueDate: hoy,
          originalDueDate: hoy,
          status: 'PENDING',
          postponeCount: 0
        }
      });
      console.log(`✅ TaskInstance creada: ID ${taskInstance.id}`);
    } else {
      console.log(`\n✅ TaskInstance existente encontrada: ID ${taskInstance.id}`);
    }
    
    // 5. Actualizar a postponeCount = 3 para activar la alerta
    console.log('\n🔄 Actualizando postponeCount a 3...');
    
    const fechaReagendada = new Date(hoy);
    fechaReagendada.setDate(fechaReagendada.getDate() + 3); // 3 días después
    
    const updatedTask = await prisma.taskInstance.update({
      where: { id: taskInstance.id },
      data: {
        postponeCount: 3,
        dueDate: fechaReagendada,
        originalDueDate: taskInstance.originalDueDate || hoy,
        updatedAt: new Date()
      }
    });
    
    console.log(`✅ Tarea actualizada con postponeCount: ${updatedTask.postponeCount}`);
    console.log(`   Nueva fecha: ${updatedTask.dueDate.toLocaleDateString('es-MX')}`);
    
    // 6. Crear alerta para el mentor
    if (usuario.assignedMentorId) {
      console.log('\n🔔 Creando alerta para el mentor...');
      
      const meta = carta.Meta.find(m => m.Accion.some(a => a.id === accion.id));
      
      const alert = await prisma.mentorAlert.create({
        data: {
          mentorId: usuario.assignedMentorId,
          usuarioId: usuario.id,
          taskInstanceId: updatedTask.id,
          type: 'RISK_ALERT',
          message: `⚠️ ${usuario.nombre} está procrastinando la tarea "${accion.texto}" del área ${meta?.categoria}. Ha sido pospuesta 3 veces.`,
          read: false
        }
      });
      
      console.log(`✅ Alerta creada: ID ${alert.id}`);
      console.log(`   Mentor ID: ${usuario.assignedMentorId} (${usuario.Usuario_Usuario_assignedMentorIdToUsuario?.nombre})`);
      console.log(`   Mensaje: ${alert.message}`);
    } else {
      console.log('\n⚠️ Usuario 57 (Usuario 10) no tiene mentor asignado, no se creó alerta');
    }
    
    console.log('\n✨ Proceso completado exitosamente!');
    console.log('\n📋 Para verificar:');
    console.log('   1. Inicia sesión como el mentor asignado');
    console.log('   2. Ve al dashboard de mentor: /dashboard/mentor');
    console.log('   3. Deberías ver el widget de alertas de procrastinación');
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
})();
