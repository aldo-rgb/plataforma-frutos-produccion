import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/visiones
 * Obtiene lista de todas las visiones
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    console.log('👁️ Cargando visiones...');

    // Obtener todas las visiones con conteo de participantes
    const visiones = await prisma.vision.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        isActive: true,
        _count: {
          select: {
            Participantes: true
          }
        }
      },
      where: {
        isActive: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`✅ ${visiones.length} visiones encontradas`);

    return NextResponse.json({
      success: true,
      visiones: visiones.map(vision => ({
        id: vision.id,
        nombre: vision.nombre,
        totalParticipantes: vision._count.Participantes
      }))
    });

  } catch (error) {
    console.error('❌ Error obteniendo visiones:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo visiones',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
