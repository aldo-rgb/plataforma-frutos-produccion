const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Ver los enrollments de Yessenia
  const yesseniaEnroll = await prisma.vision_enrollments.findMany({
    where: { userId: 125 }
  });
  console.log('Enrollments de Yessenia:');
  console.log(yesseniaEnroll);
  
  // También verificar si tiene foto
  const user = await prisma.usuario.findUnique({
    where: { id: 125 },
    select: { id: true, nombre: true, imagen: true }
  });
  console.log('\nUsuario:', user?.nombre);
  console.log('Foto:', user?.imagen ? user.imagen.substring(0,100) + '...' : 'NO TIENE');
  
  // Verificar vision 24 = id 5
  const vision24Products = await prisma.schoolProduct.findMany({
    where: { visionId: 5, levelType: 'ADVANCED' },
    select: { id: true, name: true }
  });
  console.log('\nProductos ADVANCED de Vision 24 (visionId=5):', vision24Products);
  
  // Verificar vision 25 = id 6
  const vision25Products = await prisma.schoolProduct.findMany({
    where: { visionId: 6, levelType: 'ADVANCED' },
    select: { id: true, name: true }
  });
  console.log('\nProductos ADVANCED de Vision 25 (visionId=6):', vision25Products);
  
  await prisma.$disconnect();
}
check();
