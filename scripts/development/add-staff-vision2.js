const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function addStaffToVision2() {
  try {
    console.log('➕ Agregando staff a visión 2...');
    
    // INSTRUCCIONES:
    // 1. Reemplaza los IDs con los IDs reales de tus usuarios
    // 2. Comenta las líneas que NO necesites
    // 3. Ejecuta: node add-staff-vision2.js
    
    const staffRecords = [
      // Coordinador Nivel Básico
      {
        visionId: 2,
        userId: 10, // <- CAMBIA ESTE ID
        role: 'BASIC_COORDINATOR',
      },
      
      // Trainer Nivel Básico
      {
        visionId: 2,
        userId: 11, // <- CAMBIA ESTE ID
        role: 'BASIC_TRAINER',
      },
      
      // Coordinador Nivel Avanzado
      {
        visionId: 2,
        userId: 12, // <- CAMBIA ESTE ID
        role: 'ADVANCED_COORDINATOR',
      },
      
      // Trainer Nivel Avanzado
      {
        visionId: 2,
        userId: 13, // <- CAMBIA ESTE ID
        role: 'ADVANCED_TRAINER',
      },
      
      // Coordinador Programa Liderato
      {
        visionId: 2,
        userId: 14, // <- CAMBIA ESTE ID
        role: 'PL_COORDINATOR',
      },
      
      // Trainer PL Fin de Semana 1
      {
        visionId: 2,
        userId: 15, // <- CAMBIA ESTE ID
        role: 'PL_TRAINER',
        plWeekendNumber: 1,
      },
      
      // Trainer PL Fin de Semana 2
      {
        visionId: 2,
        userId: 16, // <- CAMBIA ESTE ID
        role: 'PL_TRAINER',
        plWeekendNumber: 2,
      },
      
      // Trainer PL Fin de Semana 3 (Graduación)
      {
        visionId: 2,
        userId: 17, // <- CAMBIA ESTE ID
        role: 'PL_TRAINER',
        plWeekendNumber: 3,
      },
    ];
    
    const result = await prisma.visionStaff.createMany({
      data: staffRecords,
      skipDuplicates: true,
    });
    
    console.log(`✅ Staff agregado exitosamente: ${result.count} registros`);
    
    // Verificar
    const staff = await prisma.visionStaff.findMany({
      where: { visionId: 2 },
      include: {
        Usuario_VisionStaff_userIdToUsuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      }
    });
    
    console.log('\n📋 Staff actual de visión 2:');
    staff.forEach(s => {
      console.log(`  - ${s.Usuario_VisionStaff_userIdToUsuario.nombre} (${s.role}) ${s.plWeekendNumber ? `[Weekend ${s.plWeekendNumber}]` : ''}`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStaffToVision2();
