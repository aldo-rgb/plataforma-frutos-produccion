const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const user = await prisma.usuario.findFirst({
    where: { nombre: { contains: 'Kathya', mode: 'insensitive' } }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    return;
  }
  
  console.log('Usuario:', user.id, user.nombre);
  console.log('Rol:', user.rol);
  console.log('OrgId:', user.organizationId);
  
  if (user.organizationId) {
    const visiones = await prisma.vision.findMany({
      where: { organizationId: user.organizationId },
      select: { id: true, nombre: true }
    });
    console.log('');
    console.log('Visiones de org', user.organizationId, ':', visiones.length);
    
    for (const v of visiones) {
      const enrollments = await prisma.vision_enrollments.count({
        where: { 
          visionId: v.id,
          enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
        }
      });
      console.log('  -', v.nombre, '- Enrollments:', enrollments);
    }
  }
  
  await prisma.$disconnect();
}

main().catch(console.error);
