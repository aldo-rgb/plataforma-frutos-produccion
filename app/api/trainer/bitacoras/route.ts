// API para que el Trainer vea las Bitácoras de sus participantes asignados
// GET: Listar todos los participantes con su estado de bitácora
// Solo accesible para TRAINER, SCHOOL_ADMIN, ADMIN

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const visionId = searchParams.get('visionId');

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

    // Construir query base
    let whereClause: any = {};
    
    // Si es TRAINER, solo ver los productos donde es trainer
    if (user.rol === 'TRAINER') {
      const trainerProducts = await prisma.schoolProduct.findMany({
        where: {
          trainerId: userId,
          level: 'ADVANCED',
        },
        select: { id: true, visionId: true }
      });
      
      const visionIds = trainerProducts.map(p => p.visionId);
      
      // Obtener enrollments de ADVANCED en esas visiones
      const enrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: { in: visionIds },
          level: 'ADVANCED',
          paymentStatus: { in: ['FULL', 'PARTIAL', 'GIFT'] },
        },
        select: {
          userId: true,
          visionId: true,
          level: true,
          paymentStatus: true,
          Usuario_vision_enrollments_userIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
              telefono: true,
              AdvancedQuestionnaire: true,
            }
          },
          Vision: {
            select: {
              id: true,
              nombre: true,
            }
          }
        }
      });

      // Formatear respuesta
      const participants = enrollments.map(e => ({
        user: {
          id: e.Usuario_vision_enrollments_userIdToUsuario.id,
          nombre: e.Usuario_vision_enrollments_userIdToUsuario.nombre,
          email: e.Usuario_vision_enrollments_userIdToUsuario.email,
          imagen: e.Usuario_vision_enrollments_userIdToUsuario.imagen,
          telefono: e.Usuario_vision_enrollments_userIdToUsuario.telefono,
        },
        vision: e.Vision,
        enrollment: {
          level: e.level,
          paymentStatus: e.paymentStatus,
        },
        questionnaire: e.Usuario_vision_enrollments_userIdToUsuario.AdvancedQuestionnaire,
        hasCompletedQuestionnaire: e.Usuario_vision_enrollments_userIdToUsuario.AdvancedQuestionnaire?.status === 'COMPLETED',
        hasSuicideRisk: e.Usuario_vision_enrollments_userIdToUsuario.AdvancedQuestionnaire?.suicideRiskFlag || false,
      }));

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
      });
    }

    // Para ADMIN/SCHOOL_ADMIN - ver todos
    if (visionId) {
      whereClause.visionId = parseInt(visionId);
    }
    if (user.organizationId && user.rol === 'SCHOOL_ADMIN') {
      // Filtrar por organización
      const visions = await prisma.vision.findMany({
        where: { organizationId: user.organizationId },
        select: { id: true }
      });
      whereClause.visionId = { in: visions.map(v => v.id) };
    }

    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        ...whereClause,
        level: 'ADVANCED',
        paymentStatus: { in: ['FULL', 'PARTIAL', 'GIFT'] },
      },
      select: {
        userId: true,
        visionId: true,
        level: true,
        paymentStatus: true,
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            telefono: true,
            AdvancedQuestionnaire: true,
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true,
          }
        }
      }
    });

    const participants = enrollments.map(e => ({
      user: {
        id: e.Usuario_vision_enrollments_userIdToUsuario.id,
        nombre: e.Usuario_vision_enrollments_userIdToUsuario.nombre,
        email: e.Usuario_vision_enrollments_userIdToUsuario.email,
        imagen: e.Usuario_vision_enrollments_userIdToUsuario.imagen,
        telefono: e.Usuario_vision_enrollments_userIdToUsuario.telefono,
      },
      vision: e.Vision,
      enrollment: {
        level: e.level,
        paymentStatus: e.paymentStatus,
      },
      questionnaire: e.Usuario_vision_enrollments_userIdToUsuario.AdvancedQuestionnaire,
      hasCompletedQuestionnaire: e.Usuario_vision_enrollments_userIdToUsuario.AdvancedQuestionnaire?.status === 'COMPLETED',
      hasSuicideRisk: e.Usuario_vision_enrollments_userIdToUsuario.AdvancedQuestionnaire?.suicideRiskFlag || false,
    }));

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
    });

  } catch (error) {
    console.error('Error getting trainer bitacoras:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
