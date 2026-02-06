/**
 * Script para configurar horarios de disciplina para un mentor
 * Esto permite que el mentor aparezca en la lista de selección
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function setupMentorDisciplineSchedule() {
  console.log('\n⚙️  CONFIGURANDO HORARIOS DE DISCIPLINA PARA MENTOR\n');

  try {
    // 1. Buscar un mentor activo
    const mentor = await prisma.usuario.findFirst({
      where: {
        rol: 'MENTOR',
        isActive: true
      },
      include: {
        PerfilMentor: true,
        CallAvailability: true
      }
    });

    if (!mentor) {
      console.log('❌ No se encontró ningún mentor activo');
      return;
    }

    console.log(`✅ Mentor encontrado: ${mentor.nombre} (${mentor.email})`);
    console.log(`   Horarios actuales: ${mentor.CallAvailability.length}`);

    // 2. Verificar si ya tiene horarios de disciplina
    const disciplinaExistente = mentor.CallAvailability.filter(
      c => c.type === 'DISCIPLINE' && c.isActive
    );

    if (disciplinaExistente.length > 0) {
      console.log(`   ℹ️  Ya tiene ${disciplinaExistente.length} horarios de disciplina configurados`);
    }

    // 3. Agregar horarios de disciplina (Lunes y Jueves 9:00-10:00)
    console.log('\n📅 Agregando horarios de disciplina...');

    const horariosAgregar = [
      { dayOfWeek: 1, startTime: '09:00', endTime: '10:00', type: 'DISCIPLINE' }, // Lunes
      { dayOfWeek: 1, startTime: '14:00', endTime: '15:00', type: 'DISCIPLINE' }, // Lunes tarde
      { dayOfWeek: 3, startTime: '09:00', endTime: '10:00', type: 'DISCIPLINE' }, // Miércoles
      { dayOfWeek: 3, startTime: '14:00', endTime: '15:00', type: 'DISCIPLINE' }, // Miércoles tarde
      { dayOfWeek: 4, startTime: '10:00', endTime: '11:00', type: 'DISCIPLINE' }, // Jueves
      { dayOfWeek: 4, startTime: '16:00', endTime: '17:00', type: 'DISCIPLINE' }, // Jueves tarde
    ];

    for (const horario of horariosAgregar) {
      // Verificar si ya existe
      const existe = await prisma.callAvailability.findFirst({
        where: {
          mentorId: mentor.id,
          dayOfWeek: horario.dayOfWeek,
          startTime: horario.startTime,
          endTime: horario.endTime,
          type: horario.type
        }
      });

      if (!existe) {
        await prisma.callAvailability.create({
          data: {
            mentorId: mentor.id,
            dayOfWeek: horario.dayOfWeek,
            startTime: horario.startTime,
            endTime: horario.endTime,
            type: horario.type,
            isActive: true
          }
        });

        const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
        console.log(`   ✅ ${dias[horario.dayOfWeek]} ${horario.startTime}-${horario.endTime}`);
      } else {
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        console.log(`   ⏭️  ${dias[horario.dayOfWeek]} ${horario.startTime}-${horario.endTime} (ya existe)`);
      }
    }

    // 4. Verificar resultado final
    const horariosFinales = await prisma.callAvailability.findMany({
      where: {
        mentorId: mentor.id,
        type: 'DISCIPLINE',
        isActive: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    console.log(`\n✅ CONFIGURACIÓN COMPLETADA`);
    console.log(`   Total de horarios de disciplina activos: ${horariosFinales.length}`);
    console.log(`\n📋 Horarios configurados:`);
    
    const dias = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    horariosFinales.forEach(h => {
      console.log(`   - ${dias[h.dayOfWeek]}: ${h.startTime} a ${h.endTime}`);
    });

    console.log(`\n✅ El mentor ${mentor.nombre} ahora aparecerá en la lista de selección\n`);

  } catch (error) {
    console.error('❌ ERROR:', error);
  } finally {
    await prisma.$disconnect();
  }
}

setupMentorDisciplineSchedule();
