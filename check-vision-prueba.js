const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVisionPrueba() {
  try {
    console.log('🔍 Verificando "Vision prueba"...\n');
    
    const vision = await prisma.vision.findFirst({
      where: { nombre: 'Vision prueba' },
      include: {
        Organization: {
          select: { id: true, name: true }
        },
        Coordinador: {
          select: { id: true, nombre: true, email: true, organizationId: true }
        }
      }
    });

    if (!vision) {
      console.log('❌ Vision prueba no encontrada');
      return;
    }

    console.log('📊 Vision prueba:');
    console.log('   ID:', vision.id);
    console.log('   Nombre:', vision.nombre);
    console.log('   Organization ID:', vision.organizationId);
    console.log('   Organization:', vision.Organization?.name || 'N/A');
    console.log('   Coordinador ID:', vision.coordinadorId);
    console.log('   Coordinador:', vision.Coordinador?.nombre || 'Sin coordinador');
    console.log('   Coordinador email:', vision.Coordinador?.email || 'N/A');
    console.log('   Coordinador Org ID:', vision.Coordinador?.organizationId || 'N/A');

    console.log('\n---\n');

    // Verificar si coordinador@quanter.com puede acceder a esta visión
    const coordinadorQuanter = await prisma.usuario.findUnique({
      where: { email: 'coordinador@quanter.com' },
      select: { id: true, organizationId: true }
    });

    if (coordinadorQuanter) {
      console.log('🔍 Análisis de acceso:');
      console.log(`   Coordinador Quanter ID: ${coordinadorQuanter.id}`);
      console.log(`   Coordinador Quanter Org: ${coordinadorQuanter.organizationId}`);
      console.log(`   Vision prueba Org: ${vision.organizationId}`);
      
      if (vision.coordinadorId === coordinadorQuanter.id) {
        console.log('   ⚠️ coordinador@quanter.com ES coordinador de Vision prueba');
      } else {
        console.log('   ✅ coordinador@quanter.com NO es coordinador de Vision prueba');
      }

      if (vision.organizationId === coordinadorQuanter.organizationId) {
        console.log('   ⚠️ PROBLEMA: Vision prueba pertenece a la misma org que coordinador@quanter.com');
      } else {
        console.log('   ✅ Vision prueba pertenece a otra organización');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVisionPrueba();
