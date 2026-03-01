const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Usuarios en vision_enrollments Vision 13 nivel PL
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      visionId: 13,
      level: 'PL'
    },
    select: {
      id: true,
      userId: true,
      enrollmentStatus: true,
      Usuario_vision_enrollments_userIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          organizationId: true,
          isActive: true
        }
      }
    }
  });
  
  console.log('Total en vision_enrollments Vision 13 PL:', enrollments.length);
  
  // Filtrar solo los de org 5 y activos
  const org5Active = enrollments.filter(e => 
    e.Usuario_vision_enrollments_userIdToUsuario?.organizationId === 5 &&
    e.Usuario_vision_enrollments_userIdToUsuario?.isActive === true
  );
  console.log('De org 5 y activos:', org5Active.length);
  
  // Por enrollmentStatus
  console.log('\nPor enrollmentStatus:');
  const byStatus = {};
  enrollments.forEach(e => {
    byStatus[e.enrollmentStatus] = (byStatus[e.enrollmentStatus] || 0) + 1;
  });
  console.log(byStatus);
  
  // Ahora veamos qué usuarios están en org 5, activos, rol PARTICIPANTE/GC/COORDINADOR
  // que tienen tickets o VisionParticipante en la visión 13
  const usersWithTicketsPL = await prisma.usuario.findMany({
    where: {
      organizationId: 5,
      isActive: true,
      rol: { in: ['PARTICIPANTE', 'GAMECHANGER', 'COORDINADOR'] },
      Ticket_Ticket_ownerIdToUsuario: {
        some: {
          visionId: 13,
          level: 'PL'
        }
      }
    },
    select: {
      id: true,
      nombre: true
    }
  });
  console.log('\nUsuarios con Tickets PL en Vision 13:', usersWithTicketsPL.length);
  
  await prisma.$disconnect();
}

check().catch(console.error);
