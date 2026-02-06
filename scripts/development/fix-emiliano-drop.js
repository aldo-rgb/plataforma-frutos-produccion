const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixEmilianoDrop() {
  try {
    const user = await prisma.usuario.findFirst({
      where: { email: 'emi062298@gmail.com' }
    });
    
    if (!user) {
      console.log('Usuario no encontrado');
      return;
    }
    
    console.log('Usuario:', user.nombre, '(ID:', user.id + ')');
    
    // Buscar el enrollment BASIC
    const basicEnrollment = await prisma.vision_enrollments.findFirst({
      where: { 
        userId: user.id,
        level: 'BASIC'
      }
    });
    
    if (!basicEnrollment) {
      console.log('No se encontró enrollment BASIC');
      return;
    }
    
    console.log('\nEstado actual BASIC:');
    console.log('  attendanceStatus:', basicEnrollment.attendanceStatus);
    console.log('  droppedAt:', basicEnrollment.droppedAt);
    
    // Forzar actualización a DROP
    const updated = await prisma.vision_enrollments.update({
      where: { id: basicEnrollment.id },
      data: { 
        attendanceStatus: 'DROP',
        droppedAt: basicEnrollment.droppedAt || new Date(),
        updatedAt: new Date()
      }
    });
    
    console.log('\n✅ Enrollment actualizado:');
    console.log('  attendanceStatus:', updated.attendanceStatus);
    console.log('  droppedAt:', updated.droppedAt);
    console.log('  updatedAt:', updated.updatedAt);
    
    // También marcar como inactivo en SmallGroup si existe
    const membershipUpdate = await prisma.smallGroupMember.updateMany({
      where: { 
        userId: user.id,
        isActive: true
      },
      data: {
        isActive: false,
        removedAt: new Date(),
        removedReason: 'Abandonó el entrenamiento (corrección manual)'
      }
    });
    
    console.log('\n📋 SmallGroupMember actualizado:', membershipUpdate.count, 'registros');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixEmilianoDrop();
