const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAll() {
  // Verificar Iri y otros usuarios conocidos
  const users = await prisma.usuario.findMany({
    where: { id: { in: [34, 29, 33, 42, 22, 30] } },
    select: { id: true, nombre: true, profileImage: true }
  });
  
  console.log('=== USUARIOS Y SUS IMÁGENES ===');
  users.forEach(u => {
    const hasImg = u.profileImage ? 'SÍ' : 'NO';
    const imgType = u.profileImage ? 
      (u.profileImage.startsWith('http') ? 'URL' : 
       u.profileImage.startsWith('data:') ? 'DATA_URI' : 'BASE64') : 'N/A';
    console.log(`${u.id} - ${u.nombre}: ${hasImg} (${imgType})`);
    if (u.profileImage) {
      console.log(`   Primeros 80 chars: ${u.profileImage.substring(0, 80)}`);
    }
  });
  
  await prisma.$disconnect();
}
checkAll();
