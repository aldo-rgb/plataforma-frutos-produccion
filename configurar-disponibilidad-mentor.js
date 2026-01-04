const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function configurarDisponibilidadMentor() {
  try {
    // Obtener perfil del mentor
    const perfilMentor = await prisma.perfilMentor.findFirst({
      where: { usuarioId: 8 },
      select: { id: true }
    });
    
    if (!perfilMentor) {
      console.log('❌ El mentor (ID: 8) no tiene PerfilMentor');
      return;
    }
    
    console.log('✅ PerfilMentor ID:', perfilMentor.id);
    
    // Verificar disponibilidad
    const disponibilidad = await prisma.disponibilidadSemanal.findMany({
      where: { 
        perfilMentorId: perfilMentor.id,
        activo: true
      }
    });
    
    console.log('📅 Disponibilidad actual:', disponibilidad.length, 'slots');
    
    if (disponibilidad.length === 0) {
      console.log('\n⚠️ El mentor no tiene horarios configurados. Creando disponibilidad...');
      
      // Crear disponibilidad de ejemplo (Lunes a Viernes, 5 AM - 8 PM cada 20 min)
      for (let dia = 1; dia <= 5; dia++) {
        await prisma.disponibilidadSemanal.create({
          data: {
            perfilMentorId: perfilMentor.id,
            diaSemana: dia,
            horaInicio: '05:00',
            horaFin: '20:00',
            activo: true,
            updatedAt: new Date()
          }
        });
      }
      
      console.log('✅ Disponibilidad creada: Lunes a Viernes, 5:00 - 20:00');
    } else {
      disponibilidad.forEach((slot, i) => {
        const dias = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
        console.log(`  ${i + 1}. ${dias[slot.diaSemana]}: ${slot.horaInicio} - ${slot.horaFin}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await prisma.$disconnect();
  }
}

configurarDisponibilidadMentor();
