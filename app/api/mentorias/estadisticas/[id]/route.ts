import { NextRequest, NextResponse } from 'next/server';
import { obtenerEstadisticasMentor } from '@/lib/mentor-rating-service';

/**
 * GET /api/mentorias/estadisticas/[id]
 * Obtener estadísticas completas de un mentor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const mentorId = parseInt(params.id);

    if (isNaN(mentorId)) {
      return NextResponse.json(
        { error: 'ID de mentor inválido' },
        { status: 400 }
      );
    }

    const estadisticas = await obtenerEstadisticasMentor(mentorId);

    return NextResponse.json({
      success: true,
      data: estadisticas
    });

  } catch (error: any) {
    console.error('❌ Error al obtener estadísticas:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error al obtener estadísticas',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
