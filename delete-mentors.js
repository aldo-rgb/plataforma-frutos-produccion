const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function deleteMentors() {
  try {
    const mentorEmails = [
      'roberto@impactovia.com',
      'ana@impactovia.com',
      'carlos@impactovia.com'
    ];
    
    for (const email of mentorEmails) {
      const user = await prisma.usuario.findUnique({
        where: { email }
      });
      
      if (user) {
        await prisma.usuario.delete({
          where: { email }
        });
        console.log(`✅ Eliminado: ${email}`);
      }
    }
    
    console.log('\n✅ Mentores eliminados correctamente');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

deleteMentors();
