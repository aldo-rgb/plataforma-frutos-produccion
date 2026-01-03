const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function actualizarPerfilesMentores() {
  try {
    console.log('🔄 Actualizando perfiles de mentores con información completa...\n');

    const mentores = await prisma.perfilMentor.findMany({
      include: {
        Usuario: true,
      },
    });

    console.log(`📊 Encontrados ${mentores.length} perfiles de mentores\n`);

    for (const mentor of mentores) {
      const nombreMentor = mentor.Usuario.nombre;
      
      // Datos de ejemplo basados en el mentor
      const datosActualizados = {
        biografiaCompleta: mentor.biografiaCompleta || `Soy ${nombreMentor}, mentor especializado en ${mentor.especialidad}. Con ${mentor.experienciaAnios} años de experiencia acompañando personas en su proceso de transformación personal y espiritual.\n\nMi enfoque se centra en ayudarte a descubrir tu propósito, desarrollar hábitos poderosos y vivir una vida intencional alineada con tus valores más profundos.\n\nHe trabajado con cientos de personas, guiándolas en su camino hacia una vida más significativa y plena. Mi metodología combina sabiduría práctica con herramientas de desarrollo personal probadas.`,
        
        biografiaCorta: mentor.biografiaCorta || `Mentor en ${mentor.especialidad} con ${mentor.experienciaAnios} años de experiencia ayudando a personas a transformar sus vidas.`,
        
        tagline: mentor.tagline || `Transformando vidas a través de ${mentor.especialidad}`,
        
        heroJourneyBio: mentor.heroJourneyBio || `Mi historia comenzó cuando me di cuenta de que vivía en piloto automático, sin un propósito claro. Ese momento de crisis se convirtió en mi mayor regalo.\n\nA través de un proceso de autoconocimiento profundo, descubrí mi llamado a acompañar a otros en su propio viaje de transformación. Los obstáculos que enfrenté se convirtieron en las herramientas que hoy uso para ayudar a mis mentorados.\n\nHoy, después de ${mentor.experienciaAnios} años de experiencia, he tenido el privilegio de ver cómo cientos de personas descubren su propósito y viven la vida que realmente desean.`,
        
        promiseStatement: mentor.promiseStatement || `Mi compromiso contigo es ser tu guía honesto y comprometido en tu proceso de transformación. Te ayudaré a clarificar tu visión, superar obstáculos y desarrollar las habilidades necesarias para crear la vida que deseas. No te ofreceré soluciones mágicas, pero sí un acompañamiento genuino, herramientas prácticas y la rendición de cuentas que necesitas para lograr resultados reales.`,
        
        logros: mentor.logros?.length > 0 ? mentor.logros : [
          'Certificación en Coaching de Vida',
          'Entrenamiento en Diseño de Vida Intencional',
          `${mentor.totalSesiones}+ sesiones de mentoría completadas`,
          'Especialización en Desarrollo Personal',
          'Formación en Liderazgo Transformacional',
        ],
        
        especialidadesSecundarias: mentor.especialidadesSecundarias?.length > 0 ? mentor.especialidadesSecundarias : [
          'Desarrollo de Hábitos',
          'Claridad de Propósito',
          'Gestión del Tiempo',
          'Inteligencia Emocional',
        ],
        
        expertiseTags: mentor.expertiseTags?.length > 0 ? mentor.expertiseTags : [
          'Transformación Personal',
          'Diseño de Vida',
          'Formación de Hábitos',
          'Crecimiento Espiritual',
          'Liderazgo Personal',
          'Claridad Mental',
          'Propósito de Vida',
          'Rendición de Cuentas',
        ],
        
        precioBase: mentor.precioBase || 1000.0,
        precioDisciplina: mentor.precioDisciplina || 90.0,
        
        horarioInicio: mentor.horarioInicio || '09:00',
        horarioFin: mentor.horarioFin || '18:00',
        diasDisponibles: mentor.diasDisponibles?.length > 0 ? mentor.diasDisponibles : [1, 2, 3, 4, 5],
      };

      const updated = await prisma.perfilMentor.update({
        where: { id: mentor.id },
        data: datosActualizados,
      });

      console.log(`✅ Actualizado perfil de: ${nombreMentor}`);
      console.log(`   - Biografía completa: ${datosActualizados.biografiaCompleta.length} caracteres`);
      console.log(`   - Logros: ${datosActualizados.logros.length} items`);
      console.log(`   - Tags de expertise: ${datosActualizados.expertiseTags.length} tags`);
      console.log('');
    }

    console.log('\n✅ Todos los perfiles han sido actualizados con éxito!');
    console.log('\n📝 Ahora puedes ver los perfiles públicos en:');
    mentores.forEach(m => {
      console.log(`   👉 http://localhost:3000/mentores/${m.usuarioId}`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

actualizarPerfilesMentores();
