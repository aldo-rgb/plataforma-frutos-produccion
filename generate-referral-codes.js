const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// IDs de los usuarios creados (57-86)
const userIds = [57, 58, 59, 60, 61, 62, 63, 64, 65, 66, 67, 68, 69, 70, 71, 72, 73, 74, 75, 76, 77, 78, 79, 80, 81, 82, 83, 84, 85, 86];

async function main() {
  console.log('=== Generando códigos de referencia para usuarios Vision 24 ===\n');
  
  let updated = 0;
  let skipped = 0;
  
  for (const userId of userIds) {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, referralCode: true }
    });
    
    if (!user) {
      console.log('❌ Usuario no encontrado: ' + userId);
      skipped++;
      continue;
    }
    
    if (user.referralCode) {
      console.log('⚠️ Ya tiene código: ' + user.nombre + ' -> ' + user.referralCode);
      skipped++;
      continue;
    }
    
    // Generar código único
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    const referralCode = user.nombre.substring(0, 3).toUpperCase() + timestamp + random;
    
    await prisma.usuario.update({
      where: { id: userId },
      data: { referralCode }
    });
    
    console.log('✅ ' + user.nombre + ' -> ' + referralCode);
    updated++;
    
    // Pequeña pausa para que los timestamps sean diferentes
    await new Promise(r => setTimeout(r, 10));
  }
  
  console.log('\n=== RESUMEN ===');
  console.log('Actualizados: ' + updated);
  console.log('Omitidos: ' + skipped);
  
  await prisma.$disconnect();
}

main();
