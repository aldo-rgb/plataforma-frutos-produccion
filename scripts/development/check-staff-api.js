const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const orgId = 3;
  
  // Simular lo que hace el API
  const staffDirecto = await prisma.usuario.findMany({
    where: {
      organizationId: orgId,
      rol: { in: ['TRAINER', 'COORDINADOR', 'GAMECHANGER', 'MENTOR', 'LIDER'] }
    },
    select: { id: true, nombre: true, rol: true }
  });

  const visiones = await prisma.vision.findMany({
    where: { organizationId: orgId },
    select: {
      coordinadorId: true,
      Usuario: { select: { id: true, nombre: true, rol: true } }
    }
  });

  const visionStaff = await prisma.visionStaff.findMany({
    where: { Vision: { organizationId: orgId } },
    select: {
      role: true,
      Usuario_VisionStaff_userIdToUsuario: {
        select: { id: true, nombre: true, rol: true }
      }
    }
  });

  const gameChangers = await prisma.visionGameChanger.findMany({
    where: { Vision: { organizationId: orgId } },
    select: {
      Usuario_VisionGameChanger_gameChangerIdToUsuario: {
        select: { id: true, nombre: true, rol: true }
      }
    }
  });

  const mentores = await prisma.visionMentor.findMany({
    where: { Vision: { organizationId: orgId } },
    select: {
      Usuario_VisionMentor_mentorIdToUsuario: {
        select: { id: true, nombre: true, rol: true }
      }
    }
  });

  const staffMap = new Map();
  
  staffDirecto.forEach(s => staffMap.set(s.id, s));
  
  visiones.forEach(v => {
    if (v.Usuario) staffMap.set(v.Usuario.id, { ...v.Usuario, rol: 'COORDINADOR' });
  });
  
  visionStaff.forEach(vs => {
    const user = vs.Usuario_VisionStaff_userIdToUsuario;
    if (user) {
      const visionRole = vs.role || '';
      let rolParaReporte = user.rol || 'TRAINER';
      
      if (visionRole.includes('TRAINER')) {
        rolParaReporte = 'TRAINER';
      } else if (visionRole.includes('COORDINATOR')) {
        rolParaReporte = 'COORDINADOR';
      }
      
      staffMap.set(user.id, { ...user, rol: rolParaReporte });
    }
  });
  
  gameChangers.forEach(gc => {
    const user = gc.Usuario_VisionGameChanger_gameChangerIdToUsuario;
    if (user) staffMap.set(user.id, { ...user, rol: 'GAMECHANGER' });
  });

  mentores.forEach(m => {
    const user = m.Usuario_VisionMentor_mentorIdToUsuario;
    if (user) staffMap.set(user.id, { ...user, rol: 'MENTOR' });
  });

  const staff = Array.from(staffMap.values()).sort((a, b) => {
    if (a.rol !== b.rol) return a.rol.localeCompare(b.rol);
    return a.nombre.localeCompare(b.nombre);
  });

  console.log('\n=== STAFF FINAL (como lo devolvería el API) ===');
  
  const trainers = staff.filter(s => s.rol === 'TRAINER');
  const coordinadores = staff.filter(s => s.rol === 'COORDINADOR');
  const gameChangersList = staff.filter(s => s.rol === 'GAMECHANGER');
  const mentoresList = staff.filter(s => s.rol === 'MENTOR');
  
  console.log(`\n🎯 TRAINERS (${trainers.length}):`);
  trainers.forEach(s => console.log(`  - ${s.nombre}`));
  
  console.log(`\n📋 COORDINADORES (${coordinadores.length}):`);
  coordinadores.forEach(s => console.log(`  - ${s.nombre}`));
  
  console.log(`\n🌟 GAME CHANGERS (${gameChangersList.length}):`);
  gameChangersList.forEach(s => console.log(`  - ${s.nombre}`));
  
  console.log(`\n🧠 MENTORES (${mentoresList.length}):`);
  mentoresList.forEach(s => console.log(`  - ${s.nombre}`));
  
  await prisma.$disconnect();
}

main().catch(console.error);
