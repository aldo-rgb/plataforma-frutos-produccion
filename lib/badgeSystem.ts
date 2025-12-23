import { prisma } from '@/lib/prisma';

/**
 * Sistema de Medallas de Honor (Gamificación de Mentores)
 * Evalúa y otorga insignias basadas en el desempeño del mentor
 */

export async function checkAndAwardBadges(mentorId: number) {
  try {
    const usuario = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { id: true, badges: true }
    });

    if (!usuario) {
      console.log(`⚠️ Usuario ${mentorId} no encontrado`);
      return;
    }

    const currentBadges = new Set(usuario.badges || []);
    const newBadges = new Set(usuario.badges || []); // Copia para modificar

    // -----------------------------------------------------------
    // 1. 🛡️ INSIGNIA "INQUEBRANTABLE" (Asistencia Perfecta)
    // Regla: Sus primeras 5 sesiones (o las últimas 5) fueron COMPLETED (No MISSED)
    // -----------------------------------------------------------
    const lastSessions = await prisma.callBooking.findMany({
      where: { 
        mentorId: mentorId, 
        status: { in: ['COMPLETED', 'MISSED'] } 
      },
      orderBy: { scheduledAt: 'desc' },
      take: 5 // Miramos las últimas 5
    });

    if (lastSessions.length >= 5) {
      // Si ninguna es 'MISSED', ¡Premio!
      const hasMissed = lastSessions.some(s => s.status === 'MISSED');
      if (!hasMissed) {
        newBadges.add('INQUEBRANTABLE');
      } else {
        newBadges.delete('INQUEBRANTABLE'); // Se la quitamos si falla
      }
    }

    // -----------------------------------------------------------
    // 2. 📚 INSIGNIA "ERUDITO" (Aportador de Valor)
    // Regla: Si en sus últimas 10 reviews, al menos 3 dicen que SÍ compartió recursos
    // -----------------------------------------------------------
    const perfilMentor = await prisma.perfilMentor.findUnique({
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
    }

    // -----------------------------------------------------------
    // 3. ⚡ INSIGNIA "FLASH" (Respuesta Rápida)
    // Regla: Responde booking requests en menos de 2 horas
    // (Implementación simplificada: si tiene 80%+ de confirmados)
    // -----------------------------------------------------------
    const bookingStats = await prisma.callBooking.groupBy({
      by: ['status'],
      where: { 
        mentorId: mentorId,
        type: 'MENTORSHIP'
      },
      _count: true
    });

    const totalBookings = bookingStats.reduce((sum, stat) => sum + stat._count, 0);
    const confirmed = bookingStats.find(s => s.status === 'CONFIRMED')?._count || 0;
    
    if (totalBookings > 0 && (confirmed / totalBookings) >= 0.8) {
      newBadges.add('FLASH');
    }

    // -----------------------------------------------------------
    // 4. 🧘 INSIGNIA "ZEN MASTER" (Paciencia y Excelencia)
    // Regla: Rating perfecto (>=4.8) con al menos 10 reviews
    // -----------------------------------------------------------
    if (perfilMentor) {
      const perfil = await prisma.perfilMentor.findUnique({
        where: { id: perfilMentor.id },
        select: {
          calificacionPromedio: true,
          totalResenas: true
        }
      });

      if (perfil && perfil.totalResenas >= 10 && perfil.calificacionPromedio >= 4.8) {
        newBadges.add('ZEN_MASTER');
      } else {
        newBadges.delete('ZEN_MASTER');
      }
    }

    // --- GUARDAR CAMBIOS ---
    // Solo si hubo cambios en las medallas
    const badgesArray = Array.from(newBadges);
    if (JSON.stringify(Array.from(currentBadges).sort()) !== JSON.stringify(badgesArray.sort())) {
      await prisma.usuario.update({
        where: { id: mentorId },
        data: { badges: badgesArray }
      });
      
      console.log(`🏅 Medallas actualizadas para Mentor ${mentorId}:`, badgesArray);
      return badgesArray;
    }

    return Array.from(currentBadges);

  } catch (error) {
    console.error(`❌ Error evaluando medallas para mentor ${mentorId}:`, error);
    return [];
  }
}

/**
 * Evaluar medallas para todos los mentores activos
 * Útil para scripts de mantenimiento
 */
export async function evaluateAllMentorBadges() {
  try {
    const mentores = await prisma.usuario.findMany({
      where: { 
        rol: 'MENTOR',
        isActive: true
      },
      select: { id: true, nombre: true }
    });

    console.log(`\n🏅 Evaluando medallas para ${mentores.length} mentores...\n`);

    for (const mentor of mentores) {
      console.log(`📋 Evaluando: ${mentor.nombre} (ID: ${mentor.id})`);
      await checkAndAwardBadges(mentor.id);
    }

    console.log(`\n✅ Evaluación masiva completada\n`);
  } catch (error) {
    console.error('❌ Error en evaluación masiva:', error);
  }
}
