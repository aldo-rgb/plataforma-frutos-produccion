import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener mentores activos con disponibilidad de llamadas de disciplina
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        CallAvailability: {
          some: {
            type: 'DISCIPLINE',
            isActive: true
          }
        }
      },
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
    console.error('Error al obtener mentores disponibles:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentores disponibles' },
      { status: 500 }
    );
  }
}
