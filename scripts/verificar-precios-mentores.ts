/**
 * Script para verificar y configurar precios de mentores
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function verificarPrecios() {
  console.log('💰 Verificando precios de mentores...\n');

  const mentores = await prisma.perfilMentor.findMany({
    include: {
      Usuario: {
        select: {
          id: true,
          nombre: true,
          email: true,
        },
      },
      ServicioMentoria: true,
    },
    orderBy: {
      id: 'asc',
    },
  });

  console.log('┌─────┬─────────────────────────────┬────────────────┬────────────────┐');
  console.log('│ ID  │ Nombre                      │ precioBase     │ Servicio       │');
  console.log('├─────┼─────────────────────────────┼────────────────┼────────────────┤');

  const sinPrecio: any[] = [];

  mentores.forEach((mentor) => {
    const id = mentor.id.toString().padEnd(3);
    const nombre = mentor.Usuario.nombre.padEnd(27);
    const precioBase = mentor.precioBase ? `$${mentor.precioBase.toString()}` : '❌ $0';
    const serviciosPrecio = mentor.ServicioMentoria[0]?.precioTotal 
      ? `$${mentor.ServicioMentoria[0].precioTotal}` 
      : '❌ Sin servicio';

    console.log(`│ ${id} │ ${nombre} │ ${precioBase.padEnd(14)} │ ${serviciosPrecio.padEnd(14)} │`);

    if (!mentor.precioBase || mentor.precioBase === 0) {
      sinPrecio.push(mentor);
    }
  });

  console.log('└─────┴─────────────────────────────┴────────────────┴────────────────┘\n');

  if (sinPrecio.length > 0) {
    console.log('⚠️  MENTORES SIN PRECIO CONFIGURADO:\n');
    
    for (const mentor of sinPrecio) {
      console.log(`   ❌ Mentor ${mentor.id} (${mentor.Usuario.nombre})`);
      console.log(`      - Nivel: ${mentor.nivel}`);
      console.log(`      - precioBase: ${mentor.precioBase || 0}`);
      
      // Sugerir precio según nivel
      let precioSugerido = 0;
      switch (mentor.nivel) {
        case 'MASTER':
          precioSugerido = 1000;
          break;
        case 'SENIOR':
          precioSugerido = 800;
          break;
        case 'JUNIOR':
          precioSugerido = 500;
          break;
      }
      
      console.log(`      - Precio sugerido (${mentor.nivel}): $${precioSugerido}\n`);
    }

    console.log('💡 ¿Deseas configurar precios automáticamente según el nivel?\n');
    console.log('   Para configurar manualmente, ejecuta:');
    console.log('   npx ts-node --compiler-options \'{"module":"commonjs"}\' scripts/configurar-precio-mentor.ts <mentorId> <precio>\n');
    
    // Auto-configurar precios
    console.log('🔄 Configurando precios automáticamente...\n');
    
    for (const mentor of sinPrecio) {
      let precioSugerido = 0;
      switch (mentor.nivel) {
        case 'MASTER':
          precioSugerido = 1000;
          break;
        case 'SENIOR':
          precioSugerido = 800;
          break;
        case 'JUNIOR':
          precioSugerido = 500;
          break;
      }

      await prisma.perfilMentor.update({
        where: { id: mentor.id },
        data: { precioBase: precioSugerido },
      });

      console.log(`   ✅ ${mentor.Usuario.nombre}: $${precioSugerido} (${mentor.nivel})`);

      // Si no tiene servicio, crear uno básico
      if (mentor.ServicioMentoria.length === 0) {
        await prisma.servicioMentoria.create({
          data: {
            perfilMentorId: mentor.id,
            tipo: 'SESION_1_1',
            nombre: 'Sesión Individual',
            descripcion: 'Sesión de mentoría personalizada 1 a 1',
            duracionHoras: 1,
            precioTotal: precioSugerido,
            activo: true,
          },
        });
        console.log(`      + Servicio creado: $${precioSugerido}`);
      }
    }

    console.log('\n✅ Todos los precios han sido configurados.\n');
  } else {
    console.log('✅ Todos los mentores tienen precio configurado.\n');
  }
}

verificarPrecios()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
