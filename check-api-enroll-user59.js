const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkEnrollAPI() {
  try {
    const userId = 59;
    
    console.log('🔍 Verificando datos para API /api/program/enroll...\n');
    
    // 1. Verificar enrollment
    const enrollment = await prisma.programEnrollment.findFirst({
      where: { userId },
      orderBy: { createdAt: 'desc' }
    });
    
    console.log('1️⃣ ProgramEnrollment:', enrollment ? 'EXISTE' : 'NO EXISTE');
    if (enrollment) {
      console.log('   - ID:', enrollment.id);
      console.log('   - Status:', enrollment.status);
    }
    
    // 2. Verificar PackageSessionCredits
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: userId,
          status: 'COMPLETED'
        },
        remainingSessions: {
          gt: 0
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        MentorPackageOrder: {
          select: {
            mentorId: true,
            Mentor: {
              select: {
                id: true,
                nombre: true,
                profileImage: true,
                imagen: true
              }
            }
          }
        }
      }
    });
    
    console.log('\n2️⃣ PackageSessionCredits:', packageCredits ? 'EXISTE' : 'NO EXISTE');
    if (packageCredits) {
      console.log('   - Total Sessions:', packageCredits.totalSessions);
      console.log('   - Remaining Sessions:', packageCredits.remainingSessions);
      console.log('   - Mentor ID:', packageCredits.MentorPackageOrder.mentorId);
      console.log('   - Mentor Data:', packageCredits.MentorPackageOrder.Mentor);
    }
    
    // 3. Verificar sesiones agendadas
    if (packageCredits) {
      const scheduledSessionsCount = await prisma.mentorScheduleSlot.count({
        where: {
          userId,
          mentorId: packageCredits.MentorPackageOrder.mentorId
        }
      });
      
      console.log('\n3️⃣ Sesiones agendadas en MentorScheduleSlot:', scheduledSessionsCount);
      console.log('   - needsScheduling:', scheduledSessionsCount === 0 ? 'TRUE' : 'FALSE');
      
      // Si tiene sesiones, mostrarlas
      if (scheduledSessionsCount > 0) {
        const sessions = await prisma.mentorScheduleSlot.findMany({
          where: {
            userId,
            mentorId: packageCredits.MentorPackageOrder.mentorId
          },
          select: {
            id: true,
            dayOfWeek: true,
            time: true
          }
        });
        console.log('   - Sesiones:', sessions);
      }
    }
    
    // 4. Simular respuesta del API
    console.log('\n4️⃣ RESPUESTA ESPERADA DEL API:');
    if (packageCredits && packageCredits.MentorPackageOrder.Mentor) {
      const scheduledSessionsCount = await prisma.mentorScheduleSlot.count({
        where: {
          userId,
          mentorId: packageCredits.MentorPackageOrder.mentorId
        }
      });
      
      const needsScheduling = scheduledSessionsCount === 0;
      
      console.log(JSON.stringify({
        hasEnrollment: false,
        hasLoboSolitario: true,
        needsScheduling: needsScheduling,
        message: needsScheduling ? 'Necesitas agendar tus sesiones semanales' : 'Programa Lobo Solitario activo',
        mentor: packageCredits.MentorPackageOrder.Mentor,
        packageInfo: {
          totalSessions: packageCredits.totalSessions,
          remainingSessions: packageCredits.remainingSessions,
          usedSessions: packageCredits.usedSessions,
          expiresAt: packageCredits.expiresAt
        }
      }, null, 2));
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkEnrollAPI();
