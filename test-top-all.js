const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const userId = 176; // Abisai
  
  console.log('Testing all TOP FILE queries...');
  
  // 1. Usuario
  try {
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true }
    });
    console.log('1. Usuario OK:', user?.nombre);
  } catch (e) { console.error('1. Usuario ERROR:', e.message); }
  
  // 2. CallBookings
  try {
    const cb = await prisma.callBooking.findMany({
      where: { studentId: userId },
      take: 2
    });
    console.log('2. CallBookings OK:', cb.length);
  } catch (e) { console.error('2. CallBookings ERROR:', e.message); }
  
  // 3. GCCallLog
  try {
    const gc = await prisma.gCCallLog.findMany({
      where: { participantId: userId },
      take: 2
    });
    console.log('3. GCCallLog OK:', gc.length);
  } catch (e) { console.error('3. GCCallLog ERROR:', e.message); }
  
  // 4. MissionSubmissions con nuevas relaciones
  try {
    const ms = await prisma.missionSubmission.findMany({
      where: { userId: userId },
      take: 2,
      include: {
        TrainerMission: {
          include: {
            TrainerTaskTemplate: {
              include: {
                TrainerTaskQuestion: { take: 2 }
              }
            },
            Usuario: { select: { id: true, nombre: true } },
            SchoolProduct: { select: { id: true, name: true } }
          }
        },
        MissionQuestionAnswer: {
          include: { TrainerTaskQuestion: true }
        },
        Usuario_MissionSubmission_reviewedByToUsuario: { select: { id: true, nombre: true } }
      }
    });
    console.log('4. MissionSubmissions OK:', ms.length);
  } catch (e) { console.error('4. MissionSubmissions ERROR:', e.message); }
  
  // 5. AdvancedPreRegistration
  try {
    const apr = await prisma.advancedPreRegistration.findMany({
      where: { userId: userId },
      take: 2,
      select: {
        id: true,
        status: true,
        SchoolProduct_AdvancedPreRegistration_currentProductIdToSchoolProduct: {
          select: { id: true, name: true }
        },
        SchoolProduct_AdvancedPreRegistration_targetProductIdToSchoolProduct: {
          select: { id: true, name: true }
        },
        Usuario_AdvancedPreRegistration_scannedByStaffIdToUsuario: {
          select: { id: true, nombre: true }
        }
      }
    });
    console.log('5. AdvancedPreRegistration OK:', apr.length);
  } catch (e) { console.error('5. AdvancedPreRegistration ERROR:', e.message); }
  
  // 6. MedicalForm
  try {
    const mf = await prisma.medicalForm.findUnique({
      where: { userId: userId }
    });
    console.log('6. MedicalForm OK:', mf ? 'found' : 'not found');
  } catch (e) { console.error('6. MedicalForm ERROR:', e.message); }
  
  // 7. vision_enrollments
  try {
    const ve = await prisma.vision_enrollments.findMany({
      where: { userId: userId },
      take: 2
    });
    console.log('7. vision_enrollments OK:', ve.length);
  } catch (e) { console.error('7. vision_enrollments ERROR:', e.message); }
  
  // 8. CheckInRecord
  try {
    const cir = await prisma.checkInRecord.findMany({
      where: { userId: userId },
      take: 2,
      select: {
        id: true,
        SchoolProduct: { select: { id: true, name: true } }
      }
    });
    console.log('8. CheckInRecord OK:', cir.length);
  } catch (e) { console.error('8. CheckInRecord ERROR:', e.message); }
  
  // 9. CartaFrutos
  try {
    const cf = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId }
    });
    console.log('9. CartaFrutos OK:', cf ? cf.estado : 'not found');
  } catch (e) { console.error('9. CartaFrutos ERROR:', e.message); }
  
  // 10. TaskInstance groupBy
  try {
    const ti = await prisma.taskInstance.groupBy({
      by: ['status'],
      where: { usuarioId: userId },
      _count: true
    });
    console.log('10. TaskInstance groupBy OK:', ti.length);
  } catch (e) { console.error('10. TaskInstance ERROR:', e.message); }
  
  await prisma.$disconnect();
  console.log('Done!');
}
test();
