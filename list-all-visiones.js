const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function listAllVisiones() {
  try {
    console.log('📋 Listando todas las visiones en la base de datos...\n');
    
    const visiones = await prisma.vision.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        Organization: {
          select: { name: true }
        }
      }
    });

    if (visiones.length === 0) {
      console.log('⚠️ No se encontraron visiones');
      return;
    }

    console.log(`✅ Total de visiones encontradas: ${visiones.length}\n`);
    
    visiones.forEach((v, i) => {
      console.log(`${i + 1}. ${v.nombre}`);
      console.log(`   ID: ${v.id}`);
      console.log(`   Organización: ${v.Organization?.name || 'N/A'}`);
      console.log(`   Estado: ${v.estado}`);
      console.log(`   Fecha: ${v.createdAt.toLocaleDateString('es-MX')}`);
      console.log('');
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

listAllVisiones();
