import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/mentor/mentorados
 * Retorna la lista de mentorados activos del mentor actual
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.rol !== 'MENTOR' && usuario.rol !== 'LIDER') {
      return NextResponse.json({ error: 'Solo mentores pueden acceder' }, { status: 403 });
    }

    // Obtener todos los enrollments donde este usuario es mentor
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        mentorId: usuario.id
        // Removido el filtro de status para mostrar todos los mentorados
      },
      include: {
        Usuario_ProgramEnrollment_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            puntosCuanticos: true,
            nivelActual: true,
            experienciaXP: true,
            rangoActual: true,
            tier: true,
            Organization: {
              select: {
                name: true,
                logoUrl: true
              }
            },
            VisionParticipante_VisionParticipante_participanteIdToUsuario: {
              where: {
                Vision: {
                  isActive: true
                }
              },
              include: {
                Vision: {
                  select: {
                    id: true,
                    nombre: true
                  }
                }
              }
            }
          }
        }
      }
    });

    // Formatear los datos
    const mentorados = enrollments.map(enrollment => {
      const participant = enrollment.Usuario_ProgramEnrollment_userIdToUsuario;
      const visionActiva = participant.VisionParticipante_VisionParticipante_participanteIdToUsuario[0]?.Vision;
      
      return {
        id: participant.id,
        nombre: participant.nombre,
        avatar: participant.profileImage,
        profileImage: participant.profileImage,
        quantumPoints: participant.puntosCuanticos || 0,
        xp: participant.experienciaXP || 0,
        nivel: participant.nivelActual || 1,
        tier: participant.tier || 'FREE',
        rangoActual: participant.rangoActual || 'NOVATO_RASTREADOR',
        school: participant.Organization?.name || null,
        schoolLogo: participant.Organization?.logoUrl || null,
        vision: visionActiva?.nombre || null,
        visionId: visionActiva?.id || null,
        status: enrollment.status || 'ACTIVE',
        enrollmentId: enrollment.id,
        position: 0 // Se actualizará después de ordenar
      };
    });

    // Ordenar por puntos cuánticos de mayor a menor
    mentorados.sort((a, b) => b.quantumPoints - a.quantumPoints);
    
    // Asignar posiciones después de ordenar
    mentorados.forEach((mentorado, index) => {
      mentorado.position = index + 1;
    });

    return NextResponse.json({
      success: true,
      mentorados,
      total: mentorados.length
    });

  } catch (error) {
    logger.error('Error obteniendo mentorados:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentorados' },
      { status: 500 }
    );
  }
}
