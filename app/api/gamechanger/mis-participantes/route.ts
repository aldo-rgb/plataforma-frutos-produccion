import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/gamechanger/mis-participantes
 * Obtiene los participantes asignados a un GAMECHANGER
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea GAMECHANGER
    if (session.user.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos para acceder a este recurso' }, { status: 403 });
    }

    // Primero obtener las relaciones VisionParticipante donde este GAMECHANGER está asignado
    const visionParticipantes = await prisma.visionParticipante.findMany({
      where: {
        gameChangerId: session.user.id
      },
      select: {
        participanteId: true
      }
    });

    // Extraer los IDs de los participantes
    const participanteIds = visionParticipantes.map(vp => vp.participanteId);

    // Si no hay participantes asignados, retornar array vacío
    if (participanteIds.length === 0) {
      return NextResponse.json({
        success: true,
        participantes: []
      });
    }

    // Obtener los datos completos de los participantes
    const participantes = await prisma.usuario.findMany({
      where: {
        id: { in: participanteIds },
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        puntosCuanticos: true,
        experienciaXP: true,
        tier: true,
        completionStreak: true,
        CartaFrutos: {
          select: {
            id: true,
            estado: true,
            autorizadoMentor: true
          }
        }
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Formatear datos
    const participantesFormateados = participantes.map(p => ({
      id: p.id,
      nombre: p.nombre,
      email: p.email,
      puntosQuantum: p.puntosCuanticos,
      xp: p.experienciaXP,
      tier: p.tier || 'FREE',
      racha: p.completionStreak || 0,
      cartaId: p.CartaFrutos?.[0]?.id,
      cartaEstado: p.CartaFrutos?.[0]?.estado,
      cartaAutorizada: p.CartaFrutos?.[0]?.autorizadoMentor === true
    }));

    return NextResponse.json({
      success: true,
      participantes: participantesFormateados
    });

  } catch (error) {
    console.error('Error en GET /api/gamechanger/mis-participantes:', error);
    return NextResponse.json(
      { error: 'Error al obtener participantes' },
      { status: 500 }
    );
  }
}
