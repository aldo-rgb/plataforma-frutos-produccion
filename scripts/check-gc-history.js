const { PrismaClient } = require('@prisma/client');

async function main() {
  const prisma = new PrismaClient();
  
  try {
    // Buscar el usuario
    const user = await prisma.usuario.findUnique({
      where: { email: 'gamegdl@zero.com' },
      select: { id: true, nombre: true, rol: true }
    });
    
    console.log('=== Usuario ===');
    console.log(JSON.stringify(user, null, 2));
    
    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }
    
    // Buscar SmallGroups (sin filtro de isActive)
    const smallGroups = await prisma.smallGroup.findMany({
      where: { leaderId: user.id },
      include: {
        vision: {
          select: { id: true, nombre: true, isActive: true, endDate: true }
        }
      }
    });
    
    console.log('\n=== SmallGroups donde es líder ===');
    console.log('Total:', smallGroups.length);
    
    for (const sg of smallGroups) {
      console.log(`\n- SmallGroup: ${sg.name}`);
      console.log(`  isActive: ${sg.isActive}`);
      console.log(`  Vision: ${sg.vision?.nombre || 'N/A'}`);
      console.log(`  Vision isActive: ${sg.vision?.isActive}`);
      console.log(`  Vision endDate: ${sg.vision?.endDate}`);
    }
    
    // También buscar en VisionGameChanger
    const vgc = await prisma.visionGameChanger.findMany({
      where: { gameChangerId: user.id },
      include: {
        Vision: {
          select: { id: true, nombre: true, isActive: true }
        }
      }
    });
    
    console.log('\n=== VisionGameChanger ===');
    console.log('Total:', vgc.length);
    for (const v of vgc) {
      console.log(`- Vision: ${v.Vision.nombre}, level: ${v.level}`);
    }
    
  } finally {
    await prisma.$disconnect();
  }
}

main().catch(console.error);
