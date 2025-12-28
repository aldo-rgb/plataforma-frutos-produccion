import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    if (usuario.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Solo mentores pueden acceder' }, { status: 403 });
    }

    // Obtener todos los enrollments donde este usuario es mentor con estado ACTIVE
    const enrollments = await prisma.programEnrollment.findMany({
      where: {
        mentorId: usuario.id,
        status: 'ACTIVE'
      },
      include: {
        participant: {
          select: {
            id: true,
            nombre: true,
            avatar: true,
            puntosCuanticos: true,
            nivelActual: true,
            Organization: {
              select: {
                name: true,
                logoUrl: true
              }
            },
            ParticipanteEnVisiones: {
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
      const participant = enrollment.participant;
      const visionActiva = participant.ParticipanteEnVisiones[0]?.Vision;
      
      return {
        id: participant.id,
        nombre: participant.nombre,
        avatar: participant.avatar,
        quantumPoints: participant.puntosCuanticos || 0,
        nivel: participant.nivelActual || 1,
        school: participant.Organization?.name || null,
        schoolLogo: participant.Organization?.logoUrl || null,
        vision: visionActiva?.nombre || null,
        visionId: visionActiva?.id || null,
        status: 'ACTIVE', // Siempre ACTIVE porque filtramos por eso
        enrollmentId: enrollment.id
      };
    });

    // Ordenar por puntos cuánticos de mayor a menor
    mentorados.sort((a, b) => b.quantumPoints - a.quantumPoints);

    return NextResponse.json({
      success: true,
      mentorados,
      total: mentorados.length
    });

  } catch (error) {
    console.error('Error obteniendo mentorados:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentorados' },
      { status: 500 }
    );
  }
}
