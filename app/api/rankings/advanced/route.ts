import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

type RankingType = 'GLOBAL' | 'SCHOOL' | 'VISION' | 'MENTOR' | 'SCHOOL_WAR';
type Timeframe = 'WEEKLY' | 'MONTHLY' | 'CYCLE' | 'ALL_TIME';

/**
 * GET /api/rankings/advanced
 * Query params:
 * - type: GLOBAL | SCHOOL | VISION | MENTOR | SCHOOL_WAR
 * - entityId: ID de la organización/visión (opcional para GLOBAL)
 * - timeframe: WEEKLY | MONTHLY | CYCLE | ALL_TIME
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') || 'GLOBAL') as RankingType;
    const entityId = searchParams.get('entityId') ? parseInt(searchParams.get('entityId')!) : null;
    const timeframe = (searchParams.get('timeframe') || 'ALL_TIME') as Timeframe;

    // Calcular rango de fechas según timeframe
    const now = new Date();
    let startDate: Date | undefined;
    
    switch (timeframe) {
      case 'WEEKLY':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'MONTHLY':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case 'CYCLE':
        // Obtener fecha de inicio del ciclo actual (desde Vision o ProgramEnrollment)
        startDate = new Date(now.getFullYear(), 0, 1); // Por ahora: inicio del año
        break;
      case 'ALL_TIME':
      default:
        startDate = undefined;
        break;
    }

    let ranking;

    switch (type) {
      case 'GLOBAL':
        ranking = await getGlobalRanking(startDate);
        break;
      
      case 'SCHOOL':
        if (!entityId) {
          return NextResponse.json({ error: 'entityId requerido para ranking por escuela' }, { status: 400 });
        }
        ranking = await getSchoolRanking(entityId, startDate);
        break;
      
      case 'VISION':
        if (!entityId) {
          return NextResponse.json({ error: 'entityId requerido para ranking por visión' }, { status: 400 });
        }
        ranking = await getVisionRanking(entityId, startDate);
        break;
      
      case 'MENTOR':
        ranking = await getMentorRanking(startDate);
        break;
      
      case 'SCHOOL_WAR':
        ranking = await getSchoolWarRanking(startDate);
        break;
      
      default:
        return NextResponse.json({ error: 'Tipo de ranking inválido' }, { status: 400 });
    }

    return NextResponse.json({
      type,
      timeframe,
      entityId,
      ranking,
      generatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ ERROR en GET /api/rankings/advanced:', error);
    logger.error('Error en GET /api/rankings/advanced:', error);
    return NextResponse.json(
      { error: 'Error al obtener ranking', details: error instanceof Error ? error.message : 'Unknown' },
      { status: 500 }
    );
  }
}

/**
 * Ranking Global: Todos los usuarios activos (PARTICIPANTES y GAMECHANGERS)
 */
async function getGlobalRanking(startDate?: Date) {
  try {
    const users = await prisma.usuario.findMany({
      where: {
        isActive: true,
        rol: { in: ['PARTICIPANTE', 'GAMECHANGER'] },
      },
      select: {
        id: true,
        nombre: true,
        imagen: true,
        profileImage: true,
        puntosCuanticos: true,
        experienciaXP: true,
        nivelActual: true,
        rangoActual: true,
        completionStreak: true,
        badges: true,
        organizationId: true,
        Organization: {
          select: {
            name: true,
            logoUrl: true
          }
        },
      },
      orderBy: [
        { puntosCuanticos: 'desc' },
        { experienciaXP: 'desc' }
      ],
      take: 100
    });

    return users.map((user, index) => ({
      position: index + 1,
      userId: user.id,
      nombre: user.nombre,
      avatar: user.profileImage || user.imagen || '/default-avatar.svg',
      tier: getTierFromXP(user.experienciaXP),
      rangoActual: user.rangoActual,
      quantumPoints: user.puntosCuanticos,
      xp: user.experienciaXP,
      nivel: user.nivelActual,
      hqEvidenceCount: 0,
      attendanceRate: 100,
      attendanceStatus: 'PERFECT' as const,
      streak: user.completionStreak,
      badges: user.badges || [],
      condecoraciones: [],
      organization: user.Organization?.name,
      organizationLogo: user.Organization?.logoUrl,
      isOnFire: user.completionStreak >= 7
    }));
  } catch (error) {
    console.error('Error in getGlobalRanking:', error);
    throw error;
  }
}

/**
 * Ranking por Escuela: Solo usuarios de una organización específica
 */
async function getSchoolRanking(organizationId: number, startDate?: Date) {
  const users = await prisma.usuario.findMany({
    where: {
      organizationId,
      isActive: true,
      rol: 'PARTICIPANTE',
      ...(startDate && {
        createdAt: { gte: startDate }
      })
    },
    select: {
      id: true,
      nombre: true,
      imagen: true,
      profileImage: true,
      puntosCuanticos: true,
      experienciaXP: true,
      nivelActual: true,
      rangoActual: true,
      completionStreak: true,
      badges: true,
      EvidenciaAccion: {
        where: {
          highQuality: true,
          estado: 'APROBADA',
          ...(startDate && {
            createdAt: { gte: startDate }
          })
        },
        select: { id: true }
      },
      ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
        where: { status: 'ACTIVE' },
        select: {
          missedCallsCount: true,
          maxMissedAllowed: true,
          CallBooking: {
            where: {
              status: 'COMPLETED',
              ...(startDate && {
                completedAt: { gte: startDate }
              })
            },
            select: { id: true }
          }
        }
      }
    },
    orderBy: [
      { puntosCuanticos: 'desc' },
      { experienciaXP: 'desc' }
    ]
  });

  return users.map((user, index) => {
    const enrollment = user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
    const attendedCalls = enrollment?.CallBooking?.length || 0;
    const totalCalls = (enrollment?.maxMissedAllowed || 3) + attendedCalls + (enrollment?.missedCallsCount || 0);
    const attendanceRate = totalCalls > 0 ? (attendedCalls / totalCalls) * 100 : 0;

    return {
      position: index + 1,
      userId: user.id,
      nombre: user.nombre,
      avatar: user.profileImage || user.imagen || '/default-avatar.svg',
      tier: getTierFromXP(user.experienciaXP),
      rangoActual: user.rangoActual,
      quantumPoints: user.puntosCuanticos,
      xp: user.experienciaXP,
      nivel: user.nivelActual,
      hqEvidenceCount: user.EvidenciaAccion.length,
      attendanceRate: Math.round(attendanceRate),
      attendanceStatus: getAttendanceStatus(attendanceRate),
      streak: user.completionStreak,
      badges: user.badges || [],
      condecoraciones: [],
      isOnFire: user.completionStreak >= 7
    };
  });
}

/**
 * Ranking por Visión: Solo participantes ACTIVOS de una visión específica
 */
async function getVisionRanking(visionId: number, startDate?: Date) {
  const participants = await prisma.visionParticipante.findMany({
    where: { visionId },
    select: {
      Usuario_VisionParticipante_participanteIdToUsuario: {
        select: {
          id: true,
          nombre: true,
          imagen: true,
          profileImage: true,
          puntosCuanticos: true,
          experienciaXP: true,
          nivelActual: true,
          rangoActual: true,
          completionStreak: true,
          badges: true,
          isActive: true,
          rol: true,
          EvidenciaAccion: {
            where: {
              highQuality: true,
              estado: 'APROBADA',
              ...(startDate && {
                createdAt: { gte: startDate }
              })
            },
            select: { id: true }
          },
          ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
            where: { status: 'ACTIVE' },
            select: {
              missedCallsCount: true,
              maxMissedAllowed: true,
              CallBooking: {
                where: {
                  status: 'COMPLETED',
                  ...(startDate && {
                    completedAt: { gte: startDate }
                  })
                },
                select: { id: true }
              }
            }
          }
        }
      }
    }
  });

  // Filtrar solo usuarios activos con rol PARTICIPANTE o GAMECHANGER
  const allowedRoles = ['PARTICIPANTE', 'GAMECHANGER'];
  const users = participants
    .map(p => p.Usuario_VisionParticipante_participanteIdToUsuario)
    .filter(user => user.isActive === true && allowedRoles.includes(user.rol))
    .sort((a, b) => {
      if (b.puntosCuanticos !== a.puntosCuanticos) {
        return b.puntosCuanticos - a.puntosCuanticos;
      }
      return b.experienciaXP - a.experienciaXP;
    });

  return users.map((user, index) => {
    const enrollment = user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
    const attendedCalls = enrollment?.CallBooking?.length || 0;
    const totalCalls = (enrollment?.maxMissedAllowed || 3) + attendedCalls + (enrollment?.missedCallsCount || 0);
    const attendanceRate = totalCalls > 0 ? (attendedCalls / totalCalls) * 100 : 0;

    return {
      position: index + 1,
      userId: user.id,
      nombre: user.nombre,
      avatar: user.profileImage || user.imagen || '/default-avatar.svg',
      tier: getTierFromXP(user.experienciaXP),
      rangoActual: user.rangoActual,
      quantumPoints: user.puntosCuanticos,
      xp: user.experienciaXP,
      nivel: user.nivelActual,
      hqEvidenceCount: user.EvidenciaAccion.length,
      attendanceRate: Math.round(attendanceRate),
      attendanceStatus: getAttendanceStatus(attendanceRate),
      streak: user.completionStreak,
      badges: user.badges || [],
      isOnFire: user.completionStreak >= 7
    };
  });
}

/**
 * Guerra de Escuelas: Comparativa institucional por promedio
 */
async function getSchoolWarRanking(startDate?: Date) {
  const organizations = await prisma.organization.findMany({
    where: {
      status: 'ACTIVE'
    },
    select: {
      id: true,
      name: true,
      logoUrl: true,
      brandColor: true,
      Users: {
        where: {
          isActive: true,
          rol: 'PARTICIPANTE'
        },
        select: {
          puntosCuanticos: true,
          EvidenciaAccion: {
            where: {
              highQuality: true,
              estado: 'APROBADA',
              ...(startDate && {
                createdAt: { gte: startDate }
              })
            },
            select: { id: true }
          }
        }
      }
    }
  });

  const schoolStats = organizations.map(org => {
    const activeStudents = org.Users.length;
    const totalPoints = org.Users.reduce((sum: number, u: any) => sum + u.puntosCuanticos, 0);
    const totalHQEvidences = org.Users.reduce((sum: number, u: any) => sum + u.EvidenciaAccion.length, 0);
    const avgPoints = activeStudents > 0 ? totalPoints / activeStudents : 0;
    const retentionRate = 100; // TODO: Calcular tasa de retención real

    return {
      organizationId: org.id,
      name: org.name,
      logo: org.logoUrl,
      brandColor: org.brandColor,
      totalStudents: activeStudents,
      avgPointsPerStudent: Math.round(avgPoints),
      totalPoints,
      totalHQEvidences,
      retentionRate
    };
  });

  // Ordenar por promedio de puntos (métrica justa)
  schoolStats.sort((a, b) => b.avgPointsPerStudent - a.avgPointsPerStudent);

  return schoolStats.map((school, index) => ({
    position: index + 1,
    ...school
  }));
}

/**
 * Ranking de Mentores: Por desempeño de sus mentorados
 */
async function getMentorRanking(startDate?: Date) {
  const mentors = await prisma.usuario.findMany({
    where: {
      rol: 'MENTOR',
      isActive: true
    },
    select: {
      id: true,
      nombre: true,
      imagen: true,
      profileImage: true,
      badges: true,
      accumulatedMissedCalls: true,
      PerfilMentor: {
        select: {
          mentoradosActivos: true,
          mentoradosTotales: true,
          calificacionPromedio: true,
          puntosTotales: true
        }
      },
      ProgramEnrollment_ProgramEnrollment_mentorIdToUsuario: {
        where: { status: 'ACTIVE' },
        select: {
          Usuario_ProgramEnrollment_userIdToUsuario: {
            select: {
              puntosCuanticos: true,
              experienciaXP: true,
              EvidenciaAccion: {
                where: {
                  highQuality: true,
                  estado: 'APROBADA',
                  ...(startDate && {
                    createdAt: { gte: startDate }
                  })
                },
                select: { id: true }
              }
            }
          },
          CallBooking: {
            where: {
              status: 'COMPLETED',
              ...(startDate && {
                completedAt: { gte: startDate }
              })
            },
            select: { id: true }
          }
        }
      }
    }
  });

  const mentorStats = mentors.map(mentor => {
    const enrollments = mentor.ProgramEnrollment_ProgramEnrollment_mentorIdToUsuario;
    const totalMentorados = enrollments.length;
    const avgPointsPerStudent = totalMentorados > 0
      ? enrollments.reduce((sum, e) => sum + e.Usuario_ProgramEnrollment_userIdToUsuario.puntosCuanticos, 0) / totalMentorados
      : 0;
    
    const totalHQEvidences = enrollments.reduce((sum, e) => 
      sum + e.Usuario_ProgramEnrollment_userIdToUsuario.EvidenciaAccion.length, 0
    );

    const totalCompletedCalls = enrollments.reduce((sum, e) => sum + e.CallBooking.length, 0);
    const perfilMentor = mentor.PerfilMentor;
    const rating = perfilMentor?.calificacionPromedio ?? 0;
    const completionRate = rating > 0 ? rating * 20 : 0; // Convertir escala 5 a 100

    return {
      mentorId: mentor.id,
      nombre: mentor.nombre,
      avatar: mentor.profileImage || mentor.imagen || '/default-avatar.svg',
      badges: mentor.badges || [],
      totalMentorados,
      avgPointsPerStudent: Math.round(avgPointsPerStudent),
      totalHQEvidences,
      completedCalls: totalCompletedCalls,
      completionRate: Math.round(completionRate),
      rating: Number(rating) || 0,
      totalPoints: perfilMentor?.puntosTotales || 0,
      accumulatedMissedCalls: mentor.accumulatedMissedCalls || 0
    };
  });

  // Ordenar por % de cumplimiento promedio
  mentorStats.sort((a, b) => b.completionRate - a.completionRate);

  return mentorStats.map((mentor, index) => ({
    position: index + 1,
    ...mentor
  }));
}

// Helpers
function getTierFromXP(xp: number): string {
  if (xp >= 10000) return 'NEON';
  if (xp >= 5000) return 'GOLD';
  if (xp >= 2000) return 'BLUE';
  return 'GRAY';
}

function getAttendanceStatus(rate: number): 'PERFECT' | 'WARNING' | 'RISK' {
  if (rate >= 90) return 'PERFECT';
  if (rate >= 70) return 'WARNING';
  return 'RISK';
}
