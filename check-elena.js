const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const usuario = await prisma.usuario.findFirst({
    where: { email: 'elena.santoro@zero.com' },
    select: { id: true, nombre: true, email: true }
  });
  
  if (!usuario) {
    console.log('Usuario no encontrado');
    return;
  }
  
  console.log('Usuario:', usuario.id, '-', usuario.nombre);
  
  const enrollment = await prisma.vision_enrollments.findFirst({
    where: { userId: usuario.id },
    orderBy: { enrolledAt: 'desc' },
    include: {
      Vision: {
        select: { id: true, nombre: true, tribeMission: true, tribeLogoUrl: true }
      }
    }
  });

  if (enrollment) {
    console.log('Vision:', enrollment.Vision?.nombre);
    console.log('Mision:', enrollment.Vision?.tribeMission || '(vacia)');
    console.log('Logo:', enrollment.Vision?.tribeLogoUrl ? 'SI' : 'NO');
  } else {
    console.log('No tiene enrollment');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
