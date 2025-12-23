const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listarMentores() {
  const mentores = await prisma.usuario.findMany({
    where: { rol: 'MENTOR' },
    select: {
      id: true,
      nombre: true,
      email: true,
      isActive: true,
      profileImage: true,
      jobTitle: true,
      bioShort: true,
      skills: true
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\n📋 LISTA DE MENTORES:\n');
  mentores.forEach(m => {
    console.log(`👤 ${m.nombre}`);
    console.log(`   📧 Email: ${m.email}`);
    console.log(`   ${m.isActive ? '🟢' : '🔴'} isActive: ${m.isActive}`);
    console.log(`   📸 Foto: ${m.profileImage || '(sin foto)'}`);
    console.log(`   💼 Puesto: ${m.jobTitle || '(sin puesto)'}`);
    console.log(`   📝 Bio: ${m.bioShort || '(sin bio)'}`);
    console.log(`   🎯 Skills: ${m.skills?.length > 0 ? m.skills.join(', ') : '(sin skills)'}`);
    console.log('');
  });

  await prisma.$disconnect();
}

listarMentores();
