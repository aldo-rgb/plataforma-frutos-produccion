/**
 * 🔴 SCRIPT: Desactivar Mentor para Testing
 * 
 * Cambia isActive a false para simular estado "esperando activación"
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function desactivarMentor() {
  try {
    // Buscar el mentor (cualquier mentor activo)
    const mentor = await prisma.usuario.findFirst({
      where: { 
        rol: 'MENTOR'
      }
    });

    if (!mentor) {
      console.log('❌ No se encontró el mentor');
      return;
    }

    console.log(`👤 Mentor encontrado: ${mentor.nombre}`);
    console.log(`📧 Email: ${mentor.email}`);
    console.log(`🔵 isActive actual: ${mentor.isActive}`);
    console.log('');

    // Cambiar isActive a false
    await prisma.usuario.update({
      where: { id: mentor.id },
      data: { isActive: false }
    });

    console.log('✅ Mentor desactivado correctamente!');
    console.log('🔵 Ahora debería mostrar alerta azul "Esperando Activación"');
    console.log('🔄 Refresca el dashboard para ver el cambio\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

desactivarMentor();
