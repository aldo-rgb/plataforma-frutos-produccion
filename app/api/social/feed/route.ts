import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/social/feed
 * El Muro de la Excelencia - Feed de contenido épico
 * 
 * Query params:
 * - cursor: ID de la última evidencia (para paginación)
 * - limit: Cantidad de items (default: 20)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get('cursor');
    const limit = parseInt(searchParams.get('limit') || '20');

    // ========== TRIPLE FILTRO: CALIDAD + APROBACIÓN + PRIVACIDAD ==========
    const whereConditions: any = {
      highQuality: true,              // ⭐ Filtro IA: Solo HIGH QUALITY
      estado: 'APROBADA',              // ✅ Filtro Mentor: Solo APROBADAS
      Usuario: {
        socialVisibility: {
          not: 'PRIVATE'                // 🔒 Filtro Usuario: Excluir PRIVATE
        }
      }
    };

    // Paginación con cursor
    if (cursor) {
      whereConditions.id = {
        lt: parseInt(cursor)
      };
    }

    const evidencias = await prisma.evidenciaAccion.findMany({
      where: whereConditions,
      take: limit,
      orderBy: [
        { rarityBonus: 'desc' },       // 1. Prioridad a logros raros
        { createdAt: 'desc' }          // 2. Luego cronológico inverso
      ],
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            profileImage: true,
            rangoActual: true,
            nivelActual: true,
            rol: true
          }
        },
        Accion: {
          include: {
            Meta: {
              select: {
                categoria: true,
                metaPrincipal: true
              }
            }
          }
        },
        SocialReactions: {
          select: {
            id: true,
            type: true,
            usuarioId: true
          }
        },
        _count: {
          select: {
            SocialReactions: true
          }
        }
      }
    });

    // Agregar info de si el usuario actual ya reaccionó
    const evidenciasConReaccion = evidencias.map(ev => {
      const userReaction = ev.SocialReactions.find(
        r => r.usuarioId === session.user.id
      );
      
      // Contar reacciones por tipo
      const reactionCounts = {
        FIRE: ev.SocialReactions.filter(r => r.type === 'FIRE').length,
        STRONG: ev.SocialReactions.filter(r => r.type === 'STRONG').length,
        GENIUS: ev.SocialReactions.filter(r => r.type === 'GENIUS').length,
        APPLAUSE: ev.SocialReactions.filter(r => r.type === 'APPLAUSE').length
      };

      return {
        ...ev,
        userReaction: userReaction?.type || null,
        reactionCounts,
        SocialReactions: undefined // No enviar el array completo al cliente
      };
    });

    return NextResponse.json({
      success: true,
      feed: evidenciasConReaccion,
      nextCursor: evidencias.length === limit ? evidencias[evidencias.length - 1].id : null,
      hasMore: evidencias.length === limit
    });

  } catch (error: any) {
    console.error('Error fetching social feed:', error);
    return NextResponse.json(
      { error: 'Error al cargar el feed', details: error.message },
      { status: 500 }
    );
  }
}
