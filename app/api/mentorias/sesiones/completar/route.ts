import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { completarSesion } from '@/lib/mentor-rating-service';

/**
 * POST /api/mentorias/sesiones/completar
 * Marcar una sesión como completada (incrementa contador y evalúa promoción)
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

    // Solo ADMIN o STAFF pueden marcar sesiones como completadas
    if (session.user.rol !== 'ADMIN' && session.user.rol !== 'STAFF') {
      return NextResponse.json(
        { error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { solicitudId } = body;

    if (!solicitudId) {
      return NextResponse.json(
        { error: 'solicitudId es requerido' },
        { status: 400 }
      );
    }

    // Completar la sesión (incluye evaluación de promoción automática)
    const resultado = await completarSesion(solicitudId);

    return NextResponse.json({
      success: true,
      message: 'Sesión completada exitosamente',
      data: resultado
    });

  } catch (error: any) {
    console.error('❌ Error al completar sesión:', error);
    
    return NextResponse.json(
      { 
        error: error.message || 'Error al completar sesión',
        details: error.toString()
      },
      { status: 500 }
    );
  }
}
