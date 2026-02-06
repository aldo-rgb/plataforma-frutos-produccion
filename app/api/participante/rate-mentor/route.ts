import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { crearReview } from '@/lib/mentor-rating-service';
import logger from '@/lib/logger';

/**
 * POST /api/participante/rate-mentor
 * Califica a un mentor después de completar sesiones
 * Crea reseñas para todas las sesiones sin calificar con ese mentor
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { mentorId, perfilMentorId, calificacion, comentario, sharedResources } = body;

    // Validaciones
    if (!mentorId || !perfilMentorId) {
      return NextResponse.json(
        { error: 'mentorId y perfilMentorId son requeridos' },
        { status: 400 }
      );
    }

    if (!calificacion || calificacion < 1 || calificacion > 5) {
      return NextResponse.json(
        { error: 'Calificación debe estar entre 1 y 5' },
        { status: 400 }
      );
    }

    const userId = session.user.id;

    // Buscar todas las sesiones completadas sin reseña con este mentor
    const sesionesSinReview = await prisma.callBooking.findMany({
      where: {
        studentId: userId,
        mentorId: mentorId,
        status: 'COMPLETED',
        ResenasMentoria: {
          none: {},
        },
      },
      include: {
        mentor: {
          select: {
            nombre: true,
            email: true,
          },
        },
      },
      orderBy: {
        completedAt: 'desc',
      },
    });

    if (sesionesSinReview.length === 0) {
      return NextResponse.json(
        { error: 'No hay sesiones pendientes de calificar con este mentor' },
        { status: 404 }
      );
    }

    logger.debug(`📝 Usuario ${userId} calificando ${sesionesSinReview.length} sesiones con mentor ${mentorId}`);

    // Crear SolicitudMentoria y reseña para CADA sesión sin review
    // (El sistema de reviews requiere solicitudId)
    const resenasCreadas = [];

    for (const booking of sesionesSinReview) {
      try {
        // Buscar si ya existe SolicitudMentoria para este booking
        let solicitud = await prisma.solicitudMentoria.findFirst({
          where: {
            clienteId: userId,
            perfilMentorId: perfilMentorId,
            // Relacionada con este booking (puedes agregar campo bookingId si existe)
          },
        });

        // Si no existe, crear una
        if (!solicitud) {
          solicitud = await prisma.solicitudMentoria.create({
            data: {
              clienteId: userId,
              perfilMentorId: perfilMentorId,
              titulo: `Sesión de mentoría - ${booking.type}`,
              descripcion: `Sesión completada el ${booking.completedAt?.toLocaleDateString('es-MX')}`,
              estado: 'ACEPTADO', // Ya fue completada
              fechaCreacion: booking.scheduledAt,
            },
          });
        }

        // Crear la reseña usando el sistema existente
        const resena = await crearReview({
          solicitudId: solicitud.id,
          clienteId: userId,
          perfilMentorId: perfilMentorId,
          calificacion: calificacion,
          comentario: comentario || `Experiencia con ${booking.mentor.nombre}`,
          sharedResources: sharedResources || false,
        });

        resenasCreadas.push(resena);

        logger.debug(`✅ Reseña creada para booking ${booking.id}`);
      } catch (error) {
        logger.error(`⚠️ Error al crear reseña para booking ${booking.id}:`, error);
        // Continuar con las demás sesiones
      }
    }

    if (resenasCreadas.length === 0) {
      return NextResponse.json(
        { error: 'No se pudo crear ninguna reseña' },
        { status: 500 }
      );
    }

    // Obtener estadísticas actualizadas del mentor
    const perfilActualizado = await prisma.perfilMentor.findUnique({
      where: { id: perfilMentorId },
      select: {
        calificacionPromedio: true,
        totalResenas: true,
        nivel: true,
      },
    });

    logger.debug(`🎉 ${resenasCreadas.length} reseñas creadas para mentor ${mentorId}`);
    logger.debug(`📊 Nuevo rating del mentor: ${perfilActualizado?.calificacionPromedio || 0}`);

    return NextResponse.json({
      success: true,
      message: `¡Gracias por tu feedback! Se calificaron ${resenasCreadas.length} sesión(es)`,
      data: {
        resenasCreadas: resenasCreadas.length,
        sesionesCalificadas: sesionesSinReview.length,
        nuevoRating: perfilActualizado?.calificacionPromedio || 0,
        totalResenas: perfilActualizado?.totalResenas || 0,
        nivelMentor: perfilActualizado?.nivel || 'JUNIOR',
      },
    });
  } catch (error: any) {
    logger.error('❌ Error al calificar mentor:', error);
    return NextResponse.json(
      { 
        error: 'Error al procesar la calificación',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
