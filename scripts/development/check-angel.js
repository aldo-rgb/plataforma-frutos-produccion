const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const user = await prisma.usuario.findFirst({
    where: { email: 'carlosflorese07@gmail.com' },
    select: { id: true, nombre: true, email: true, angelEnrrolamiento: true, invitedBy: true, invitedByText: true }
  });
  
  if (!user) {
    console.log('Usuario no encontrado');
    await prisma.$disconnect();
    return;
  }
  
  console.log('Usuario:', user.nombre);
  console.log('ID:', user.id);
  console.log('Angel Enrolamiento (campo):', user.angelEnrrolamiento || 'No registrado');
  console.log('InvitedBy ID:', user.invitedBy || 'No registrado');
  console.log('InvitedBy Text:', user.invitedByText || 'No registrado');
  
  if (user.invitedBy) {
    const angel = await prisma.usuario.findUnique({
      where: { id: user.invitedBy },
      select: { id: true, nombre: true, email: true }
    });
    if (angel) {
      console.log('--- ANGEL DE ENROLAMIENTO ---');
      console.log('Nombre:', angel.nombre);
      console.log('Email:', angel.email);
    }
  }
  
  const enrollment = await prisma.vision_enrollments.findFirst({
    where: { userId: user.id },
    include: {
      Usuario_vision_enrollments_invitedByToUsuario: {
        select: { id: true, nombre: true, email: true }
      },
      Vision: { select: { nombre: true } }
    }
  });
  
  if (enrollment && enrollment.Usuario_vision_enrollments_invitedByToUsuario) {
    console.log('--- ANGEL EN ENROLLMENT ---');
    console.log('Nombre:', enrollment.Usuario_vision_enrollments_invitedByToUsuario.nombre);
    console.log('Email:', enrollment.Usuario_vision_enrollments_invitedByToUsuario.email);
    console.log('Vision:', enrollment.Vision ? enrollment.Vision.nombre : 'N/A');
  }
  
  await prisma.$disconnect();
}
check();
