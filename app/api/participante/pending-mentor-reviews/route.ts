import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/participante/pending-mentor-reviews
 * Obtiene sesiones completadas que requieren calificación del mentor
 * Detecta cuando un participante ha completado un ciclo o múltiples sesiones
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const userId = session.user.id;

    // Buscar sesiones completadas sin reseña
    const sesionesSinReview = await prisma.callBooking.findMany({
      where: {
        studentId: userId,
        status: 'COMPLETED',
        // No tiene reseña asociada
        ResenasMentoria: {
          none: {},
        },
      },
      include: {
        mentor: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            PerfilMentor: {
              select: {
                id: true,
                titulo: true,
                especialidad: true,
                calificacionPromedio: true,
              },
            },
          },
        },
        vision: {
          select: {
            nombre: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
      take: 10, // Últimas 10 sesiones sin calificar
    });

    // Agrupar por mentor para detectar ciclos
    const sesionesporMentor = sesionesSinReview.reduce((acc: any, sesion) => {
      const mentorId = sesion.mentorId;
      if (!acc[mentorId]) {
        acc[mentorId] = {
          mentor: sesion.mentor,
          vision: sesion.vision,
          sesiones: [],
          totalSesiones: 0,
        };
      }
      acc[mentorId].sesiones.push({
        id: sesion.id,
        scheduledAt: sesion.scheduledAt,
        completedAt: sesion.completedAt,
        type: sesion.type,
      });
      acc[mentorId].totalSesiones++;
      return acc;
    }, {});

    // Convertir a array y detectar ciclos importantes
    const notificaciones = Object.values(sesionesporMentor).map((grupo: any) => {
      const esCicloCompleto = grupo.totalSesiones >= 3; // 3+ sesiones = ciclo completo
      const esSesionUnica = grupo.totalSesiones === 1;

      return {
        mentorId: grupo.mentor.id,
        mentorNombre: grupo.mentor.nombre,
        mentorImagen: grupo.mentor.imagen,
        mentorTitulo: grupo.mentor.PerfilMentor?.titulo || 'Mentor',
        mentorEspecialidad: grupo.mentor.PerfilMentor?.especialidad || 'Desarrollo Personal',
        mentorRating: grupo.mentor.PerfilMentor?.calificacionPromedio || 0,
        perfilMentorId: grupo.mentor.PerfilMentor?.id,
        visionNombre: grupo.vision?.nombre || 'Tu programa',
        totalSesiones: grupo.totalSesiones,
        sesiones: grupo.sesiones,
        prioridad: esCicloCompleto ? 'ALTA' : esSesionUnica ? 'MEDIA' : 'BAJA',
        mensaje: esCicloCompleto
          ? `Has completado ${grupo.totalSesiones} sesiones con ${grupo.mentor.nombre}. ¡Es momento de calificar tu experiencia!`
          : esSesionUnica
          ? `Completaste una sesión con ${grupo.mentor.nombre}. ¿Cómo fue tu experiencia?`
          : `Tienes ${grupo.totalSesiones} sesiones pendientes de calificar con ${grupo.mentor.nombre}`,
      };
    });

    // Ordenar por prioridad (ALTA primero)
    const notificacionesOrdenadas = notificaciones.sort((a, b) => {
      const prioridadOrder = { ALTA: 0, MEDIA: 1, BAJA: 2 };
      return prioridadOrder[a.prioridad as keyof typeof prioridadOrder] - prioridadOrder[b.prioridad as keyof typeof prioridadOrder];
    });

    console.log(`✅ Usuario ${userId} tiene ${notificacionesOrdenadas.length} mentores pendientes de calificar`);

    return NextResponse.json({
      success: true,
      notificaciones: notificacionesOrdenadas,
      totalPendientes: sesionesSinReview.length,
      mentoresPendientes: notificacionesOrdenadas.length,
    });
  } catch (error: any) {
    console.error('Error al obtener reviews pendientes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener notificaciones',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
