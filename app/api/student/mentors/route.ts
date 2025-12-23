import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/student/mentors
 * 
 * Catálogo inteligente de mentores con algoritmo de clasificación:
 * - Los mejores (MASTER/SENIOR con buen rating) aparecen arriba
 * - Los saturados (>80% ocupación) bajan en el ranking
 * - Se detecta y marca Club 5 AM automáticamente
 */
export async function GET() {
  try {
    // 1. Obtener todos los mentores activos con sus perfiles
    const mentoresConPerfil = await prisma.perfilMentor.findMany({
      where: {
        disponible: true,
        Usuario: {
          isActive: true,
          rol: 'MENTOR'
        }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true,
            jobTitle: true,
            experienceYears: true,
            bioShort: true,
            badges: true
          }
        },
        ResenasMentoria: {
          select: { calificacion: true },
          take: 50 // Para calcular rating promedio
        }
      }
    });

    // 2. PROCESAMIENTO INTELIGENTE (El Algoritmo)
    const processedMentors = await Promise.all(mentoresConPerfil.map(async (perfil) => {
      
      // A. CALCULAR OCUPACIÓN (Llamadas DISCIPLINE activas)
      // Contamos cuántas suscripciones activas tiene este mentor
      const activeStudents = await prisma.disciplineSubscription.count({
        where: { 
          mentorId: perfil.usuarioId,
          status: 'ACTIVE'
        }
      });
      
      // B. OBTENER HORARIO DE DISCIPLINA (Para detectar Club 5 AM)
      const disciplineSchedule = await prisma.disciplineSchedule.findUnique({
        where: { mentorId: perfil.usuarioId }
      });
      
      // C. DETECTAR "CLUB 5 AM"
      // Si tiene configurado horario que inicia a las 05:xx
      const is5AMClub = disciplineSchedule?.isActive && 
                        disciplineSchedule?.startTime.startsWith('05');

      // D. CALCULAR CAPACIDAD TEÓRICA
      // Si tiene horario configurado, calcular slots disponibles
      let capacity = 10; // Capacidad base por defecto
      
      if (disciplineSchedule && disciplineSchedule.allowedDays.length > 0) {
        // Cada día configurado = ~3 horas (5-8 AM) = 12 slots de 15 min
        // Con 2 días a la semana = 24 slots semanales = ~10-12 alumnos
        capacity = disciplineSchedule.allowedDays.length * 5; // 5 alumnos por día configurado
      }
      
      const occupancyRate = capacity > 0 ? activeStudents / capacity : 0; // 0.0 a 1.0+

      // E. CALCULAR RATING PROMEDIO (desde PerfilMentor)
      const avgRating = perfil.calificacionPromedio || 0;

      // F. CALCULAR PUNTAJE DE ORDENAMIENTO (Score)
      let score = 0;

      // Criterio 1: Jerarquía (Los mejores arriba)
      if (perfil.nivel === 'MASTER') score += 300;
      else if (perfil.nivel === 'SENIOR') score += 200;
      else score += 100; // JUNIOR

      // Criterio 2: Rating (Calidad) - hasta +50 puntos
      score += (avgRating * 10);

      // Criterio 3: PENALIZACIÓN POR SATURACIÓN (>80%)
      // Si está muy lleno, lo mandamos al fondo (-500 puntos)
      if (occupancyRate > 0.8) {
        score -= 500;
      }

      // Criterio 4: BONUS por disponibilidad (espacios libres)
      if (occupancyRate < 0.3) {
        score += 50; // Bonus por tener mucha disponibilidad
      }

      // Criterio 5: BONUS por ser destacado
      if (perfil.destacado) {
        score += 100;
      }

      return {
        // Datos del usuario
        id: perfil.usuarioId,
        full_name: perfil.Usuario.nombre,
        email: perfil.Usuario.email,
        profileImage: perfil.Usuario.profileImage,
        jobTitle: perfil.Usuario.jobTitle || 'Mentor',
        experienceYears: perfil.Usuario.experienceYears || 0,
        bioShort: perfil.Usuario.bioShort,
        basePrice: perfil.precioBase || 1000,
        badges: perfil.Usuario.badges || [],
        
        // Datos del perfil de mentor
        perfilMentorId: perfil.id,
        level: perfil.nivel,
        especialidad: perfil.especialidad,
        biografiaCorta: perfil.biografiaCorta,
        average_rating: avgRating,
        totalResenas: perfil.totalResenas,
        totalSesiones: perfil.totalSesiones,
        destacado: perfil.destacado,
        
        // Datos de ocupación y disponibilidad
        occupancyRate: Math.round(occupancyRate * 100), // Convertir a porcentaje
        activeStudents,
        capacity,
        availableSlots: Math.max(0, capacity - activeStudents),
        
        // Indicadores especiales
        is5AMClub,
        isSaturated: occupancyRate > 0.8,
        
        // Score para ordenamiento (opcional, para debug)
        score
      };
    }));

    // 3. ORDENAR LA LISTA (Mayor Score primero)
    processedMentors.sort((a, b) => b.score - a.score);

    console.log(`📋 Catálogo de mentores generado: ${processedMentors.length} mentores ordenados por algoritmo`);

    return NextResponse.json({
      success: true,
      count: processedMentors.length,
      mentors: processedMentors
    });

  } catch (error) {
    console.error('❌ Error cargando catálogo de mentores:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Error cargando catálogo de mentores',
        mentors: []
      },
      { status: 500 }
    );
  }
}
