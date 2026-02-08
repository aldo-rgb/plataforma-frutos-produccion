import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener todos los negocios de participantes de una visión para imprimir QRs de expo
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await context.params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json({ error: 'ID de visión inválido' }, { status: 400 });
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { 
        id: true, 
        nombre: true, 
        organizationId: true,
        coordinadorId: true
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar permisos (coordinador de la visión, SCHOOL_ADMIN, o ADMINISTRADOR)
    const userRole = session.user.rol;
    const userId = session.user.id;
    
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];
    
    if (!allowedRoles.includes(userRole) && vision.coordinadorId !== userId) {
      return NextResponse.json({ error: 'No tienes permisos para esta visión' }, { status: 403 });
    }

    // Obtener todos los participantes de la visión con sus negocios
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            BusinessProfile: {
              select: {
                id: true,
                headline: true,
                bio: true,
                status: true
              }
            }
          }
        }
      }
    });

    // También obtener desde vision_enrollments (modelo alternativo)
    const enrollments = await prisma.vision_enrollments.findMany({
      where: { visionId },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            BusinessProfile: {
              select: {
                id: true,
                headline: true,
                bio: true,
                status: true
              }
            }
          }
        }
      }
    });

    // Combinar y deduplicar participantes
    const participantesMap = new Map();

    // Agregar de VisionParticipante
    participantes.forEach(p => {
      const user = p.Usuario_VisionParticipante_participanteIdToUsuario;
      if (user && !participantesMap.has(user.id)) {
        participantesMap.set(user.id, {
          userId: user.id,
          nombre: user.nombre,
          email: user.email,
          negocio: user.BusinessProfile ? {
            id: user.BusinessProfile.id,
            nombre: user.BusinessProfile.headline || 'Sin nombre',
            status: user.BusinessProfile.status
          } : null
        });
      }
    });

    // Agregar de vision_enrollments
    enrollments.forEach(e => {
      const user = e.Usuario_vision_enrollments_userIdToUsuario;
      if (user && !participantesMap.has(user.id)) {
        participantesMap.set(user.id, {
          userId: user.id,
          nombre: user.nombre,
          email: user.email,
          negocio: user.BusinessProfile ? {
            id: user.BusinessProfile.id,
            nombre: user.BusinessProfile.headline || 'Sin nombre',
            status: user.BusinessProfile.status
          } : null
        });
      }
    });

    const allParticipantes = Array.from(participantesMap.values());
    
    // Filtrar solo los que tienen negocio registrado
    const conNegocio = allParticipantes.filter(p => p.negocio !== null);

    return NextResponse.json({
      success: true,
      vision: {
        id: vision.id,
        nombre: vision.nombre
      },
      totalParticipantes: allParticipantes.length,
      conNegocio: conNegocio.length,
      sinNegocio: allParticipantes.length - conNegocio.length,
      participantes: conNegocio
    });

  } catch (error) {
    console.error('Error obteniendo negocios para expo:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
