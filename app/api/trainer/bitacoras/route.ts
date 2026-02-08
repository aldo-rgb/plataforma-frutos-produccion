// API para que el Trainer vea las Bitácoras de sus participantes asignados
// GET: Listar todos los participantes con su estado de bitácora
// Solo accesible para TRAINER, SCHOOL_ADMIN, ADMIN

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const visionIdParam = searchParams.get('visionId');

    // Verificar rol del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        rol: true, 
        organizationId: true,
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const allowedRoles = ['TRAINER', 'SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para ver esta información' }, { status: 403 });
    }

    // Obtener visiones donde este usuario es trainer de productos ADVANCED o PL
    let visionIdsToQuery: number[] = [];
    let levelToQuery: 'ADVANCED' | 'PL' = 'ADVANCED';

    if (user.rol === 'TRAINER') {
      // 1. Buscar productos donde es trainer directo y el levelType es ADVANCED
      const trainerProducts = await prisma.schoolProduct.findMany({
        where: {
          trainerId: userId,
          levelType: { in: ['ADVANCED', 'PL'] },
        },
        select: { id: true, visionId: true, levelType: true }
      });
      
      // 2. Buscar visiones donde está asignado como VisionStaff (ADVANCED_TRAINER o PL_TRAINER)
      const staffAssignments = await prisma.visionStaff.findMany({
        where: {
          userId: userId,
          role: { in: ['ADVANCED_TRAINER', 'PL_TRAINER'] }
        },
        select: { visionId: true, role: true, level: true }
      });
      
      // Combinar visiones de productos directos y staff
      const directVisionIds = trainerProducts.map(p => p.visionId).filter((id): id is number => id !== null);
      const staffVisionIds = staffAssignments.map(s => s.visionId);
      visionIdsToQuery = [...new Set([...directVisionIds, ...staffVisionIds])];
      
      // Determinar qué nivel buscar según las asignaciones
      // Si tiene asignaciones PL, buscar PL; si tiene ADVANCED, buscar ADVANCED
      const hasPLAssignment = staffAssignments.some(s => s.role === 'PL_TRAINER' || s.level === 'PL') ||
                              trainerProducts.some(p => p.levelType === 'PL');
      const hasAdvancedAssignment = staffAssignments.some(s => s.role === 'ADVANCED_TRAINER' || s.level === 'ADVANCED') ||
                                    trainerProducts.some(p => p.levelType === 'ADVANCED');
      
      // Si solo tiene PL, buscar participantes de PL
      if (hasPLAssignment && !hasAdvancedAssignment) {
        levelToQuery = 'PL';
      }
      // Si tiene ambos o solo ADVANCED, mantener ADVANCED (default)
    } else if (user.rol === 'SCHOOL_ADMIN' && user.organizationId) {
      // Para SCHOOL_ADMIN, obtener todas las visiones de su organización
      const visions = await prisma.vision.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true }
      });
      visionIdsToQuery = visions.map(v => v.id);
    } else {
      // Para ADMIN, si se especifica visionId, usar ese, sino obtener todas
      if (visionIdParam) {
        visionIdsToQuery = [parseInt(visionIdParam)];
      } else {
        // Obtener todas las visiones activas con productos ADVANCED
        const products = await prisma.schoolProduct.findMany({
          where: { levelType: 'ADVANCED' },
          select: { visionId: true }
        });
        visionIdsToQuery = [...new Set(products.map(p => p.visionId).filter((id): id is number => id !== null))];
      }
    }

    if (visionIdsToQuery.length === 0) {
      return NextResponse.json({
        participants: [],
        stats: {
          total: 0,
          completed: 0,
          pending: 0,
          inProgress: 0,
          withSuicideRisk: 0,
        },
      });
    }

    // Obtener enrollments del nivel correspondiente en esas visiones
    // Para PL, también filtrar por asistencia (attendanceStatus = 'ATTENDED')
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: { in: visionIdsToQuery },
        level: levelToQuery,
        paymentStatus: { in: ['FULL', 'PARTIAL', 'GIFT', 'PAID'] },
        // Para PL, solo mostrar los que asistieron
        ...(levelToQuery === 'PL' ? { attendanceStatus: 'ATTENDED' } : {}),
      },
      select: {
        userId: true,
        visionId: true,
        level: true,
        paymentStatus: true,
      }
    });

    // Obtener los usuarios
    const userIds = [...new Set(enrollments.map(e => e.userId))];
    
    const users = await prisma.usuario.findMany({
      where: { id: { in: userIds } },
      select: {
        id: true,
        nombre: true,
        email: true,
        imagen: true,
        telefono: true,
      }
    });

    // Obtener los cuestionarios de esos usuarios
    const questionnaires = await prisma.advancedQuestionnaire.findMany({
      where: { userId: { in: userIds } },
    });

    // Obtener las visiones
    const visions = await prisma.vision.findMany({
      where: { id: { in: visionIdsToQuery } },
      select: {
        id: true,
        nombre: true,
      }
    });

    const visionsMap = new Map(visions.map(v => [v.id, v]));
    const usersMap = new Map(users.map(u => [u.id, u]));
    const questionnairesMap = new Map(questionnaires.map(q => [q.userId, q]));

    // Formatear respuesta
    const participants = enrollments.map(e => {
      const userInfo = usersMap.get(e.userId);
      const visionInfo = visionsMap.get(e.visionId);
      const questionnaire = questionnairesMap.get(e.userId);
      
      return {
        user: {
          id: userInfo?.id || e.userId,
          nombre: userInfo?.nombre || 'Usuario',
          email: userInfo?.email || '',
          imagen: userInfo?.imagen || null,
          telefono: userInfo?.telefono || null,
        },
        vision: visionInfo || { id: e.visionId, nombre: 'Visión' },
        enrollment: {
          level: e.level,
          paymentStatus: e.paymentStatus,
        },
        questionnaire: questionnaire || null,
        hasCompletedQuestionnaire: questionnaire?.status === 'COMPLETED',
        hasSuicideRisk: questionnaire?.suicideRiskFlag || false,
      };
    });

    // Estadísticas
    const stats = {
      total: participants.length,
      completed: participants.filter(p => p.hasCompletedQuestionnaire).length,
      pending: participants.filter(p => !p.hasCompletedQuestionnaire).length,
      inProgress: participants.filter(p => p.questionnaire?.status === 'IN_PROGRESS').length,
      withSuicideRisk: participants.filter(p => p.hasSuicideRisk).length,
    };

    return NextResponse.json({
      participants,
      stats,
      level: levelToQuery, // Indicar qué nivel se está mostrando
    });

  } catch (error) {
    logger.error('Error getting trainer bitacoras:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
