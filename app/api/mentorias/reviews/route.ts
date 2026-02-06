import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { crearReview } from '@/lib/mentor-rating-service';
import logger from '@/lib/logger';

/**
 * POST /api/mentorias/reviews
 * Crear una reseña para una sesión de mentoría completada
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { solicitudId, calificacion, comentario, sharedResources } = body; // 🏅 NUEVO: sharedResources

    // Validaciones
    if (!solicitudId || !calificacion) {
      return NextResponse.json(
        { error: 'solicitudId y calificacion son requeridos' },
        { status: 400 }
      );
    }

    if (calificacion < 1 || calificacion > 5) {
      return NextResponse.json(
        { error: 'La calificación debe estar entre 1 y 5' },
        { status: 400 }
      );
    }

    // Crear la reseña (incluye lógica de promoción automática)
    const resultado = await crearReview({
      solicitudId,
      clienteId: session.user.id,
      perfilMentorId: body.perfilMentorId, // Debe venir del frontend
      calificacion,
      comentario: comentario || null,
      sharedResources: sharedResources || false // 🏅 NUEVO: Para insignia Erudito
    });

    return NextResponse.json({
      success: true,
      message: 'Reseña creada exitosamente',
      data: resultado
    });

  } catch (error: any) {
    logger.error('❌ Error al crear reseña:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error al crear reseña',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
