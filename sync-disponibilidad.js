const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function sincronizarDisponibilidad() {
  console.log('🔄 Sincronizando DisponibilidadSemanal → CallAvailability...\n');

  try {
    const mentorId = 28; // Dr. Strange
    
    // 1. Obtener perfil mentor
    const perfil = await prisma.perfilMentor.findUnique({
      where: { usuarioId: mentorId },
      include: {
        Usuario: { select: { nombre: true } }
      }
    });

    if (!perfil) {
      console.log('❌ No se encontró el perfil del mentor');
      return;
    }

    console.log(`👤 Mentor: ${perfil.Usuario.nombre}\n`);

    // 2. Obtener disponibilidad actual en DisponibilidadSemanal
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

    console.log('📅 DisponibilidadSemanal (Sistema actual):');
    disponibilidad.forEach(d => {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      console.log(`   ${dias[d.diaSemana]}: ${d.horaInicio} - ${d.horaFin}`);
    });

    // 3. Obtener disponibilidad en CallAvailability
    const callAvail = await prisma.callAvailability.findMany({
      where: {
        mentorId: mentorId,
        type: 'MENTORSHIP',
        isActive: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    console.log('\n📞 CallAvailability (Sistema viejo - será reemplazado):');
    callAvail.forEach(c => {
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      console.log(`   ${dias[c.dayOfWeek]}: ${c.startTime} - ${c.endTime}`);
    });

    // 4. Eliminar datos viejos de CallAvailability
    console.log('\n🗑️  Eliminando datos viejos de CallAvailability...');
    await prisma.callAvailability.deleteMany({
      where: {
        mentorId: mentorId,
        type: 'MENTORSHIP'
      }
    });
    console.log('   ✅ Eliminados');

    // 5. Copiar datos de DisponibilidadSemanal a CallAvailability
    console.log('\n📋 Copiando datos actualizados...');
    let copiados = 0;
    for (const bloque of disponibilidad) {
      await prisma.callAvailability.create({
        data: {
          mentorId: mentorId,
          dayOfWeek: bloque.diaSemana,
          startTime: bloque.horaInicio,
          endTime: bloque.horaFin,
          type: 'MENTORSHIP',
          isActive: true
        }
      });
      copiados++;
      const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
      console.log(`   ✅ ${dias[bloque.diaSemana]}: ${bloque.horaInicio} - ${bloque.horaFin}`);
    }

    console.log(`\n✅ Sincronización completada! (${copiados} bloques copiados)`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

sincronizarDisponibilidad();
