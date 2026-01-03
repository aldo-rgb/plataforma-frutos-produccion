import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/visiones
 * Obtiene lista de todas las visiones
 * Query params:
 *  - activeOnly: boolean - Solo visiones activas
 *  - detailed: boolean - Incluir información detallada
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const detailed = searchParams.get('detailed') === 'true';

    console.log('👁️ Cargando visiones...', { activeOnly, detailed });

    // Construir la consulta según los parámetros
    const whereClause: any = {};
    if (activeOnly) {
      whereClause.isActive = true;
    }

    // Obtener todas las visiones con información completa
    const visiones = await prisma.vision.findMany({
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        isActive: true,
        startDate: true,
        endDate: true,
        maxParticipantes: true,
        licensesAllocated: true,
        organizationId: true,
        coordinadorId: true,
        createdAt: true,
        Coordinador: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        _count: {
          select: {
            Participantes: true,
            Mentores: true,
            GameChangers: true
          }
        }
      },
      where: whereClause,
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`✅ ${visiones.length} visiones encontradas`);

    // Si solo necesita info básica (para selectores)
    if (!detailed) {
      return NextResponse.json({
        success: true,
        visiones: visiones.map(vision => ({
          id: vision.id,
          nombre: vision.nombre,
          totalParticipantes: vision._count.Participantes
        }))
      });
    }

    // Devolver información completa
    return NextResponse.json({
      success: true,
      visiones
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
