/**
 * API: Verificar estado de Legacy Capture y Post-Entreno para recompensa GC
 * 
 * GET: Obtener si el GC tiene visiones que terminan hoy y su progreso
 * POST: Reclamar los 1000 puntos cuando ambas tareas estén completas
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { VisionLevel } from '@prisma/client';

export const dynamic = 'force-dynamic';

// GET: Verificar si hay visiones que terminan hoy y el estado de completado
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, nombre: true, rol: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que sea GC
    if (usuario.rol !== 'GAMECHANGER' && usuario.rol !== 'ADMINISTRADOR' && usuario.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ pendingRewards: [] });
    }

    // Obtener fecha de hoy (inicio y fin del día)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    // Buscar visiones donde el GC está asignado
    const visionesGC = await prisma.visionGameChanger.findMany({
      where: {
        gameChangerId: usuario.id
      },
      include: {
        Vision: {
          include: {
            Organization: {
              select: { name: true }
            }
          }
        }
      }
    });

    const pendingRewards: any[] = [];

    for (const vgc of visionesGC) {
      const vision = vgc.Vision;
      const level = vgc.level;

      // Determinar la fecha de fin según el nivel
      let fechaFin: Date | null = null;
      if (level === VisionLevel.BASIC) {
        fechaFin = vision.endDate ? new Date(vision.endDate) : null;
      } else if (level === VisionLevel.ADVANCED) {
        fechaFin = vision.advancedEndDate ? new Date(vision.advancedEndDate) : null;
      } else if (level === VisionLevel.PL) {
        // Para PL, usar la fecha del último weekend
        fechaFin = vision.plWeekend3EndDate 
          ? new Date(vision.plWeekend3EndDate) 
          : vision.plWeekend2EndDate 
            ? new Date(vision.plWeekend2EndDate)
            : vision.plWeekend1EndDate
              ? new Date(vision.plWeekend1EndDate)
              : null;
      }

      if (!fechaFin) continue;

      fechaFin.setHours(23, 59, 59, 999);

      // Solo mostrar si termina hoy o ya terminó (hasta 7 días después)
      const diasDespues = Math.floor((hoy.getTime() - fechaFin.getTime()) / (1000 * 60 * 60 * 24));
      if (diasDespues < -1 || diasDespues > 7) continue; // -1 = termina mañana, 7 = hace una semana

      // Verificar si ya reclamó los puntos para esta visión
      const yaReclamado = await prisma.rewardHistory.findFirst({
        where: {
          usuarioId: usuario.id,
          sourceType: 'LEGACY_REWARD',
          sourceId: vision.id,
          type: 'PC'
        }
      });

      if (yaReclamado) continue;

      // Contar participantes del squad del GC en esta visión
      const squads = await prisma.smallGroup.findMany({
        where: {
          visionId: vision.id,
          leaderId: usuario.id,
          level: level,
          isActive: true
        },
        include: {
          members: {
            where: { isActive: true },
            select: { userId: true }
          }
        }
      });

      const participantIds = squads.flatMap(s => s.members.map(m => m.userId));
      const totalParticipantes = participantIds.length;

      if (totalParticipantes === 0) continue;

      // Verificar cuántos tienen legacy capturado
      const legacyCount = await prisma.legacyCaptureSession.count({
        where: {
          visionId: vision.id,
          gcId: usuario.id,
          participantId: { in: participantIds },
          status: { in: ['IN_PROGRESS', 'COMPLETED'] }
        }
      });

      // Verificar cuántos tienen llamada post-entreno agendada usando GCCallSlot
      const postEntrenoCount = await prisma.gCCallSlot.count({
        where: {
          participantId: { in: participantIds },
          callType: 'POST_TRAINING',
          status: { in: ['SCHEDULED', 'COMPLETED'] },
          availability: {
            gameChangerId: usuario.id
          }
        }
      });

      // Calcular progreso
      const legacyProgress = totalParticipantes > 0 ? (legacyCount / totalParticipantes) * 100 : 0;
      const postEntrenoProgress = totalParticipantes > 0 ? (postEntrenoCount / totalParticipantes) * 100 : 0;

      // Determinar si puede reclamar (ambos al 100%)
      const canClaim = legacyCount >= totalParticipantes && postEntrenoCount >= totalParticipantes;

      pendingRewards.push({
        visionId: vision.id,
        visionName: vision.nombre,
        organizationName: vision.Organization?.name || '',
        level: level,
        endDate: fechaFin.toISOString(),
        diasRestantes: diasDespues <= 0 ? Math.abs(diasDespues) : 0,
        terminoHoy: diasDespues === 0,
        yaTermino: diasDespues > 0,
        totalParticipantes,
        legacyCount,
        postEntrenoCount,
        legacyProgress: Math.round(legacyProgress),
        postEntrenoProgress: Math.round(postEntrenoProgress),
        canClaim,
        rewardAmount: 1000 // PC a otorgar
      });
    }

    return NextResponse.json({
      success: true,
      pendingRewards
    });

  } catch (error) {
    console.error('Error en GET /api/gc/legacy-reward-status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST: Reclamar los 1000 puntos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { visionId } = body;

    if (!visionId) {
      return NextResponse.json({ error: 'VisionId requerido' }, { status: 400 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, puntosCuanticos: true, experienciaXP: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que no haya reclamado ya
    const yaReclamado = await prisma.rewardHistory.findFirst({
      where: {
        usuarioId: usuario.id,
        sourceType: 'LEGACY_REWARD',
        sourceId: visionId,
        type: 'PC'
      }
    });

    if (yaReclamado) {
      return NextResponse.json({ 
        error: 'Ya reclamaste los puntos para esta visión',
        alreadyClaimed: true 
      }, { status: 400 });
    }

    // Verificar que realmente es GC de esta visión
    const vgc = await prisma.visionGameChanger.findFirst({
      where: {
        gameChangerId: usuario.id,
        visionId: visionId
      }
    });

    if (!vgc) {
      return NextResponse.json({ error: 'No eres GC de esta visión' }, { status: 403 });
    }

    // Obtener participantes del squad
    const squads = await prisma.smallGroup.findMany({
      where: {
        visionId: visionId,
        leaderId: usuario.id,
        level: vgc.level,
        isActive: true
      },
      include: {
        members: {
          where: { isActive: true },
          select: { userId: true }
        }
      }
    });

    const participantIds = squads.flatMap(s => s.members.map(m => m.userId));
    const totalParticipantes = participantIds.length;

    if (totalParticipantes === 0) {
      return NextResponse.json({ error: 'No tienes participantes en tu squad' }, { status: 400 });
    }

    // Verificar legacy
    const legacyCount = await prisma.legacyCaptureSession.count({
      where: {
        visionId: visionId,
        gcId: usuario.id,
        participantId: { in: participantIds },
        status: { in: ['IN_PROGRESS', 'COMPLETED'] }
      }
    });

    // Verificar post-entreno usando GCCallSlot
    const postEntrenoCount = await prisma.gCCallSlot.count({
      where: {
        participantId: { in: participantIds },
        callType: 'POST_TRAINING',
        status: { in: ['SCHEDULED', 'COMPLETED'] },
        availability: {
          gameChangerId: usuario.id
        }
      }
    });

    if (legacyCount < totalParticipantes || postEntrenoCount < totalParticipantes) {
      return NextResponse.json({ 
        error: 'Aún no has completado todas las tareas',
        legacyCount,
        postEntrenoCount,
        totalParticipantes
      }, { status: 400 });
    }

    // ¡Otorgar los 1000 puntos!
    const REWARD_AMOUNT = 1000;

    await prisma.$transaction([
      // Actualizar puntos del usuario
      prisma.usuario.update({
        where: { id: usuario.id },
        data: {
          puntosCuanticos: { increment: REWARD_AMOUNT },
          experienciaXP: { increment: REWARD_AMOUNT }
        }
      }),
      // Registrar en historial
      prisma.rewardHistory.create({
        data: {
          usuarioId: usuario.id,
          type: 'PC',
          amount: REWARD_AMOUNT,
          reason: 'Recompensa por completar Legacy Capture y Post-Entreno',
          sourceType: 'LEGACY_REWARD',
          sourceId: visionId
        }
      }),
      prisma.rewardHistory.create({
        data: {
          usuarioId: usuario.id,
          type: 'XP',
          amount: REWARD_AMOUNT,
          reason: 'XP por completar Legacy Capture y Post-Entreno',
          sourceType: 'LEGACY_REWARD',
          sourceId: visionId
        }
      })
    ]);

    return NextResponse.json({
      success: true,
      message: '¡Felicidades! Has recibido 1,000 PC y 1,000 XP',
      rewardAmount: REWARD_AMOUNT
    });

  } catch (error) {
    console.error('Error en POST /api/gc/legacy-reward-status:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
