const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function migrarDisponibilidadACallAvailability() {
  console.log('🔄 Iniciando migración de DisponibilidadSemanal a CallAvailability...\n');

  try {
    // 1. Obtener todos los perfiles de mentor
    const perfiles = await prisma.perfilMentor.findMany({
      include: {
        Usuario: {
          select: { id: true, nombre: true }
        }
      }
    });

    console.log(`📋 Encontrados ${perfiles.length} perfiles de mentor\n`);

    for (const perfil of perfiles) {
      console.log(`\n👤 Procesando: ${perfil.Usuario.nombre} (ID: ${perfil.Usuario.id})`);

      // 2. Obtener disponibilidad semanal existente
      const disponibilidad = await prisma.disponibilidadSemanal.findMany({
        where: {
          perfilMentorId: perfil.id,
          activo: true
        },
        orderBy: [
          { diaSemana: 'asc' },
          { horaInicio: 'asc' }
        ]
      });

      if (disponibilidad.length === 0) {
        console.log('   ⚠️  No tiene disponibilidad configurada');
        continue;
      }

      console.log(`   📅 Encontrados ${disponibilidad.length} bloques de disponibilidad`);

      // 3. Verificar si ya tiene datos en CallAvailability
      const existente = await prisma.callAvailability.findFirst({
        where: {
          mentorId: perfil.Usuario.id,
          type: 'MENTORSHIP'
        }
      });

      if (existente) {
        console.log('   ℹ️  Ya tiene datos en CallAvailability, saltando...');
        continue;
      }

      // 4. Migrar cada bloque a CallAvailability
      let migrados = 0;
      for (const bloque of disponibilidad) {
        try {
          await prisma.callAvailability.create({
            data: {
              mentorId: perfil.Usuario.id,
              dayOfWeek: bloque.diaSemana,
              startTime: bloque.horaInicio,
              endTime: bloque.horaFin,
              type: 'MENTORSHIP',
              isActive: true
            }
          });
          migrados++;
        } catch (error) {
          console.log(`   ❌ Error migrando bloque ${bloque.diaSemana} ${bloque.horaInicio}-${bloque.horaFin}: ${error.message}`);
        }
      }

      console.log(`   ✅ Migrados ${migrados}/${disponibilidad.length} bloques a CallAvailability`);
    }

    console.log('\n✅ Migración completada!');

  } catch (error) {
    console.error('❌ Error en migración:', error);
  } finally {
    await prisma.$disconnect();
  }
}

migrarDisponibilidadACallAvailability();
