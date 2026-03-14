import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamechanger/tribe-stats
 * Obtiene estadísticas GLOBALES de enrollados y graduados del Game Changer
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Obtener datos del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { referralCode: true }
    });

    // 1. Buscar la visión activa donde el usuario es Game Changer (para mostrar nombre)
    let visionId: number | null = null;
    let visionName: string | null = null;
    let tribeMission: string | null = null;

    const visionGC = await prisma.visionGameChanger.findFirst({
      where: { 
        gameChangerId: userId,
        Vision: { isActive: true }
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            tribeMission: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (visionGC?.Vision) {
      visionId = visionGC.Vision.id;
      visionName = visionGC.Vision.nombre;
      tribeMission = visionGC.Vision.tribeMission;
    }

    // 2. Si no tiene visión como GC, buscar como participante
    if (!visionId) {
      const visionParticipante = await prisma.visionParticipante.findFirst({
        where: { 
          participanteId: userId,
          Vision: { isActive: true }
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              tribeMission: true
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      if (visionParticipante?.Vision) {
        visionId = visionParticipante.Vision.id;
        visionName = visionParticipante.Vision.nombre;
        tribeMission = visionParticipante.Vision.tribeMission;
      }
    }

    // 3. Si aún no tiene visión, buscar su enrollment más reciente
    if (!visionId) {
      const latestEnrollment = await prisma.vision_enrollments.findFirst({
        where: { 
          userId: userId,
          Vision: { isActive: true }
        },
        include: {
          Vision: {
            select: {
              id: true,
              nombre: true,
              tribeMission: true
            }
          }
        },
        orderBy: { enrolledAt: 'desc' }
      });

      if (latestEnrollment?.Vision) {
        visionId = latestEnrollment.Vision.id;
        visionName = latestEnrollment.Vision.nombre;
        tribeMission = latestEnrollment.Vision.tribeMission;
      }
    }

    if (!visionId || !visionName) {
      return NextResponse.json({ error: 'No se encontró visión activa' }, { status: 404 });
    }

    // =====================================================
    // CONTAR REFERIDOS QUE HAN PAGADO (ENROLLADOS REALES)
    // =====================================================

    // Obtener IDs de usuarios invitados por este usuario
    const invitedByUserId = await prisma.usuario.findMany({
      where: { invitedBy: userId },
      select: { id: true }
    });

    // Obtener IDs de usuarios invitados por referralCode (evitando duplicados)
    let invitedByReferral: { id: number }[] = [];
    if (user?.referralCode) {
      invitedByReferral = await prisma.usuario.findMany({
        where: {
          invitedByText: user.referralCode,
          invitedBy: { not: userId }
        },
        select: { id: true }
      });
    }

    // Combinar todos los IDs de invitados
    const allInvitedIds = [
      ...invitedByUserId.map(u => u.id),
      ...invitedByReferral.map(u => u.id)
    ];

    // Contar cuántos de estos invitados tienen un ticket PAGADO (Básico o superior)
    let enrolledCount = 0;
    if (allInvitedIds.length > 0) {
      enrolledCount = await prisma.ticket.count({
        where: {
          ownerId: { in: allInvitedIds },
          paymentStatus: { in: ['PAID', 'PARTIAL', 'GIFT'] }
        }
      });
    }

    // Contar graduados de entre los invitados
    let graduatedCount = 0;
    if (allInvitedIds.length > 0) {
      graduatedCount = await prisma.usuario.count({
        where: {
          id: { in: allInvitedIds },
          isGraduated: true
        }
      });
    }

    return NextResponse.json({
      visionId,
      visionName,
      tribeMission,
      enrolledCount,
      graduatedCount
    });

  } catch (error) {
    console.error('Error fetching tribe stats:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
