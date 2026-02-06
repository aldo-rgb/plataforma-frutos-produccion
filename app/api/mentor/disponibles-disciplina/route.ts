import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener el usuario con su visión
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        ParticipanteEnVisiones: {
          select: {
            visionId: true
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si el usuario es participante y está en una visión, filtrar solo mentores asignados
    let whereClause: any = {
      rol: 'MENTOR',
      isActive: true,
      visibleInMentorshipMarketplace: true,
      mentorMarketplaceApproved: true,
      CallAvailability: {
        some: {
          type: 'DISCIPLINE',
          isActive: true
        }
      }
    };

    // FILTRO CRÍTICO: Solo mentores asignados a la visión del participante
    if (usuario.ParticipanteEnVisiones.length > 0) {
      const visionId = usuario.ParticipanteEnVisiones[0].visionId;
      
      whereClause.MentorEnVisiones = {
        some: {
          visionId: visionId
        }
      };
    }

    // Obtener mentores disponibles (filtrados por visión si aplica)
    const mentores = await prisma.usuario.findMany({
      where: whereClause,
      include: {
        PerfilMentor: {
          select: {
            especialidad: true,
            nivel: true,
            tarifa: true,
            biografia: true
          }
        },
        CallAvailability: {
          where: {
            type: 'DISCIPLINE',
            isActive: true
          },
          select: {
            dayOfWeek: true,
            startTime: true,
            endTime: true
          }
        }
      }
    });

    // Formatear mentores con flag de disponibilidad de disciplina
    const mentoresDisponibles = mentores.map(mentor => ({
      id: mentor.id,
      nombre: mentor.nombre,
      email: mentor.email,
      profileImage: mentor.profileImage,
      PerfilMentor: mentor.PerfilMentor,
      tieneDisciplina: mentor.CallAvailability.length > 0,
      diasDisponibles: mentor.CallAvailability.length
    }));

    return NextResponse.json({
      success: true,
      mentores: mentoresDisponibles
    });

  } catch (error) {
    logger.error('Error al obtener mentores disponibles:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentores disponibles' },
      { status: 500 }
    );
  }
}
