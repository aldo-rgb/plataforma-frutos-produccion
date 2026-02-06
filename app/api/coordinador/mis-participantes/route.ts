import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Roles de coordinador permitidos
const COORDINATOR_ROLES = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || !COORDINATOR_ROLES.includes(coordinador.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    logger.debug('✅ Coordinador:', coordinador.id, coordinador.nombre, 'OrgId:', coordinador.organizationId);

    // Obtener visiones de la organización del coordinador
    let visionesWhere: any = {};
    
    if (coordinador.organizationId) {
      visionesWhere.organizationId = coordinador.organizationId;
    } else {
      visionesWhere.coordinadorId = coordinador.id;
    }

    logger.debug('🔍 Buscando visiones con:', visionesWhere);

    // Obtener visiones
    const visiones = await prisma.vision.findMany({
      where: visionesWhere,
      select: { id: true, nombre: true }
    });

    logger.debug('✅ Visiones encontradas:', visiones.length);

    // Para cada visión, obtener participantes desde vision_enrollments
    const visionesConParticipantes = await Promise.all(
      visiones.map(async (vision) => {
        // Obtener enrollments de esta visión (usuarios activos)
        const enrollments = await prisma.vision_enrollments.findMany({
          where: {
            visionId: vision.id,
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
          },
          include: {
            Usuario_vision_enrollments_userIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                rol: true,
                profileImage: true,
                puntosGamificacion: true,
                puntosCuanticos: true,
                experienciaXP: true,
                completionStreak: true,
                tier: true,
                CartaFrutos: {
                  select: {
                    id: true,
                    estado: true,
                    autorizadoMentor: true,
                    fechaCreacion: true
                  }
                },
                PerfilCompleto: {
                  select: {
                    condecoraciones: true
                  }
                }
              }
            }
          }
        });

        logger.debug('  -', vision.nombre, ':', enrollments.length, 'enrollments');

        // Filtrar y mapear participantes
        const participantes = enrollments
          .filter(e => e.Usuario_vision_enrollments_userIdToUsuario && 
                       ['PARTICIPANTE', 'GAMECHANGER', 'STAFF'].includes(e.Usuario_vision_enrollments_userIdToUsuario.rol))
          .map(e => e.Usuario_vision_enrollments_userIdToUsuario!)
          .sort((a, b) => (b.puntosGamificacion || 0) - (a.puntosGamificacion || 0))
          .map((p, index) => ({
            id: p.id,
            nombre: p.nombre,
            email: p.email,
            profileImageUrl: p.profileImage,
            condecoraciones: p.PerfilCompleto?.condecoraciones || [],
            puntosCultivo: p.puntosGamificacion || 0,
            puntosQuantum: p.puntosCuanticos || 0,
            xp: p.experienciaXP || 0,
            racha: p.completionStreak || 0,
            tier: p.tier || 'Bronce',
            ranking: index + 1,
            cartaId: p.CartaFrutos[0]?.id,
            cartaEstado: p.CartaFrutos[0]?.estado,
            cartaAutorizada: p.CartaFrutos[0]?.autorizadoMentor === true,
            mentoringStartDate: p.CartaFrutos[0]?.fechaCreacion
          }));

        return {
          visionId: vision.id,
          visionNombre: vision.nombre,
          participantes
        };
      })
    );

    // Filtrar visiones sin participantes
    const visionesConDatos = visionesConParticipantes.filter(v => v.participantes.length > 0);

    return NextResponse.json({
      success: true,
      visiones: visionesConDatos
    });

  } catch (error: any) {
    logger.error('❌ Error obteniendo participantes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener participantes',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
