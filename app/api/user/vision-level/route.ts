import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/vision-level
 * Obtiene el nivel actual del usuario en la Vision (BASIC, ADVANCED, PL)
 * También indica si es Lobo Solitario (sin restricciones) o usuario de Vision (acceso progresivo)
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id;

    // Obtener información del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        tier: true,
        suscripcion: true,
        mentorId: true,
        assignedMentorId: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si el usuario tiene enrollments en alguna Vision (fuente principal de verdad)
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId,
        enrollmentStatus: 'ENROLLED'
      },
      select: {
        level: true,
        enrolledAt: true,
        completedAt: true,
        graduatedAt: true,
        visionId: true,
        Vision: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: {
        level: 'desc' // PL > ADVANCED > BASIC
      }
    });

    // También verificar VisionParticipante como fuente secundaria
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: { participanteId: userId },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Si NO tiene enrollments NI es participante → Es "Lobo Solitario" con acceso completo
    const isVisionUser = enrollments.length > 0 || !!visionParticipante;
    
    if (!isVisionUser) {
      return NextResponse.json({
        success: true,
        isVisionUser: false,
        isLoboSolitario: true,
        currentLevel: 'FULL', // Acceso completo
        hasFullAccess: true,
        accessibleModules: {
          carta: true,
          metas: true,
          tareas: true,
          evidencias: true,
          llamadasMentor: true,
          quantum: true,
          disciplina: true,
          ranking: true,
          all: true
        },
        message: 'Lobo Solitario - Acceso completo al software'
      });
    }

    // Si tiene enrollments o es participante de Vision → Verificar nivel actual
    const visionId = enrollments[0]?.visionId || visionParticipante?.Vision?.id;
    const visionName = enrollments[0]?.Vision?.nombre || visionParticipante?.Vision?.nombre;

    // Determinar el nivel más alto del usuario
    // Orden de prioridad: PL > ADVANCED > BASIC
    const levelPriority: Record<string, number> = { 'PL': 3, 'ADVANCED': 2, 'BASIC': 1 };
    let currentLevel: 'BASIC' | 'ADVANCED' | 'PL' = 'BASIC';
    let completedLevels: string[] = [];

    for (const enrollment of enrollments) {
      if (enrollment.graduatedAt || enrollment.completedAt) {
        completedLevels.push(enrollment.level);
      }
      if (levelPriority[enrollment.level] > levelPriority[currentLevel]) {
        currentLevel = enrollment.level as 'BASIC' | 'ADVANCED' | 'PL';
      }
    }

    // Definir qué módulos están accesibles según el nivel
    // BASIC: Ranking, Quantum, Llamadas Mentor
    // ADVANCED: + Carta, Metas
    // PL: + Tareas, Evidencias, Disciplina (acceso completo)
    const accessibleModules = {
      // Siempre disponibles (todos los niveles)
      ranking: true,
      quantum: true,
      llamadasMentor: true,
      
      // ADVANCED y PL: Carta, Metas
      carta: currentLevel === 'ADVANCED' || currentLevel === 'PL',
      metas: currentLevel === 'ADVANCED' || currentLevel === 'PL',
      
      // Solo PL: Tareas, Evidencias, Disciplina
      tareas: currentLevel === 'PL',
      evidencias: currentLevel === 'PL',
      disciplina: currentLevel === 'PL',
      
      // Acceso completo solo si es PL
      all: currentLevel === 'PL'
    };

    // Mensajes de bloqueo por módulo
    const lockedMessages = {
      tareas: '🔒 Disponible al registrarte en PL (Program Leadership)',
      evidencias: '🔒 Disponible al registrarte en PL (Program Leadership)',
      carta: '🔒 Disponible al registrarte en AVANZADO',
      metas: '🔒 Disponible al registrarte en AVANZADO',
      disciplina: '🔒 Disponible al registrarte en PL (Program Leadership)',
      ranking: '', // Siempre disponible
      quantum: '', // Siempre disponible
      llamadasMentor: '', // Siempre disponible
    };

    return NextResponse.json({
      success: true,
      isVisionUser: true,
      isLoboSolitario: false,
      visionId,
      visionName,
      currentLevel,
      completedLevels,
      hasFullAccess: currentLevel === 'PL',
      accessibleModules,
      lockedMessages,
      enrollments: enrollments.map(e => ({
        level: e.level,
        enrolledAt: e.enrolledAt,
        completed: !!e.completedAt || !!e.graduatedAt
      }))
    });

  } catch (error) {
    console.error('Error fetching vision level:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener nivel de visión' },
      { status: 500 }
    );
  }
}
