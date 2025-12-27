const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  try {
    // Buscar el usuario quanter1
    const usuario = await prisma.usuario.findUnique({
      where: { email: 'quanter1@quanter.com' },
      select: { id: true, nombre: true }
    });

    if (!usuario) {
      console.log('❌ Usuario no encontrado');
      return;
    }

    console.log(`\n✅ Usuario: ${usuario.nombre} (ID: ${usuario.id})\n`);

    // Buscar carta
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuario.id },
      select: {
        id: true,
        estado: true,
        Meta: {
          select: {
            id: true,
            categoria: true,
            metaPrincipal: true,
            declaracionPoder: true,
            Accion: {
              select: {
                id: true,
                texto: true,
                frequency: true
              }
            }
          }
        }
      }
    });

    if (!carta) {
      console.log('❌ No se encontró carta');
      return;
    }

    console.log(`📋 Carta ID: ${carta.id} - Estado: ${carta.estado}`);
    console.log(`📊 Total metas guardadas: ${carta.Meta.length}\n`);

    carta.Meta.forEach((meta, index) => {
      console.log(`\n🎯 Meta ${index + 1}: ${meta.categoria}`);
      console.log(`   Objetivo: ${meta.metaPrincipal?.substring(0, 60)}...`);
      console.log(`   Declaración: ${meta.declaracionPoder?.substring(0, 60)}...`);
      console.log(`   Acciones: ${meta.Accion.length}`);
      
      meta.Accion.forEach((accion, i) => {
        console.log(`      ${i + 1}. ${accion.texto.substring(0, 50)}... (${accion.frequency})`);
      });
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
