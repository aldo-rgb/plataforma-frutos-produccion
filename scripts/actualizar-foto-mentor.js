/**
 * Script para actualizar la foto de perfil del mentor
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function actualizarFoto() {
  try {
    const mentor = await prisma.usuario.findFirst({
      where: { rol: 'MENTOR' }
    });

    if (!mentor) {
      console.log('❌ No se encontró ningún mentor');
      return;
    }

    console.log(`📸 Actualizando foto de perfil para: ${mentor.nombre}`);

    await prisma.usuario.update({
      where: { id: mentor.id },
      data: {
        profileImage: 'https://picsum.photos/400'
      }
    });

    console.log('✅ Foto de perfil actualizada correctamente!');
    console.log('🔄 Refresca el dashboard para ver el cambio');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

actualizarFoto();
