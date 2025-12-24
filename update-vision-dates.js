const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateVisionDates() {
  try {
    const visionId = 1; // ID de la visión que quieres actualizar
    
    // Fecha de inicio: hoy
    const startDate = new Date();
    
    // Fecha de fin: 17 semanas después (119 días)
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 119);
    
    console.log('📅 Actualizando fechas de visión...');
    console.log(`Fecha de inicio: ${startDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    console.log(`Fecha de fin: ${endDate.toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}`);
    
    const updatedVision = await prisma.vision.update({
      where: { id: visionId },
      data: {
        startDate: startDate,
        endDate: endDate
      }
    });
    
    console.log('✅ Visión actualizada correctamente');
    console.log(`ID: ${updatedVision.id}`);
    console.log(`Nombre: ${updatedVision.nombre}`);
    console.log(`Inicio: ${updatedVision.startDate}`);
    console.log(`Fin: ${updatedVision.endDate}`);
    
    // También actualizar los ProgramEnrollment existentes si los hay
    const enrollments = await prisma.programEnrollment.findMany({
      where: { visionId: visionId }
    });
    
    if (enrollments.length > 0) {
      console.log(`\n📝 Actualizando ${enrollments.length} inscripciones...`);
      
      await prisma.programEnrollment.updateMany({
        where: { visionId: visionId },
        data: {
          endDate: endDate
        }
      });
      
      console.log('✅ Inscripciones actualizadas');
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

updateVisionDates();
