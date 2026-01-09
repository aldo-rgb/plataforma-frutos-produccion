import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/user/vision-level
 * Determina el tipo de usuario y su nivel de acceso:
 * 
 * 1. vision_enrollments (BASIC/ADVANCED/PL) → Acceso PROGRESIVO según nivel
 * 2. VisionParticipante (sin enrollment) → Acceso COMPLETO (Liderato directo)
 * 3. Ninguno → Lobo Solitario con acceso COMPLETO
 * 
 * Programa de Seguimiento (disciplina): Solo PL, VisionParticipante, o Lobo Solitario
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

    // PASO 1: Verificar vision_enrollments (fuente de acceso progresivo)
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

    // PASO 2: Verificar VisionParticipante (agregado por coordinador = acceso completo)
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: { participanteId: userId },
      include: {
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Acceso completo para todos los módulos
    const fullAccess = {
      carta: true,
      metas: true,
      tareas: true,
      evidencias: true,
      llamadasMentor: true,
      quantum: true,
      disciplina: true,
      ranking: true,
      all: true
    };

    // CASO 1: Usuario tiene enrollment → Acceso PROGRESIVO según nivel
    if (enrollments.length > 0) {
      const visionId = enrollments[0]?.visionId;
      const visionName = enrollments[0]?.Vision?.nombre;

      // Determinar el nivel más alto del usuario
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

      // Definir acceso según nivel
      // BASIC: Ranking, Quantum, Llamadas Mentor
      // ADVANCED: + Carta, Metas
      // PL: + Tareas, Evidencias, Disciplina (acceso completo)
      const accessibleModules = {
        ranking: true,
        quantum: true,
        llamadasMentor: true,
        carta: currentLevel === 'ADVANCED' || currentLevel === 'PL',
        metas: currentLevel === 'ADVANCED' || currentLevel === 'PL',
        tareas: currentLevel === 'PL',
        evidencias: currentLevel === 'PL',
        disciplina: currentLevel === 'PL',
        all: currentLevel === 'PL'
      };

      const lockedMessages = {
        tareas: '🔒 Disponible al registrarte en PL (Program Leadership)',
        evidencias: '🔒 Disponible al registrarte en PL (Program Leadership)',
        carta: '🔒 Disponible al registrarte en AVANZADO',
        metas: '🔒 Disponible al registrarte en AVANZADO',
        disciplina: '🔒 Disponible al registrarte en PL (Program Leadership)',
        ranking: '',
        quantum: '',
        llamadasMentor: '',
      };

      return NextResponse.json({
        success: true,
        userType: 'VISION_ENROLLED', // Usuario con enrollment progresivo
        isVisionUser: true,
        isLoboSolitario: false,
        isVisionParticipante: false,
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
        })),
        message: `Usuario Vision nivel ${currentLevel}`
      });
    }

    // CASO 2: Usuario es VisionParticipante (sin enrollment) → Acceso COMPLETO
    if (visionParticipante) {
      return NextResponse.json({
        success: true,
        userType: 'VISION_PARTICIPANTE', // Agregado por coordinador
        isVisionUser: true,
        isLoboSolitario: false,
        isVisionParticipante: true,
        visionId: visionParticipante.Vision?.id,
        visionName: visionParticipante.Vision?.nombre,
        currentLevel: 'FULL',
        hasFullAccess: true,
        accessibleModules: fullAccess,
        lockedMessages: {},
        message: 'VisionParticipante - Acceso completo (Liderato directo)'
      });
    }

    // CASO 3: No tiene enrollment ni es participante → Lobo Solitario
    return NextResponse.json({
      success: true,
      userType: 'LOBO_SOLITARIO',
      isVisionUser: false,
      isLoboSolitario: true,
      isVisionParticipante: false,
      currentLevel: 'FULL',
      hasFullAccess: true,
      accessibleModules: fullAccess,
      lockedMessages: {},
      message: 'Lobo Solitario - Acceso completo al software'
    });

  } catch (error) {
    console.error('Error fetching vision level:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener nivel de visión' },
      { status: 500 }
    );
  }
}
