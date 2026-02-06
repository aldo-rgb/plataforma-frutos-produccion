import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/school-admin/cartas-tracking/[userId]
 * Obtiene el detalle completo de la carta de un usuario
 * SOLO ACCESIBLE PARA: SCHOOL_ADMIN (Director)
 * NO ACCESIBLE PARA: COORDINADOR (Game Changer)
 */
export async function GET(
  req: Request,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(params.userId);

    // Verificar que el usuario sea DIRECTOR
    const director = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        SchoolAdmin: {
          select: {
            id: true,
            organizationId: true
          }
        }
      }
    });

    if (!director || director.rol !== 'SCHOOL_ADMIN' || !director.SchoolAdmin) {
      return NextResponse.json({ error: 'Solo directores pueden acceder' }, { status: 403 });
    }

    // Verificar que el usuario pertenece a la organización del director
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        organizationId: true,
        createdAt: true,
        ParticipanteEnVisiones: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                startDate: true,
                endDate: true
              }
            }
          },
          take: 1
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (usuario.organizationId !== director.SchoolAdmin.organizationId) {
      return NextResponse.json({ error: 'Usuario no pertenece a tu organización' }, { status: 403 });
    }

    // Obtener la carta completa
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      include: {
        Meta: {
          include: {
            Accion: {
              orderBy: {
                orden: 'asc'
              }
            }
          },
          orderBy: {
            orden: 'asc'
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ 
        error: 'El usuario aún no ha creado su carta',
        usuario: {
          id: usuario.id,
          nombre: usuario.nombre,
          email: usuario.email
        }
      }, { status: 404 });
    }

    // Organizar metas por área
    const metasPorArea: Record<string, any[]> = {
      finanzas: [],
      relaciones: [],
      talentos: [],
      salud: [],
      pazMental: [],
      ocio: [],
      servicioTrans: [],
      servicioComun: []
    };

    carta.Meta.forEach(meta => {
      if (metasPorArea[meta.areaKey]) {
        metasPorArea[meta.areaKey].push({
          id: meta.id,
          descripcion: meta.descripcion,
          declaracionSer: meta.declaracionSer,
          objetivo: meta.objetivo,
          reviewStatus: meta.reviewStatus,
          mentorFeedback: meta.mentorFeedback,
          acciones: meta.Accion.map(accion => ({
            id: accion.id,
            descripcion: accion.descripcion,
            frecuencia: accion.frecuencia,
            cantidadVecesCompletada: accion.cantidadVecesCompletada,
            cantidadVecesTotal: accion.cantidadVecesTotal,
            reviewStatus: accion.reviewStatus,
            mentorFeedback: accion.mentorFeedback
          }))
        });
      }
    });

    // Calcular estadísticas
    const totalMetas = carta.Meta.length;
    const metasAprobadas = carta.Meta.filter(m => m.reviewStatus === 'APROBADO').length;
    const metasRechazadas = carta.Meta.filter(m => m.reviewStatus === 'RECHAZADO').length;
    const metasPendientes = carta.Meta.filter(m => m.reviewStatus === 'PENDIENTE').length;

    const totalAcciones = carta.Meta.reduce((sum, m) => sum + m.Accion.length, 0);
    const accionesAprobadas = carta.Meta.reduce((sum, m) => 
      sum + m.Accion.filter(a => a.reviewStatus === 'APROBADO').length, 0
    );
    const accionesRechazadas = carta.Meta.reduce((sum, m) => 
      sum + m.Accion.filter(a => a.reviewStatus === 'RECHAZADO').length, 0
    );
    const accionesPendientes = carta.Meta.reduce((sum, m) => 
      sum + m.Accion.filter(a => a.reviewStatus === 'PENDIENTE').length, 0
    );

    return NextResponse.json({ 
      success: true,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        fechaRegistro: usuario.createdAt,
        vision: usuario.ParticipanteEnVisiones?.[0]?.Vision || null
      },
      carta: {
        id: carta.id,
        estado: carta.estado,
        fechaCreacion: carta.fechaCreacion,
        fechaActualizacion: carta.fechaActualizacion,
        fechaEnvio: carta.fechaEnvio,
        metasPorArea,
        estadisticas: {
          metas: {
            total: totalMetas,
            aprobadas: metasAprobadas,
            rechazadas: metasRechazadas,
            pendientes: metasPendientes,
            porcentajeAprobacion: totalMetas > 0 ? Math.round((metasAprobadas / totalMetas) * 100) : 0
          },
          acciones: {
            total: totalAcciones,
            aprobadas: accionesAprobadas,
            rechazadas: accionesRechazadas,
            pendientes: accionesPendientes,
            porcentajeAprobacion: totalAcciones > 0 ? Math.round((accionesAprobadas / totalAcciones) * 100) : 0
          }
        }
      }
    });

  } catch (error: any) {
    logger.error('Error getting carta detail:', error);
    return NextResponse.json(
      { error: 'Error al obtener detalle de carta', details: error.message },
      { status: 500 }
    );
  }
}
