const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixVision2Staff() {
  try {
    console.log('🔧 Reparando staff de visión 2...');
    
    // 1. Verificar si ya existen registros
    const existingStaff = await prisma.visionStaff.findMany({
      where: { visionId: 2 }
    });
    
    console.log(`📊 Registros existentes: ${existingStaff.length}`);
    if (existingStaff.length > 0) {
      console.log('📋 Staff actual:', existingStaff);
    }
    
    // 2. Obtener la visión 2
    const vision = await prisma.vision.findUnique({
      where: { id: 2 },
      include: {
        Organization: true
      }
    });
    
    if (!vision) {
      console.log('❌ Visión 2 no encontrada');
      return;
    }
    
    console.log(`✅ Visión encontrada: ${vision.nombre}`);
    console.log(`📍 Organización: ${vision.organizationId}`);
    
    // Obtener usuarios de la organización
    const usuarios = await prisma.usuario.findMany({
      where: {
        organizationId: vision.organizationId,
        rol: {
          in: ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'COORDINADOR', 'TRAINER']
        }
      }
    });
    
    console.log(`👥 Usuarios disponibles en la organización:`);
    usuarios.forEach(u => {
      console.log(`  - ${u.nombre} (${u.email}) - Rol: ${u.rol} - ID: ${u.id}`);
    });
    
    // 3. Si no hay registros de staff, preguntemos al usuario qué asignar
    if (existingStaff.length === 0) {
      console.log('\n⚠️  No hay registros de staff. Necesitas asignar manualmente.');
      console.log('\nEjemplo de cómo crear registros:');
      console.log(`
const staffRecords = [
  {
    visionId: 2,
    userId: ${usuarios[0]?.id || 'ID_DEL_COORDINADOR_BASICO'},
    role: 'BASIC_COORDINATOR',
  },
  {
    visionId: 2,
    userId: ${usuarios[1]?.id || 'ID_DEL_TRAINER_BASICO'},
    role: 'BASIC_TRAINER',
  },
  // ... más registros
];

await prisma.visionStaff.createMany({
  data: staffRecords,
  skipDuplicates: true
});
      `);
    }
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixVision2Staff();
