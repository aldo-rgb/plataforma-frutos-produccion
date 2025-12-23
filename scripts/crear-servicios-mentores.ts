/**
 * Script para crear servicios básicos para mentores que no tienen
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function crearServicios() {
  console.log('🛠️  Creando servicios para mentores...\n');

  const mentores = await prisma.perfilMentor.findMany({
    include: {
      Usuario: { select: { nombre: true } },
      ServicioMentoria: true,
    },
  });

  const sinServicios = mentores.filter((m) => m.ServicioMentoria.length === 0);

  if (sinServicios.length === 0) {
    console.log('✅ Todos los mentores ya tienen servicios configurados.\n');
    return;
  }

  console.log(`📋 Encontrados ${sinServicios.length} mentores sin servicios:\n`);

  for (const mentor of sinServicios) {
    console.log(`   🔄 ${mentor.Usuario.nombre} (ID: ${mentor.id})`);
    console.log(`      - Precio base: $${mentor.precioBase}`);

    const servicio = await prisma.servicioMentoria.create({
      data: {
        perfilMentorId: mentor.id,
        tipo: 'SESION_1_1',
        nombre: 'Sesión Individual de Mentoría',
        descripcion: 'Sesión personalizada 1 a 1 con tu mentor',
        duracionHoras: 1,
        precioTotal: mentor.precioBase || 1000,
        activo: true,
      },
    });

    console.log(`      ✅ Servicio creado: ${servicio.nombre} - $${servicio.precioTotal}\n`);
  }

  console.log('✅ Todos los servicios han sido creados exitosamente.\n');
}

crearServicios()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
