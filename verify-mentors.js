const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function verifyMentorAssignments() {
  console.log('🔍 Verificando asignaciones de mentores...\n');

  try {
    // Usuarios de Quanter
    const quanterUsers = await prisma.usuario.findMany({
      where: {
        organizationId: 6,
        rol: 'PARTICIPANTE'
      },
      include: {
        Usuario_Usuario_mentorIdToUsuario: {
          select: { nombre: true }
        }
      },
      orderBy: { nombre: 'asc' }
    });

    console.log(`📊 Usuarios de Quanter (${quanterUsers.length}):\n`);
    
    quanterUsers.forEach(user => {
      const mentor = user.Usuario_Usuario_mentorIdToUsuario?.nombre || 'SIN MENTOR';
      const status = user.mentorId ? '✅' : '❌';
      console.log(`${status} ${user.nombre.padEnd(20)} → Mentor: ${mentor}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

verifyMentorAssignments();
