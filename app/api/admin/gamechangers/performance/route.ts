import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/admin/gamechangers/performance
 * Obtiene datos de rendimiento de todos los game changers activos
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea admin o director
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true }
    });

    if (!usuario || !['ADMINISTRADOR', 'SUPER_ADMIN', 'COORDINADOR'].includes(usuario.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    logger.debug('📊 Cargando rendimiento de game changers...');

    // Obtener todos los game changers activos
    const gameChangers = await prisma.usuario.findMany({
      where: {
        rol: 'GAMECHANGER',
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    // Para cada game changer, calcular sus métricas
    const gameChangersConMetricas = await Promise.all(
      gameChangers.map(async (gc) => {
        // Obtener su carta de frutos
        const carta = await prisma.cartaFrutos.findFirst({
          where: {
            usuarioId: gc.id,
            estado: { in: ['BORRADOR', 'EN_REVISION', 'APROBADA'] }
          },
          orderBy: {
            fechaCreacion: 'desc'
          }
        });

        // Calcular progreso de la carta (promedio de todas las áreas)
        let cartaFrutos = 0;
        if (carta) {
          const areas = [
            carta.finanzasAvance || 0,
            carta.relacionesAvance || 0,
            carta.talentosAvance || 0,
            carta.pazMentalAvance || 0,
            carta.ocioAvance || 0,
            carta.saludAvance || 0,
            carta.servicioTransAvance || 0,
            carta.servicioComunAvance || 0
          ];
          cartaFrutos = Math.round(areas.reduce((a, b) => a + b, 0) / areas.length);
        }

        // Meta de enrolamiento desde la carta
        const metaEnrolamiento = carta?.enrolamientoMeta || 10;
        const logrados = carta?.invitadosInscritos || 0;

        return {
          id: gc.id,
          nombre: gc.nombre,
          metaEnrolamiento,
          logrados,
          cartaFrutos
        };
      })
    );

    // Ordenar por porcentaje de logro descendente
    gameChangersConMetricas.sort((a, b) => {
      const metaA = Number(a.metaEnrolamiento) || 1;
      const metaB = Number(b.metaEnrolamiento) || 1;
      const porcentajeA = (Number(a.logrados) / metaA) * 100;
      const porcentajeB = (Number(b.logrados) / metaB) * 100;
      return porcentajeB - porcentajeA;
    });

    logger.debug(`✅ ${gameChangersConMetricas.length} game changers cargados con métricas`);

    return NextResponse.json({
      success: true,
      gameChangers: gameChangersConMetricas
    });

  } catch (error) {
    logger.error('❌ Error obteniendo rendimiento de game changers:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo rendimiento de game changers',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
