const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVision2Staff() {
  try {
    console.log('🔍 Verificando registros de VisionStaff para visión 2...\n');
    
    const staff = await prisma.visionStaff.findMany({
      where: { visionId: 2 },
      include: {
        Usuario_VisionStaff_userIdToUsuario: {
          select: { id: true, nombre: true, email: true, rol: true }
        }
      }
    });
    
    console.log(`📊 Total de registros encontrados: ${staff.length}\n`);
    
    if (staff.length === 0) {
      console.log('❌ NO HAY REGISTROS de staff para la visión 2');
      console.log('💡 Esto explica por qué los selectores están vacíos\n');
      
      console.log('🔧 SOLUCIÓN: Necesitas crear los registros de VisionStaff');
      console.log('Opciones:');
      console.log('  1. Volver a crear la visión con Vision Builder (recomendado)');
      console.log('  2. Agregar los registros manualmente desde la página de gestión\n');
    } else {
      console.log('✅ Registros encontrados:\n');
      staff.forEach(s => {
        console.log(`  - Role: ${s.role}`);
        console.log(`    Usuario: ${s.Usuario_VisionStaff_userIdToUsuario.nombre} (ID: ${s.userId})`);
        console.log(`    Email: ${s.Usuario_VisionStaff_userIdToUsuario.email}`);
        if (s.plWeekendNumber) {
          console.log(`    PL Weekend: ${s.plWeekendNumber}`);
        }
        console.log('');
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVision2Staff();
