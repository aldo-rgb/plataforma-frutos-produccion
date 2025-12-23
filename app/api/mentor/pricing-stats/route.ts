import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getMentorOccupancyStats } from '@/lib/dynamicPricing';

/**
 * GET /api/mentor/pricing-stats
 * 
 * Obtiene las estadísticas de precio dinámico para el mentor actual
 * Para mostrar en su dashboard personal
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ 
        error: 'No autorizado' 
      }, { status: 401 });
    }

    // Verificar que el usuario es mentor
    if (session.user.rol !== 'MENTOR') {
      return NextResponse.json({ 
        error: 'Solo los mentores pueden acceder a estas estadísticas' 
      }, { status: 403 });
    }

    const mentorId = parseInt(session.user.id);

    // Obtener estadísticas de ocupación y precio dinámico
    const stats = await getMentorOccupancyStats(mentorId);

    return NextResponse.json({ 
      success: true,
      stats: {
        precioBase: stats.precioBase,
        precioActual: stats.precioFinal,
        multiplicador: stats.multiplicador,
        etiqueta: stats.etiqueta,
        icono: stats.icono,
        
        // Métricas de ocupación
        tasaOcupacion: stats.tasaOcupacion,
        capacidadMensual: stats.capacidadMensual,
        reservasActuales: stats.reservasActuales,
        espaciosDisponibles: Math.max(0, stats.capacidadMensual - stats.reservasActuales),
        
        // Mensajes contextuales
        mensaje: stats.mensaje,
        colorEstado: stats.colorEstado,
        
        // Proyección de ingresos
        ingresosPotenciales: Math.round(stats.precioFinal * stats.reservasActuales),
        ingresosPosibles: Math.round(stats.precioFinal * stats.capacidadMensual)
      }
    });

  } catch (error: any) {
    console.error('❌ Error al obtener estadísticas de precio:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}
