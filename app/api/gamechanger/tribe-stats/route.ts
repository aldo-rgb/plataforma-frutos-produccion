import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/gamechanger/tribe-stats
 * Obtiene estadísticas de enrollados y graduados de la visión activa del Game Changer
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Buscar la visión activa donde el usuario es Game Changer
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

    if (!visionGC?.Vision) {
      // Si no tiene visión como GC, buscar su visión como participante
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

      if (!visionParticipante?.Vision) {
        return NextResponse.json({ error: 'No se encontró visión activa' }, { status: 404 });
      }

      // Contar enrollados (usuarios invitados por este GC que tienen ticket activo)
      const enrolledCount = await prisma.usuario.count({
        where: {
          invitedBy: userId,
          Ticket_Ticket_ownerIdToUsuario: {
            some: {
              visionId: visionParticipante.Vision.id,
              status: 'ACTIVE'
            }
          }
        }
      });

      // Contar graduados (usuarios invitados por este GC que están graduados)
      const graduatedCount = await prisma.usuario.count({
        where: {
          invitedBy: userId,
          isGraduated: true
        }
      });

      return NextResponse.json({
        visionId: visionParticipante.Vision.id,
        visionName: visionParticipante.Vision.nombre,
        tribeMission: visionParticipante.Vision.tribeMission,
        enrolledCount,
        graduatedCount
      });
    }

    // Contar enrollados (usuarios invitados por este GC que tienen ticket activo en esta visión)
    const enrolledCount = await prisma.usuario.count({
      where: {
        invitedBy: userId,
        Ticket_Ticket_ownerIdToUsuario: {
          some: {
            visionId: visionGC.Vision.id,
            status: 'ACTIVE'
          }
        }
      }
    });

    // Contar graduados (usuarios invitados por este GC que están graduados)
    const graduatedCount = await prisma.usuario.count({
      where: {
        invitedBy: userId,
        isGraduated: true
      }
    });

    return NextResponse.json({
      visionId: visionGC.Vision.id,
      visionName: visionGC.Vision.nombre,
      tribeMission: visionGC.Vision.tribeMission,
      enrolledCount,
      graduatedCount
    });

  } catch (error) {
    console.error('Error fetching tribe stats:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
