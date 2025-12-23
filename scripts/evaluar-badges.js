/**
 * 🏅 SCRIPT: Evaluación Masiva de Medallas de Honor
 * 
 * Este script evalúa y actualiza las medallas de TODOS los mentores activos
 * en el sistema según los criterios establecidos:
 * 
 * - INQUEBRANTABLE (🛡️): 0 faltas en últimas 5 sesiones
 * - ERUDITO (📚): Comparte recursos en 3+ de últimas 10 reseñas
 * - FLASH (⚡): 80%+ de confirmaciones rápidas
 * - ZEN_MASTER (🧘): Rating 4.8+ con 10+ reseñas
 * 
 * Ejecución:
 * node scripts/evaluar-badges.js
 */

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAndAwardBadges(mentorId) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { id: true, badges: true }
    });

    if (!usuario) {
      console.log(`⚠️  Usuario ${mentorId} no encontrado`);
      return;
    }

    const currentBadges = new Set(usuario.badges || []);
    const newBadges = new Set(usuario.badges || []);

    // 1. 🛡️ INQUEBRANTABLE: Sin faltas en las últimas 5 sesiones
    const lastSessions = await prisma.callBooking.findMany({
      where: {
        mentorId,
        status: { in: ['COMPLETED', 'MISSED'] }
      },
      orderBy: { scheduledAt: 'desc' },
      take: 5
    });

    if (lastSessions.length >= 5) {
      const hasMissed = lastSessions.some(s => s.status === 'MISSED');
      if (!hasMissed) {
        newBadges.add('INQUEBRANTABLE');
      } else {
        newBadges.delete('INQUEBRANTABLE');
      }
    } else {
      newBadges.delete('INQUEBRANTABLE');
    }

    // 2. 📚 ERUDITO: Comparte recursos en 3+ de las últimas 10 reseñas
    // Primero obtenemos el perfilMentorId del usuario
    const perfilMentor = await prisma.perfilMentor.findFirst({
      where: { usuarioId: mentorId },
      select: { id: true }
    });

    if (perfilMentor) {
      const reviews = await prisma.resenasMentoria.findMany({
        where: { perfilMentorId: perfilMentor.id },
        orderBy: { createdAt: 'desc' },
        take: 10,
        select: { sharedResources: true }
      });

      const resourcesCount = reviews.filter(r => r.sharedResources).length;
      if (resourcesCount >= 3) {
        newBadges.add('ERUDITO');
      } else {
        newBadges.delete('ERUDITO');
      }
    } else {
      newBadges.delete('ERUDITO');
    }

    // 3. ⚡ FLASH: 80%+ de confirmaciones rápidas
    const totalBookings = await prisma.callBooking.count({
      where: { mentorId, status: { not: 'CANCELLED' } }
    });

    const confirmed = await prisma.callBooking.count({
      where: { mentorId, status: { in: ['CONFIRMED', 'COMPLETED'] } }
    });

    if (totalBookings > 0 && (confirmed / totalBookings) >= 0.8) {
      newBadges.add('FLASH');
    } else {
      newBadges.delete('FLASH');
    }

    // 4. 🧘 ZEN_MASTER: Rating 4.8+ con 10+ reseñas
    // Ya tenemos perfilMentor de la sección anterior
    if (!perfilMentor) {
      const pm = await prisma.perfilMentor.findFirst({
        where: { usuarioId: mentorId },
        select: { calificacionPromedio: true, totalResenas: true }
      });
      if (pm) {
        const { calificacionPromedio, totalResenas } = pm;
        if (totalResenas >= 10 && calificacionPromedio >= 4.8) {
          newBadges.add('ZEN_MASTER');
        } else {
          newBadges.delete('ZEN_MASTER');
        }
      }
    } else {
      const pm = await prisma.perfilMentor.findFirst({
        where: { id: perfilMentor.id },
        select: { calificacionPromedio: true, totalResenas: true }
      });
      if (pm) {
        const { calificacionPromedio, totalResenas } = pm;
        if (totalResenas >= 10 && calificacionPromedio >= 4.8) {
          newBadges.add('ZEN_MASTER');
        } else {
          newBadges.delete('ZEN_MASTER');
        }
      }
    }

    // Actualizar si hay cambios
    const badgesArray = Array.from(newBadges);
    const currentArray = Array.from(currentBadges);
    
    if (JSON.stringify(badgesArray.sort()) !== JSON.stringify(currentArray.sort())) {
      await prisma.usuario.update({
        where: { id: mentorId },
        data: { badges: badgesArray }
      });
      
      console.log(`✅ Mentor ${mentorId}: ${badgesArray.join(', ') || 'Sin medallas'}`);
    } else {
      console.log(`⚪ Mentor ${mentorId}: Sin cambios (${badgesArray.join(', ') || 'Sin medallas'})`);
    }

  } catch (error) {
    console.error(`❌ Error evaluando mentor ${mentorId}:`, error.message);
  }
}

async function evaluateAllMentorBadges() {
  const mentores = await prisma.usuario.findMany({
    where: {
      rol: 'MENTOR',
      isActive: true,
      PerfilMentor: { isNot: null } // Corregido: Prisma usa PascalCase para relaciones
    },
    select: { id: true, nombre: true } // Sin apellido - no existe en Usuario
  });

  console.log(`📊 Encontrados ${mentores.length} mentores activos\n`);

  for (const mentor of mentores) {
    console.log(`🔄 Evaluando: ${mentor.nombre} (ID: ${mentor.id})`);
    await checkAndAwardBadges(mentor.id);
  }
}

async function main() {
  console.log('🏅 =============================================');
  console.log('🏅 INICIANDO EVALUACIÓN MASIVA DE MEDALLAS');
  console.log('🏅 =============================================\n');

  try {
    await evaluateAllMentorBadges();
    
    console.log('\n✅ =============================================');
    console.log('✅ EVALUACIÓN COMPLETADA EXITOSAMENTE');
    console.log('✅ =============================================');
    
    await prisma.$disconnect();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ =============================================');
    console.error('❌ ERROR EN LA EVALUACIÓN');
    console.error('❌ =============================================');
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

main();
