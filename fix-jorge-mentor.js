const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixJorgeAndGenerateTasks() {
  try {
    const email = 'jorge@frutos.com';
    
    console.log('\n========================================');
    console.log('🔧 REPARANDO Y GENERANDO TAREAS PARA JORGE');
    console.log('========================================\n');

    // 1. Obtener usuario
    const usuario = await prisma.usuario.findUnique({
      where: { email }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log('✅ Usuario encontrado:', usuario.nombre, '(ID:', usuario.id + ')');

    // 2. Buscar un mentor genérico o crear uno si no existe
    // En sistemas FREE, podemos asignar un "mentor virtual" o el admin
    let mentorFree = await prisma.usuario.findFirst({
      where: {
        rol: 'ADMINISTRADOR', // Usar el admin como mentor FREE
        isActive: true
      }
    });

    if (!mentorFree) {
      console.log('⚠️ No se encontró un admin activo, buscando mentores...');
      mentorFree = await prisma.usuario.findFirst({
        where: {
          rol: 'MENTOR',
          isActive: true
        }
      });
    }

    if (!mentorFree) {
      console.log('❌ No se encontró ningún mentor o admin disponible');
      return;
    }

    console.log('✅ Mentor asignado:', mentorFree.nombre, '(ID:', mentorFree.id + ')');

    // 3. Asignar mentor al usuario si no lo tiene
    if (!usuario.assignedMentorId) {
      console.log('\n📝 Asignando mentor a Jorge...');
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          assignedMentorId: mentorFree.id
        }
      });
      console.log('✅ Mentor asignado exitosamente');
    } else {
      console.log('ℹ️ El usuario ya tiene un mentor asignado (ID:', usuario.assignedMentorId + ')');
    }

    // 4. Verificar si ya tiene ProgramEnrollment
    const existingEnrollment = await prisma.programEnrollment.findFirst({
      where: { userId: usuario.id }
    });

    if (existingEnrollment) {
      console.log('\n⚠️ El usuario ya tiene un ProgramEnrollment');
      console.log('   ID:', existingEnrollment.id);
      console.log('   Estado:', existingEnrollment.status);
      console.log('   Tipo:', existingEnrollment.cycleType);
    } else {
      console.log('\nℹ️ No tiene ProgramEnrollment, se creará automáticamente');
    }

    console.log('\n========================================');
    console.log('✅ REPARACIÓN COMPLETADA');
    console.log('========================================');
    console.log('\nAhora ejecuta:');
    console.log('  npx tsx generate-jorge-tasks-direct.ts');
    console.log('\nPara generar las tareas.');

  } catch (error) {
    console.error('\n❌ ERROR:', error);
    console.error('Mensaje:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

fixJorgeAndGenerateTasks();
