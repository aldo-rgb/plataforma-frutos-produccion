// Script de prueba para la simulación del entrenamiento AVANZADO
// Fecha de simulación: 20 de enero de 2026

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function runSimulationTest() {
  console.log('🚀 SIMULACIÓN DE ENTRENAMIENTO AVANZADO - 20 de enero 2026\n');
  console.log('='.repeat(70));

  try {
    // 1. Obtener productos ADVANCED activos para hoy
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const advancedProducts = await prisma.schoolProduct.findMany({
      where: {
        levelType: 'ADVANCED',
        isActive: true,
        OR: [
          { startDate: { lte: new Date() } },
          { startDate: null }
        ]
      },
      include: {
        Organization: true,
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
            advancedEndDate: true
          }
        }
      }
    });

    console.log(`\n📦 PRODUCTOS AVANZADO ACTIVOS: ${advancedProducts.length}`);
    for (const product of advancedProducts) {
      console.log(`  - ${product.name} (ID: ${product.id})`);
      console.log(`    Org: ${product.Organization?.name}`);
      console.log(`    Vision: ${product.Vision?.nombre}`);
      console.log(`    Fecha inicio: ${product.startDate || 'No definida'}`);
      if (product.Vision?.advancedStartDate) {
        console.log(`    Fecha inicio Vision: ${product.Vision.advancedStartDate}`);
      }
    }

    // 2. Obtener todos los enrollments ADVANCED con pago
    const advancedEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        level: 'ADVANCED',
        paymentStatus: { in: ['FULL', 'PARTIAL', 'GIFT', 'PAID'] },
        enrollmentStatus: 'ENROLLED'
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true
          }
        }
      }
    });

    console.log(`\n👥 ENROLLMENTS AVANZADO (con pago): ${advancedEnrollments.length}`);
    
    // 3. Para cada enrollment, verificar prerrequisitos
    const results = {
      ready: [],
      missingBasic: [],
      missingBitacora: [],
      missingPhoto: [],
      missingMedical: [],
      alreadyCheckedIn: []
    };

    for (const enrollment of advancedEnrollments) {
      const user = enrollment.Usuario_vision_enrollments_userIdToUsuario;
      if (!user) continue;

      const status = {
        userId: user.id,
        nombre: user.nombre,
        email: user.email,
        visionName: enrollment.Vision?.nombre,
        issues: []
      };

      // a) Verificar asistencia a BÁSICO
      const basicEnrollment = await prisma.vision_enrollments.findFirst({
        where: {
          userId: user.id,
          visionId: enrollment.visionId,
          level: 'BASIC'
        }
      });

      const attendedBasic = basicEnrollment?.attendanceStatus === 'ATTENDED';
      if (!attendedBasic) {
        status.issues.push('NO_BASIC');
        results.missingBasic.push(user.nombre);
      }

      // b) Verificar bitácora completada
      const questionnaire = await prisma.advancedQuestionnaire.findUnique({
        where: { userId: user.id }
      });

      const hasCompletedBitacora = questionnaire?.status === 'COMPLETED';
      if (!hasCompletedBitacora) {
        status.issues.push(`BITACORA_${questionnaire?.status || 'NOT_STARTED'}`);
        results.missingBitacora.push({
          nombre: user.nombre,
          status: questionnaire?.status || 'NOT_STARTED',
          dimension: questionnaire?.currentDimension || 0
        });
      }

      // c) Verificar formulario médico
      const medicalForm = await prisma.medicalForm.findUnique({
        where: { userId: user.id }
      });

      if (!medicalForm) {
        status.issues.push('NO_MEDICAL');
        results.missingMedical.push(user.nombre);
      }

      // d) Verificar foto de perfil
      const hasPhoto = !!(user.imagen || user.profileImage);
      if (!hasPhoto) {
        status.issues.push('NO_PHOTO');
        results.missingPhoto.push(user.nombre);
      }

      // e) Verificar si ya hizo check-in hoy
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      // Buscar producto ADVANCED para este vision
      const advProduct = advancedProducts.find(p => p.visionId === enrollment.visionId);
      
      if (advProduct) {
        const checkIn = await prisma.checkInRecord.findFirst({
          where: {
            userId: user.id,
            productId: advProduct.id,
            checkInTime: {
              gte: today,
              lt: tomorrow
            }
          }
        });

        if (checkIn) {
          status.issues.push('ALREADY_CHECKED_IN');
          results.alreadyCheckedIn.push(user.nombre);
        }
      }

      // Clasificar
      if (status.issues.length === 0) {
        results.ready.push(user.nombre);
      }
    }

    // 4. Mostrar resultados
    console.log('\n' + '='.repeat(70));
    console.log('📊 RESUMEN DE PRERREQUISITOS PARA CHECK-IN AVANZADO');
    console.log('='.repeat(70));

    console.log(`\n✅ LISTOS PARA CHECK-IN: ${results.ready.length}`);
    results.ready.forEach(name => console.log(`   ✓ ${name}`));

    console.log(`\n❌ SIN ASISTENCIA A BÁSICO: ${results.missingBasic.length}`);
    results.missingBasic.forEach(name => console.log(`   ✗ ${name}`));

    console.log(`\n📝 BITÁCORA PENDIENTE: ${results.missingBitacora.length}`);
    results.missingBitacora.forEach(item => {
      console.log(`   ✗ ${item.nombre} - ${item.status} (Dimensión: ${item.dimension}/5)`);
    });

    console.log(`\n🏥 SIN FORMULARIO MÉDICO: ${results.missingMedical.length}`);
    results.missingMedical.forEach(name => console.log(`   ✗ ${name}`));

    console.log(`\n📷 SIN FOTO DE PERFIL: ${results.missingPhoto.length}`);
    results.missingPhoto.forEach(name => console.log(`   ⚠ ${name} (no bloqueante)`));

    console.log(`\n🎫 YA HICIERON CHECK-IN HOY: ${results.alreadyCheckedIn.length}`);
    results.alreadyCheckedIn.forEach(name => console.log(`   ✓ ${name}`));

    // 5. Verificar visiones con fecha de hoy
    console.log('\n' + '='.repeat(70));
    console.log('📅 VISIONES CON ENTRENAMIENTO AVANZADO HOY');
    console.log('='.repeat(70));

    const visionsToday = await prisma.vision.findMany({
      where: {
        advancedStartDate: {
          gte: today,
          lt: new Date(today.getTime() + 24 * 60 * 60 * 1000)
        }
      },
      select: {
        id: true,
        nombre: true,
        advancedStartDate: true,
        Organization: {
          select: { name: true }
        },
        _count: {
          select: {
            vision_enrollments: {
              where: { level: 'ADVANCED', enrollmentStatus: 'ENROLLED' }
            }
          }
        }
      }
    });

    if (visionsToday.length === 0) {
      console.log('\n⚠️  No hay visiones con advancedStartDate para hoy.');
      console.log('   Verifica que la fecha de inicio del avanzado esté configurada.');
    } else {
      visionsToday.forEach(v => {
        console.log(`\n🎯 ${v.nombre}`);
        console.log(`   Organización: ${v.Organization?.name}`);
        console.log(`   Fecha: ${v.advancedStartDate}`);
        console.log(`   Participantes inscritos: ${v._count.vision_enrollments}`);
      });
    }

    // 6. Mostrar todos los SchoolProducts ADVANCED
    console.log('\n' + '='.repeat(70));
    console.log('📦 TODOS LOS PRODUCTOS ADVANCED EN EL SISTEMA');
    console.log('='.repeat(70));

    const allAdvancedProducts = await prisma.schoolProduct.findMany({
      where: { levelType: 'ADVANCED' },
      include: {
        Organization: { select: { name: true } },
        Vision: { select: { nombre: true, advancedStartDate: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 10
    });

    allAdvancedProducts.forEach(p => {
      console.log(`\n  📦 ${p.name} (ID: ${p.id})`);
      console.log(`     Activo: ${p.isActive ? '✅' : '❌'}`);
      console.log(`     Org: ${p.Organization?.name}`);
      console.log(`     Vision: ${p.Vision?.nombre || 'Sin visión'}`);
      console.log(`     Inicio producto: ${p.startDate || 'No definido'}`);
      console.log(`     Inicio avanzado (vision): ${p.Vision?.advancedStartDate || 'No definido'}`);
    });

  } catch (error) {
    console.error('❌ Error en la simulación:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n' + '='.repeat(70));
    console.log('🏁 Simulación completada');
  }
}

runSimulationTest();
