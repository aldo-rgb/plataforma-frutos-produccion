const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  // Contar enrollments en vision 13, nivel PL
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      visionId: 13,
      level: 'PL'
    },
    select: {
      id: true,
      level: true,
      enrollmentStatus: true,
      attendanceStatus: true,
      Usuario_vision_enrollments_userIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          rol: true,
          isActive: true,
          organizationId: true
        }
      }
    }
  });
  
  console.log('Total enrollments Vision 13 nivel PL:', enrollments.length);
  console.log('\nPor status de enrollment:');
  const byStatus = {};
  enrollments.forEach(e => {
    byStatus[e.enrollmentStatus] = (byStatus[e.enrollmentStatus] || 0) + 1;
  });
  console.log(byStatus);
  
  console.log('\nPor attendanceStatus:');
  const byAttendance = {};
  enrollments.forEach(e => {
    const status = e.attendanceStatus || 'null';
    byAttendance[status] = (byAttendance[status] || 0) + 1;
  });
  console.log(byAttendance);
  
  // Buscar Abisai
  const abisai = enrollments.find(e => 
    e.Usuario_vision_enrollments_userIdToUsuario?.nombre?.includes('Abisai')
  );
  if (abisai) {
    console.log('\n=== ABISAI ENCONTRADO ===');
    console.log(JSON.stringify(abisai, null, 2));
  } else {
    console.log('\nAbisai NO está en Vision 13 nivel PL');
    
    // Buscar en todos los niveles
    const abisaiAll = await prisma.vision_enrollments.findFirst({
      where: {
        visionId: 13,
        Usuario_vision_enrollments_userIdToUsuario: {
          nombre: { contains: 'Abisai' }
        }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true, rol: true }
        }
      }
    });
    if (abisaiAll) {
      console.log('Abisai está en Vision 13 pero en nivel:', abisaiAll.level);
      console.log(JSON.stringify(abisaiAll, null, 2));
    }
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
