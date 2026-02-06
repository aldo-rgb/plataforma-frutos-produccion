import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/participante/mentores-disponibles?visionId=123
 * 
 * Obtiene la lista de mentores certificados disponibles para una visión específica
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId es requerido' }, { status: 400 });
    }

    // Obtener mentores con rol MENTOR que están activos y disponibles
    const mentores = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        PerfilMentor: {
          disponible: true,
        },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
        PerfilMentor: {
          select: {
            especialidad: true,
            nivel: true,
            biografia: true,
            biografiaCorta: true,
            calificacionPromedio: true,
            totalResenas: true,
            completedSessionsCount: true,
            precioBase: true,
            disponible: true,
          },
        },
      },
      orderBy: [
        { PerfilMentor: { calificacionPromedio: 'desc' } },
        { PerfilMentor: { totalResenas: 'desc' } },
      ],
    });

    // Filtrar solo los que tienen perfil de mentor
    const mentoresDisponibles = mentores.filter(
      (m) => m.PerfilMentor !== null
    );

    logger.debug(`✅ Encontrados ${mentoresDisponibles.length} mentores disponibles`);

    return NextResponse.json({
      success: true,
      mentores: mentoresDisponibles,
      total: mentoresDisponibles.length,
    });
  } catch (error: any) {
    logger.error('❌ Error al obtener mentores disponibles:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener mentores',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
