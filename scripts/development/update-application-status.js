const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function updateStatus() {
  try {
    console.log('\n🔄 Actualizando estado de aplicación...\n');
    
    const updated = await prisma.mentorApplication.update({
      where: { id: 1 },
      data: {
        status: 'PENDING'
      }
    });
    
    console.log('✅ Aplicación actualizada:');
    console.log(`ID: ${updated.id}`);
    console.log(`Status anterior: DRAFT`);
    console.log(`Status nuevo: ${updated.status}`);
    console.log(`Usuario: ${updated.usuarioId}`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

updateStatus();
