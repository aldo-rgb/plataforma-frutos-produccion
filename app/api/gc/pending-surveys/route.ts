import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener encuestas pendientes del Game Changer
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || user.rol !== 'GAMECHANGER') {
      return NextResponse.json({ pendingSurveys: [] });
    }

    // Obtener todas las asignaciones del GC a visiones (via VisionGameChanger)
    const vgcAssignments = await prisma.visionGameChanger.findMany({
      where: { gameChangerId: user.id },
      select: { 
        visionId: true, 
        level: true,
        Vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    // TAMBIÉN buscar visiones donde el GC tiene SmallGroups como líder
    const sgAssignments = await prisma.smallGroup.findMany({
      where: { 
        leaderId: user.id,
        isActive: true
      },
      select: {
        visionId: true,
        level: true,
        vision: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Combinar ambas fuentes de asignaciones (sin duplicados)
    const allAssignments = new Map<string, { visionId: number; level: string }>();
    
    vgcAssignments.forEach(v => {
      const key = `${v.visionId}-${v.level}`;
      allAssignments.set(key, { visionId: v.visionId, level: v.level });
    });
    
    sgAssignments.forEach(sg => {
      const key = `${sg.visionId}-${sg.level}`;
      allAssignments.set(key, { visionId: sg.visionId, level: sg.level });
    });

    if (allAssignments.size === 0) {
      return NextResponse.json({ pendingSurveys: [] });
    }

    // Obtener productos COMPLETED de las visiones donde está asignado
    const visionIds = [...new Set([...allAssignments.values()].map(a => a.visionId))];
    const levelMap = new Map([...allAssignments.values()].map(a => [`${a.visionId}-${a.level}`, a.level]));

    const completedProducts = await prisma.schoolProduct.findMany({
      where: {
        visionId: { in: visionIds },
        trainingStatus: 'COMPLETED'
      },
      select: {
        id: true,
        name: true,
        levelType: true,
        visionId: true,
        endDate: true,
        Vision: {
          select: { nombre: true }
        }
      }
    });

    // Filtrar productos donde el nivel coincide con alguna asignación del GC
    const relevantProducts = completedProducts.filter(p => {
      const key = `${p.visionId}-${p.levelType}`;
      return allAssignments.has(key);
    });

    if (relevantProducts.length === 0) {
      return NextResponse.json({ pendingSurveys: [] });
    }

    // Obtener encuestas ya completadas por este GC
    const completedSurveys = await prisma.gameChangerSurvey.findMany({
      where: { 
        gameChangerId: user.id,
        productId: { in: relevantProducts.map(p => p.id) }
      },
      select: { productId: true }
    });

    const completedProductIds = new Set(completedSurveys.map(s => s.productId));

    // Para cada producto, verificar si todas las llamadas de seguimiento están agendadas
    const pendingSurveys = await Promise.all(
      relevantProducts
        .filter(p => !completedProductIds.has(p.id))
        .map(async (p) => {
          // Obtener SmallGroups del GC para esta visión y nivel
          const gcSquads = await prisma.smallGroup.findMany({
            where: {
              leaderId: user.id,
              visionId: p.visionId!,
              level: p.levelType as any,
              isActive: true
            },
            include: {
              members: {
                where: { isActive: true },
                select: { userId: true }
              }
            }
          });

          // Obtener todos los participantIds de los squads
          const allParticipantIds = gcSquads.flatMap(sq => sq.members.map(m => m.userId));
          
          // Obtener los participantes que tienen status DROP en vision_enrollments
          const droppedEnrollments = await prisma.vision_enrollments.findMany({
            where: {
              visionId: p.visionId!,
              level: p.levelType,
              userId: { in: allParticipantIds },
              attendanceStatus: 'DROP'
            },
            select: { userId: true }
          });
          const droppedUserIds = new Set(droppedEnrollments.map(e => e.userId));

          // Filtrar participantes activos (excluir DROP)
          const activeParticipantIds = allParticipantIds.filter(id => !droppedUserIds.has(id));
          const totalParticipants = activeParticipantIds.length;
          
          // Contar participantes con llamadas POST_TRAINING agendadas (al menos 1 slot)
          let scheduledParticipants = 0;
          if (activeParticipantIds.length > 0) {
            const scheduledSlots = await prisma.gCCallSlot.findMany({
              where: {
                participantId: { in: activeParticipantIds },
                callType: 'POST_TRAINING', // Solo verificar llamadas post-entrenamiento
                status: { in: ['SCHEDULED', 'CONFIRMED', 'COMPLETED'] }
              },
              select: { participantId: true },
              distinct: ['participantId']
            });
            scheduledParticipants = scheduledSlots.length;
          }

          const allScheduled = totalParticipants > 0 && scheduledParticipants >= totalParticipants;

          return {
            productId: p.id,
            productName: p.name,
            levelType: p.levelType,
            visionName: p.Vision?.nombre || 'Visión',
            endDate: p.endDate,
            canSubmit: allScheduled,
            totalParticipants,
            scheduledParticipants,
            pendingSchedule: totalParticipants - scheduledParticipants
          };
        })
    );

    return NextResponse.json({ 
      pendingSurveys,
      total: pendingSurveys.length
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo encuestas pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener encuestas pendientes' },
      { status: 500 }
    );
  }
}
