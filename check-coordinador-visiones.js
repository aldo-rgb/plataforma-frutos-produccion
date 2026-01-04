const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCoordinadorVisiones() {
  try {
    // Buscar todos los coordinadores
    const coordinadores = await prisma.usuario.findMany({
      where: {
        rol: 'COORDINADOR'
      },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    console.log('\n📊 COORDINADORES EN EL SISTEMA:');
    console.log('================================');
    for (const coord of coordinadores) {
      console.log(`\n👤 ${coord.nombre} (${coord.email})`);
      console.log(`   ID: ${coord.id}`);

      // Buscar visiones asignadas a este coordinador
      const visiones = await prisma.vision.findMany({
        where: {
          coordinadorId: coord.id
        },
        select: {
          id: true,
          nombre: true,
          isActive: true,
          startDate: true,
          endDate: true
        }
      });

      if (visiones.length > 0) {
        console.log(`   ✅ Visiones asignadas: ${visiones.length}`);
        visiones.forEach(v => {
          console.log(`      - Visión #${v.id}: ${v.nombre} (${v.isActive ? 'ACTIVA' : 'INACTIVA'})`);
        });
      } else {
        console.log(`   ❌ NO tiene visiones asignadas`);
      }
    }

    // Buscar visión ID 10 específicamente
    console.log('\n\n🔍 INFORMACIÓN DE VISIÓN #10:');
    console.log('================================');
    const vision10 = await prisma.vision.findUnique({
      where: { id: 10 },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            rol: true
          }
        }
      }
    });

    if (vision10) {
      console.log(`Nombre: ${vision10.nombre}`);
      console.log(`Coordinador ID: ${vision10.coordinadorId}`);
      if (vision10.Usuario) {
        console.log(`Coordinador: ${vision10.Usuario.nombre} (${vision10.Usuario.email})`);
        console.log(`Rol del coordinador: ${vision10.Usuario.rol}`);
      } else {
        console.log('⚠️  NO tiene coordinador asignado');
      }
    } else {
      console.log('❌ Visión #10 no encontrada');
    }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCoordinadorVisiones();
