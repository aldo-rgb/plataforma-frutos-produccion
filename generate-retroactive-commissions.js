const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function generateRetroactiveCommissions() {
  console.log('🔄 Generando comisiones retroactivas para participantes de Avanzado...');
  
  // Organización de Monterrey (Ivonne)
  const orgId = 3;
  const ivonneId = 46;
  
  // Buscar todos los enrollments de ADVANCED con ATTENDED en la organización
  const enrollments = await prisma.vision_enrollments.findMany({
    where: {
      level: 'ADVANCED',
      attendanceStatus: 'ATTENDED',
      Vision: { organizationId: orgId }
    },
    include: {
      Vision: { select: { id: true, nombre: true, organizationId: true } },
      Usuario_vision_enrollments_userIdToUsuario: { select: { id: true, nombre: true } }
    }
  });
  
  console.log('\nEnrollments de Avanzado con asistencia encontrados:', enrollments.length);
  
  let created = 0;
  let skipped = 0;
  
  for (const enrollment of enrollments) {
    // Verificar si ya existe comisión
    const existing = await prisma.coordinator_commissions.findFirst({
      where: {
        coordinatorId: ivonneId,
        relatedUserId: enrollment.userId,
        triggerEvent: { in: ['ADVANCE_SEATED', 'ADVANCE_COMBO_SEATED'] },
        visionId: enrollment.visionId
      }
    });
    
    if (existing) {
      skipped++;
      continue;
    }
    
    // Obtener configuración
    let config = await prisma.coordinator_commission_config.findUnique({
      where: { visionId: enrollment.visionId }
    });
    
    if (!config) {
      config = await prisma.coordinator_commission_config.create({
        data: {
          visionId: enrollment.visionId,
          organizationId: orgId,
          createdBy: ivonneId,
          updatedAt: new Date()
        }
      });
    }
    
    // Verificar si tiene PL para combo
    const plEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: enrollment.userId,
        visionId: enrollment.visionId,
        level: 'PL'
      }
    });
    
    const isCombo = !!plEnrollment;
    const triggerEvent = isCombo ? 'ADVANCE_COMBO_SEATED' : 'ADVANCE_SEATED';
    const amount = isCombo ? config.advanceComboRate : config.advanceSeatedRate;
    
    // Crear comisión
    await prisma.coordinator_commissions.create({
      data: {
        coordinatorId: ivonneId,
        coordinatorRole: 'COORDINATOR_ADVANCED',
        triggerEvent,
        relatedUserId: enrollment.userId,
        relatedEnrollmentId: enrollment.id,
        amount,
        visionId: enrollment.visionId,
        organizationId: orgId,
        status: 'PENDING_REVIEW',
        configSnapshot: {
          rate: amount.toString(),
          configId: config.id,
          isCombo,
          retroactive: true
        },
        notes: 'Comisión retroactiva - Participante ya hizo check-in en Avanzado',
        updatedAt: new Date()
      }
    });
    
    created++;
    console.log('✅ Comisión creada para:', enrollment.Usuario_vision_enrollments_userIdToUsuario?.nombre, '| Vision:', enrollment.Vision?.nombre, '| Monto: $' + Number(amount));
  }
  
  console.log('\n=== RESUMEN ===');
  console.log('Comisiones creadas:', created);
  console.log('Ya existían (omitidas):', skipped);
  
  await prisma.$disconnect();
}

generateRetroactiveCommissions().catch(console.error);
