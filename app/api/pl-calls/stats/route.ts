// API para obtener estadísticas de llamadas PL de un GC o visión
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Obtener estadísticas de llamadas PL
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const gameChangerId = searchParams.get('gameChangerId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId es requerido' }, { status: 400 });
    }

    const visionIdInt = parseInt(visionId);
    const userId = gameChangerId ? parseInt(gameChangerId) : parseInt(session.user.id);

    // Obtener info de la visión con fechas PL
    const vision = await prisma.vision.findUnique({
      where: { id: visionIdInt },
      select: {
        id: true,
        nombre: true,
        plWeekend1StartDate: true,
        plWeekend1EndDate: true,
        plWeekend2StartDate: true,
        plWeekend2EndDate: true,
        plWeekend3StartDate: true,
        plWeekend3EndDate: true
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Determinar la semana actual basada en las fechas PL
    const now = new Date();
    let currentWeek = 0;
    
    if (vision.plWeekend1EndDate && vision.plWeekend2StartDate) {
      const week1End = new Date(vision.plWeekend1EndDate);
      const week2Start = new Date(vision.plWeekend2StartDate);
      if (now > week1End && now < week2Start) {
        currentWeek = 1;
      }
    }
    if (vision.plWeekend2EndDate && vision.plWeekend3StartDate) {
      const week2End = new Date(vision.plWeekend2EndDate);
      const week3Start = new Date(vision.plWeekend3StartDate);
      if (now > week2End && now < week3Start) {
        currentWeek = 2;
      }
    }
    if (vision.plWeekend3EndDate) {
      const week3End = new Date(vision.plWeekend3EndDate);
      if (now > week3End) {
        currentWeek = 3;
      }
    }

    // Obtener el squad del GC (si aplica)
    const squad = await prisma.smallGroup.findFirst({
      where: {
        visionId: visionIdInt,
        leaderId: userId,
        level: 'PL',
        isActive: true
      },
      select: {
        id: true,
        name: true,
        SmallGroupMember: {
          where: { isActive: true },
          select: { userId: true }
        }
      }
    });

    // Estadísticas de llamadas de átomo (si tiene squad)
    let atomStats = null;
    if (squad) {
      const atomCalls = await prisma.pLWeeklyCall.findMany({
        where: {
          squadId: squad.id,
          callType: 'ATOM'
        },
        include: {
          attendances: true
        }
      });

      const completedAtomCalls = atomCalls.filter(c => c.status === 'COMPLETED');
      const totalAttendances = completedAtomCalls.flatMap(c => c.attendances);
      const attendedCount = totalAttendances.filter(a => a.attended === true).length;

      atomStats = {
        squadId: squad.id,
        squadName: squad.name,
        memberCount: squad.SmallGroupMember.length,
        totalCalls: atomCalls.length,
        completedCalls: completedAtomCalls.length,
        scheduledCalls: atomCalls.filter(c => c.status === 'SCHEDULED').length,
        cancelledCalls: atomCalls.filter(c => c.status === 'CANCELLED').length,
        overallAttendanceRate: totalAttendances.length > 0 
          ? Math.round((attendedCount / totalAttendances.length) * 100) 
          : 0,
        callsByWeek: [1, 2, 3].map(week => {
          const weekCalls = atomCalls.filter(c => c.weekNumber === week);
          return {
            week,
            hasCall: weekCalls.length > 0,
            status: weekCalls[0]?.status || null,
            scheduledDate: weekCalls[0]?.scheduledDate || null,
            scheduledTime: weekCalls[0]?.scheduledTime || null
          };
        })
      };
    }

    // Estadísticas de llamadas de grupo (toda la visión)
    const groupCalls = await prisma.pLWeeklyCall.findMany({
      where: {
        visionId: visionIdInt,
        callType: 'GROUP'
      },
      include: {
        attendances: true
      }
    });

    const completedGroupCalls = groupCalls.filter(c => c.status === 'COMPLETED');
    const groupAttendances = completedGroupCalls.flatMap(c => c.attendances);
    const groupAttendedCount = groupAttendances.filter(a => a.attended === true).length;

    // Contar participantes PL totales de la visión
    const totalPLParticipants = await prisma.vision_enrollments.count({
      where: {
        visionId: visionIdInt,
        level: 'PL',
        enrollmentStatus: { in: ['ENROLLED', 'COMPLETED'] },
        droppedAt: null
      }
    });

    const groupStats = {
      totalCalls: groupCalls.length,
      completedCalls: completedGroupCalls.length,
      scheduledCalls: groupCalls.filter(c => c.status === 'SCHEDULED').length,
      cancelledCalls: groupCalls.filter(c => c.status === 'CANCELLED').length,
      totalPLParticipants,
      overallAttendanceRate: groupAttendances.length > 0 
        ? Math.round((groupAttendedCount / groupAttendances.length) * 100) 
        : 0,
      callsByWeek: [1, 2, 3].map(week => {
        const weekCalls = groupCalls.filter(c => c.weekNumber === week);
        return {
          week,
          hasCall: weekCalls.length > 0,
          status: weekCalls[0]?.status || null,
          scheduledDate: weekCalls[0]?.scheduledDate || null,
          scheduledTime: weekCalls[0]?.scheduledTime || null
        };
      })
    };

    // Participantes en riesgo (del squad del GC)
    let atRiskParticipants: any[] = [];
    if (squad) {
      const riskAttendances = await prisma.pLCallAttendance.findMany({
        where: {
          call: {
            squadId: squad.id
          },
          isAtRisk: true
        },
        include: {
          participant: {
            select: { id: true, nombre: true, email: true }
          },
          call: {
            select: { weekNumber: true, callType: true }
          }
        },
        distinct: ['participantId']
      });

      atRiskParticipants = riskAttendances.map(a => ({
        ...a.participant,
        lastRiskWeek: a.call.weekNumber,
        riskNotes: a.riskNotes
      }));
    }

    return NextResponse.json({
      vision: {
        id: vision.id,
        nombre: vision.nombre
      },
      currentWeek,
      atomStats,
      groupStats,
      atRiskParticipants
    });
  } catch (error) {
    logger.error('Error fetching PL call stats:', error);
    return NextResponse.json({ error: 'Error al obtener estadísticas' }, { status: 500 });
  }
}
