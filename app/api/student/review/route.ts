import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAndAwardBadges } from '@/lib/badgeSystem';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/student/review
 * 
 * Crea una review/reseña de una sesión de mentoría:
 * 1. Verifica que la sesión esté completada
 * 2. Verifica que sea el estudiante correcto
 * 3. Crea la reseña en ResenasMentoria
 * 4. Actualiza stats del mentor (calificación promedio)
 * 5. Actualiza insignias del mentor
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { bookingId, rating, comment, sharedResources } = await request.json();

    // Validaciones
    if (!bookingId || !rating || !comment) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos: bookingId, rating, comment' 
      }, { status: 400 });
    }

    if (rating < 1 || rating > 5) {
      return NextResponse.json({ 
        error: 'La calificación debe estar entre 1 y 5' 
      }, { status: 400 });
    }

    if (comment.trim().length < 10) {
      return NextResponse.json({ 
        error: 'El comentario debe tener al menos 10 caracteres' 
      }, { status: 400 });
    }

    // Obtener información de la solicitud de mentoría
    const solicitud = await prisma.solicitudMentoria.findUnique({
      where: { id: Number(bookingId) },
      include: {
        PerfilMentor: {
          include: {
            Usuario: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        },
        Usuario: {
          select: {
            id: true,
            nombre: true
          }
        },
        ResenasMentoria: true // Verificar si ya tiene reseña
      }
    });

    // Verificaciones de autorización
    if (!solicitud) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    // Verificar que sea el estudiante correcto
    if (solicitud.clienteId !== session.user.id) {
      return NextResponse.json({ 
        error: 'No puedes calificar una sesión que no es tuya' 
      }, { status: 403 });
    }

    // Verificar que la sesión esté completada
    if (solicitud.estado !== 'COMPLETADA') {
      return NextResponse.json({ 
        error: 'Solo puedes calificar sesiones completadas' 
      }, { status: 400 });
    }

    // 🆕 VERIFICAR QUE NO EXISTA YA UNA RESEÑA
    if (solicitud.ResenasMentoria) {
      return NextResponse.json({ 
        error: 'Ya has calificado esta sesión anteriormente',
        success: false 
      }, { status: 400 });
    }

    const perfilMentorId = solicitud.perfilMentorId;

    logger.debug(`📝 Creando review: Estudiante ${session.user.id} → Mentor ${solicitud.PerfilMentor.Usuario.id}`);
    logger.debug(`   Solicitud ID: ${bookingId}, Perfil Mentor ID: ${perfilMentorId}`);

    // TRANSACCIÓN: Crear review y actualizar stats del mentor
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear la reseña (la solicitud ya existe)
      const review = await tx.resenasMentoria.create({
        data: {
          solicitudId: bookingId,
          perfilMentorId: perfilMentorId,
          clienteId: session.user.id,
          calificacion: rating,
          comentario: comment.trim(),
          sharedResources: sharedResources || false,
          verificadaSesion: true,
        }
      });

      logger.debug(`   ✅ Review creada: ID ${review.id}, Rating: ${rating}/5`);

      // 2. Actualizar estadísticas del mentor
      // Obtener todas las reviews del mentor para recalcular
      const allReviews = await tx.resenasMentoria.findMany({
        where: { perfilMentorId: perfilMentorId },
        select: { calificacion: true }
      });

      const totalResenas = allReviews.length;
      const sumaCalificaciones = allReviews.reduce((sum, r) => sum + r.calificacion, 0);
      const promedioCalificacion = totalResenas > 0 ? sumaCalificaciones / totalResenas : 0;

      // Actualizar perfil del mentor
      await tx.perfilMentor.update({
        where: { id: perfilMentorId },
        data: {
          calificacionPromedio: promedioCalificacion,
          totalResenas: totalResenas,
          ratingSum: sumaCalificaciones,
          ratingCount: totalResenas
        }
      });

      logger.debug(`📊 Stats actualizadas: ${totalResenas} reviews, promedio ${promedioCalificacion.toFixed(2)}`);

      return {
        review,
        newAverage: promedioCalificacion,
        totalReviews: totalResenas,
        solicitudId: solicitud.id
      };
    });

    logger.debug(`✅ Review completada exitosamente para booking #${bookingId}`);

    // 3. AUTOMATIZACIÓN: Actualizar insignias del mentor (async, no bloqueante)
    checkAndAwardBadges(booking.mentorId)
      .then((badges) => {
        if (badges && badges.length > 0) {
          logger.debug(`🏅 Insignias actualizadas para mentor ${booking.mentorId}:`, badges);
        }
      })
      .catch((error) => {
        logger.error('❌ Error actualizando insignias:', error);
      });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: '¡Gracias por tu review!',
      review: {
        id: result.review.id,
        rating: result.review.calificacion,
        comment: result.review.comentario
      },
      mentorStats: {
        newAverage: result.newAverage,
        totalReviews: result.totalReviews
      }
    });

  } catch (error: any) {
    logger.error('❌ Error creando review:', error);
    
    // Error de duplicado (si ya existe una review)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya has calificado esta sesión' },
        { status: 409 }
      );
    }

    // Error de clave foránea (servicioId, perfilMentorId, etc.)
    if (error.code === 'P2003') {
      return NextResponse.json(
        { error: 'Error de referencia: ' + error.meta?.field_name || 'datos inválidos' },
        { status: 400 }
      );
    }

    // Error personalizado (ej: mentor sin servicios)
    if (error.message && error.message.includes('servicios configurados')) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Error al crear la review',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}
