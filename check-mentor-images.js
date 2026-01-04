const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkMentorImages() {
  try {
    const mentores = await prisma.usuario.findMany({
      where: { rol: 'MENTOR' },
      select: { 
        id: true, 
        nombre: true, 
        imagen: true,
        profileImage: true
      }
    });

    console.log('🖼️  Imágenes de Mentores:\n');
    mentores.forEach(m => {
      console.log(`${m.nombre}:`);
      console.log(`  imagen: ${m.imagen || 'NULL'}`);
      console.log(`  profileImage: ${m.profileImage || 'NULL'}`);
      console.log('');
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

checkMentorImages();
