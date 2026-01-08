const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDirectorProducts() {
  try {
    console.log('🔍 Verificando productos por director...\n');
    
    // Buscar el director
    const director = await prisma.usuario.findUnique({
      where: { email: 'director@zero.com' },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
      }
    });

    if (!director) {
      console.log('❌ Director director@zero.com no encontrado');
      return;
    }

    console.log('👤 Director encontrado:');
    console.log('   ID:', director.id);
    console.log('   Nombre:', director.nombre);
    console.log('   Organization ID:', director.organizationId);
    console.log('');

    // Buscar productos creados por este director
    const productosPropios = await prisma.schoolProduct.findMany({
      where: {
        createdBy: director.id
      },
      select: {
        id: true,
        name: true,
        type: true,
        levelType: true,
        createdBy: true,
        organizationId: true,
      }
    });

    console.log('📦 Productos creados por este director:', productosPropios.length);
    if (productosPropios.length > 0) {
      productosPropios.forEach(p => {
        console.log(`   - ${p.name} (${p.type}/${p.levelType}) - ID: ${p.id}`);
      });
    }
    console.log('');

    // Buscar TODOS los productos de la organización
    if (director.organizationId) {
      const todosProductos = await prisma.schoolProduct.findMany({
        where: {
          organizationId: director.organizationId
        },
        select: {
          id: true,
          name: true,
          type: true,
          levelType: true,
          createdBy: true,
          Usuario: {
            select: {
              email: true
            }
          }
        }
      });

      console.log('📦 TODOS los productos de la organización:', todosProductos.length);
      if (todosProductos.length > 0) {
        todosProductos.forEach(p => {
          const esPropio = p.createdBy === director.id;
          console.log(`   ${esPropio ? '✅' : '❌'} ${p.name} (${p.type}/${p.levelType}) - Creado por: ${p.Usuario.email}`);
        });
      }
    }

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkDirectorProducts();
