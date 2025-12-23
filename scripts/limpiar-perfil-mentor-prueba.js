/**
 * 🧹 SCRIPT: Limpiar perfil de "mentor prueba"
 * 
 * Vacía todos los campos de perfil para testing de estados
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function limpiarPerfilMentorPrueba() {
  try {
    const mentor = await prisma.usuario.findFirst({
      where: { email: 'mentor@frutos.com' }
    });

    if (!mentor) {
      console.log('❌ No se encontró mentor@frutos.com');
      return;
    }

    console.log(`👤 Encontrado: ${mentor.nombre}`);
    console.log(`📧 Email: ${mentor.email}`);
    console.log('');

    // Limpiar campos de perfil Y desactivar
    await prisma.usuario.update({
      where: { id: mentor.id },
      data: {
        profileImage: null,
        jobTitle: null,
        bioShort: null,
        bioFull: null,
        skills: [],
        experienceYears: 0,  // Requerido, no puede ser null
        isActive: false  // Desactivar para estado inicial
      }
    });

    console.log('✅ Perfil limpiado correctamente!');
    console.log('');
    console.log('📊 ESTADO ACTUAL:');
    console.log('   • isActive: false (desactivado)');
    console.log('   • profileImage: (vacío)');
    console.log('   • jobTitle: (vacío)');
    console.log('   • bioShort: (vacío)');
    console.log('   • skills: []');
    console.log('');
    console.log('🟠 Debería mostrar: Alerta NARANJA (faltan campos)');
    console.log('🔄 Refresca el dashboard para ver el cambio\n');

  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

limpiarPerfilMentorPrueba();
