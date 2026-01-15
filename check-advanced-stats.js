const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  try {
    // Verificar producto ADVANCED con id 24
    const product = await prisma.schoolProduct.findUnique({
      where: { id: 24 },
      select: { id: true, name: true, visionId: true, levelType: true }
    });
    console.log('Producto ADVANCED:', product);
    
    // Buscar pre-registros para este producto
    const preRegs = await prisma.advancedPreRegistration.findMany({
      where: {
        OR: [
          { targetProductId: 24 },
          { currentProductId: 24 }
        ]
      },
      select: { id: true, status: true, targetProductId: true, currentProductId: true }
    });
    console.log('Pre-registros encontrados:', preRegs.length);
    if (preRegs.length > 0) {
      console.log('Detalle:', preRegs);
      const byStatus = {};
      preRegs.forEach(p => {
        byStatus[p.status] = (byStatus[p.status] || 0) + 1;
      });
      console.log('Por status:', byStatus);
    }
    
    // Buscar TODOS los pre-registros de la organización
    const allPreRegs = await prisma.advancedPreRegistration.findMany({
      take: 20,
      select: { id: true, status: true, targetProductId: true, currentProductId: true }
    });
    console.log('\nTodos los pre-registros (primeros 20):', allPreRegs.length);
    console.log(allPreRegs);
    
    // Buscar enrollments para visión 3, nivel ADVANCED
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: 3,
        level: 'ADVANCED'
      },
      select: { id: true, enrollmentStatus: true, level: true }
    });
    console.log('\nEnrollments ADVANCED en vision 3:', enrollments.length);
    if (enrollments.length > 0) {
      const byStatus = {};
      enrollments.forEach(e => {
        byStatus[e.enrollmentStatus] = (byStatus[e.enrollmentStatus] || 0) + 1;
      });
      console.log('Por status:', byStatus);
    }
    
    // Buscar TODOS los enrollments de vision 3
    const allEnrollments = await prisma.vision_enrollments.findMany({
      where: { visionId: 3 },
      select: { id: true, enrollmentStatus: true, level: true }
    });
    console.log('\nTodos los enrollments en vision 3:', allEnrollments.length);
    const byLevel = {};
    allEnrollments.forEach(e => {
      byLevel[e.level] = (byLevel[e.level] || 0) + 1;
    });
    console.log('Por nivel:', byLevel);
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

check();
