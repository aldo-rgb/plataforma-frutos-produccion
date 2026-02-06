import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const exhibitorId = searchParams.get('exhibitorId');

    if (!query || query.length < 2) {
      return NextResponse.json({ users: [], found: false });
    }

    // Si tenemos exhibitorId, obtener su visión activa para filtrar
    let visionId: number | null = null;
    
    if (exhibitorId) {
      const exhibitor = await prisma.usuario.findUnique({
        where: { id: parseInt(exhibitorId) },
        select: {
          VisionParticipante_VisionParticipante_participanteIdToUsuario: {
            where: { 
              Vision: { isActive: true }
            },
            select: { visionId: true },
            take: 1
          }
        }
      });
      
      if (exhibitor?.VisionParticipante_VisionParticipante_participanteIdToUsuario?.[0]) {
        visionId = exhibitor.VisionParticipante_VisionParticipante_participanteIdToUsuario[0].visionId;
      }
    }

    // Buscar usuarios que coincidan con el nombre Y estén en la misma visión
    const whereClause: any = {
      nombre: { contains: query, mode: 'insensitive' }
    };

    // Si encontramos la visión, filtrar solo participantes de esa visión
    if (visionId) {
      whereClause.VisionParticipante_VisionParticipante_participanteIdToUsuario = {
        some: { visionId: visionId }
      };
    }

    const users = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true
      },
      take: 10
    });

    if (users.length > 0) {
      return NextResponse.json({
        found: true,
        users: users.map(u => ({
          id: u.id,
          nombre: u.nombre || ''
        })),
        // Compatibilidad con código antiguo (primer resultado)
        id: users[0].id,
        nombre: users[0].nombre || ''
      });
    }

    return NextResponse.json({ found: false, users: [] });

  } catch (error) {
    logger.error('Error buscando referidor:', error);
    return NextResponse.json(
      { error: 'Error al buscar' },
      { status: 500 }
    );
  }
}
