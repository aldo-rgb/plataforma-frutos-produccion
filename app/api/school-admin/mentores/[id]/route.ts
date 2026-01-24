import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Obtener un mentor específico - School Admin
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const mentorId = parseInt(id);
    
    // Verificar si viene con type=user para buscar por usuarioId
    const { searchParams } = new URL(req.url);
    const searchType = searchParams.get('type');

    let mentor;
    
    if (searchType === 'user') {
      // Buscar por usuarioId (ID del usuario)
      mentor = await prisma.perfilMentor.findUnique({
        where: { usuarioId: mentorId },
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
              profileImage: true,
              jobTitle: true,
              isActive: true,
              accumulatedMissedCalls: true,
            },
          },
          ServicioMentoria: {
            orderBy: { precioTotal: 'asc' },
          },
        },
      });
    } else {
      // Buscar por id del perfil (comportamiento original)
      mentor = await prisma.perfilMentor.findUnique({
        where: { id: mentorId },
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
              profileImage: true,
              jobTitle: true,
              isActive: true,
              accumulatedMissedCalls: true,
            },
          },
          ServicioMentoria: {
            orderBy: { precioTotal: 'asc' },
          },
        },
      });
    }

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor no encontrado' },
        { status: 404 }
      );
    }

    const precioBase = mentor.ServicioMentoria[0]?.precioTotal || mentor.precioBase || 0;

    const mentorFormateado = {
      id: mentor.id,
      usuarioId: mentor.usuarioId,
      usuario: mentor.Usuario,
      nivel: mentor.nivel,
      titulo: mentor.titulo,
      especialidad: mentor.especialidad,
      especialidadesSecundarias: mentor.especialidadesSecundarias,
      biografiaCorta: mentor.biografiaCorta,
      biografiaCompleta: mentor.biografiaCompleta,
      biografia: mentor.biografia,
      logros: mentor.logros,
      experienciaAnios: mentor.experienciaAnios,
      totalSesiones: mentor.totalSesiones,
      calificacionPromedio: mentor.calificacionPromedio,
      totalResenas: mentor.totalResenas,
      disponible: mentor.disponible,
      destacado: mentor.destacado,
      comisionMentor: mentor.comisionMentor,
      comisionPlataforma: mentor.comisionPlataforma,
      servicios: mentor.ServicioMentoria,
      precioBase: precioBase,
      precioDisciplina: mentor.precioDisciplina,
      sede: mentor.sede,
      vision: mentor.vision,
      createdAt: mentor.createdAt,
    };

    return NextResponse.json({
      success: true,
      mentor: mentorFormateado,
    });
  } catch (error) {
    console.error('Error al obtener mentor:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentor' },
      { status: 500 }
    );
  }
}
