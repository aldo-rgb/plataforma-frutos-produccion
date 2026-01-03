const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkVisionCoordinador() {
  try {
    console.log('🔍 Verificando visiones y coordinadores...\n');

    // Buscar el usuario School Admin de next
    const schoolAdmin = await prisma.usuario.findFirst({
      where: {
        OR: [
          { email: { contains: 'school' } },
          { nombre: { contains: 'School Admin' } }
        ]
      }
    });

    if (schoolAdmin) {
      console.log('👤 School Admin encontrado:');
      console.log('   ID:', schoolAdmin.id);
      console.log('   Nombre:', schoolAdmin.nombre);
      console.log('   Email:', schoolAdmin.email);
      console.log('   Rol:', schoolAdmin.rol);
      console.log('');
    }

    // Buscar todas las visiones
    const visiones = await prisma.vision.findMany({
      include: {
        Coordinador: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        }
      }
    });

    console.log(`📋 Total de visiones encontradas: ${visiones.length}\n`);

    visiones.forEach(vision => {
      console.log(`Visión: ${vision.nombre}`);
      console.log(`  ID: ${vision.id}`);
      console.log(`  coordinadorId: ${vision.coordinadorId}`);
      console.log(`  Coordinador asignado: ${vision.Coordinador?.nombre || 'N/A'}`);
      console.log(`  Email: ${vision.Coordinador?.email || 'N/A'}`);
      console.log(`  Rol: ${vision.Coordinador?.rol || 'N/A'}`);
      console.log('');
    });

    // Si encontramos el school admin, verificar si coincide
    if (schoolAdmin) {
      const visionesDelAdmin = visiones.filter(v => v.coordinadorId === schoolAdmin.id);
      console.log(`✅ Visiones asignadas al School Admin (ID ${schoolAdmin.id}): ${visionesDelAdmin.length}`);
      visionesDelAdmin.forEach(v => {
        console.log(`   - ${v.nombre} (ID: ${v.id})`);
      });
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkVisionCoordinador();
