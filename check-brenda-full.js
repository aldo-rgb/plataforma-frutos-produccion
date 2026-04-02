const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const carta = await prisma.cartaFrutos.findFirst({
    where: {
      Usuario: {
        email: 'brendaecg78@gmail.com'
      }
    },
    include: {
      Usuario: {
        select: { email: true, nombre: true }
      },
      Meta: {
        include: {
          Accion: true
        }
      }
    }
  });
  
  console.log('='.repeat(60));
  console.log('CARTA COMPLETA DE:', carta?.Usuario?.nombre);
  console.log('Email:', carta?.Usuario?.email);
  console.log('Estado:', carta?.estado);
  console.log('Fecha Creación:', carta?.fechaCreacion);
  console.log('Fecha Actualización:', carta?.fechaActualizacion);
  console.log('='.repeat(60));
  
  // Mostrar todos los campos de la carta
  const campos = Object.keys(carta).filter(k => 
    !['id', 'usuarioId', 'Usuario', 'Meta', 'fechaCreacion', 'fechaActualizacion', 'estado'].includes(k)
  );
  
  console.log('\n📋 TODOS LOS CAMPOS GUARDADOS:\n');
  
  campos.forEach(campo => {
    const valor = carta[campo];
    if (valor !== null && valor !== '' && valor !== 0 && valor !== false) {
      console.log(`${campo}: ${JSON.stringify(valor)}`);
    }
  });
  
  console.log('\n📋 CAMPOS VACÍOS/NULL:\n');
  campos.forEach(campo => {
    const valor = carta[campo];
    if (valor === null || valor === '' || valor === 0) {
      console.log(`${campo}: (vacío)`);
    }
  });
  
  if (carta?.Meta?.length > 0) {
    console.log('\n🎯 METAS GUARDADAS:', carta.Meta.length);
    carta.Meta.forEach((meta, i) => {
      console.log(`\n  Meta ${i+1}:`);
      console.log(`    - Categoria: ${meta.categoria}`);
      console.log(`    - Descripción: ${meta.descripcion}`);
      console.log(`    - Orden: ${meta.orden}`);
      if (meta.Accion?.length > 0) {
        console.log(`    - Acciones: ${meta.Accion.length}`);
        meta.Accion.forEach((acc, j) => {
          console.log(`      ${j+1}. ${acc.descripcion} (${acc.frecuencia})`);
        });
      }
    });
  } else {
    console.log('\n🎯 METAS: No hay metas guardadas en la tabla Meta');
  }
  
  await prisma.$disconnect();
}

check().catch(console.error);
