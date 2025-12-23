import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { obtenerProgresoColecciones } from '@/lib/collectionVerifier';
import { COLECCIONES } from '@/lib/rewardSystem';

/**
 * GET /api/collections/progress
 * Obtiene el progreso de todas las colecciones para el usuario actual
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener progreso de colecciones
    const progresos = await obtenerProgresoColecciones(usuario.id);

    // Enriquecer con información de COLECCIONES
    const coleccionesConInfo = progresos.map(progreso => {
      const coleccionInfo = COLECCIONES.find(c => c.id === progreso.coleccionId);
      return {
        ...progreso,
        nombre: coleccionInfo?.nombre || 'Desconocida',
        icono: coleccionInfo?.icono || '🏆',
        descripcion: coleccionInfo?.descripcion || '',
        porcentaje: Math.round((progreso.progreso / progreso.total) * 100)
      };
    });

    return NextResponse.json({
      success: true,
      colecciones: coleccionesConInfo
    });

  } catch (error) {
    console.error('Error al obtener progreso de colecciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener progreso' },
      { status: 500 }
    );
  }
}
