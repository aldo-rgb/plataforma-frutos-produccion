import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/school-admin/cartas-tracking
 * Obtiene el listado de cartas de los usuarios de la organización del director
 * SOLO ACCESIBLE PARA: SCHOOL_ADMIN (Director)
 * NO ACCESIBLE PARA: COORDINADOR (Game Changer)
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario sea DIRECTOR
    const usuario = await prisma.usuario.findUnique({
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

    if (!usuario || usuario.rol !== 'SCHOOL_ADMIN' || !usuario.SchoolAdmin) {
      return NextResponse.json({ error: 'Solo directores pueden acceder' }, { status: 403 });
    }

    const organizationId = usuario.SchoolAdmin.organizationId;

    // Obtener todos los usuarios de la organización con sus cartas
    const usuarios = await prisma.usuario.findMany({
      where: {
        organizationId,
        rol: 'PARTICIPANTE',
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        createdAt: true,
        wizardCompleted: true,
        ParticipanteEnVisiones: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          },
          take: 1
        },
        LicenseAssignment: {
          where: {
            isActive: true
          },
          select: {
            id: true,
            activatedAt: true,
            expiresAt: true,
            License: {
              select: {
                tier: true
              }
            }
          },
          take: 1
        },
        CartaFrutos: {
          select: {
            id: true,
            estado: true,
            fechaCreacion: true,
            fechaActualizacion: true,
            fechaEnvio: true,
            Meta: {
              select: {
                id: true,
                areaKey: true,
                descripcion: true,
                reviewStatus: true
              }
            }
          },
          orderBy: {
            fechaActualizacion: 'desc'
          },
          take: 1
        }
      },
      orderBy: [
        { nombre: 'asc' }
      ]
    });

    // Mapear datos para el frontend
    const cartasTracking = usuarios.map(user => {
      const carta = user.CartaFrutos[0];
      const vision = user.ParticipanteEnVisiones?.[0]?.Vision;
      const license = user.LicenseAssignment?.[0];

      // Calcular estadísticas de revisión si la carta existe
      let reviewStats = null;
      if (carta && carta.Meta.length > 0) {
        const total = carta.Meta.length;
        const aprobadas = carta.Meta.filter(m => m.reviewStatus === 'APROBADO').length;
        const rechazadas = carta.Meta.filter(m => m.reviewStatus === 'RECHAZADO').length;
        const pendientes = carta.Meta.filter(m => m.reviewStatus === 'PENDIENTE').length;

        reviewStats = {
          total,
          aprobadas,
          rechazadas,
          pendientes,
          porcentajeAprobacion: total > 0 ? Math.round((aprobadas / total) * 100) : 0
        };
      }

      return {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        fechaRegistro: user.createdAt,
        vision: vision ? {
          id: vision.id,
          nombre: vision.nombre
        } : null,
        license: license ? {
          tier: license.License.tier,
          activada: !!license.activatedAt,
          fechaActivacion: license.activatedAt,
          expira: license.expiresAt
        } : null,
        carta: carta ? {
          id: carta.id,
          estado: carta.estado,
          fechaCreacion: carta.fechaCreacion,
          fechaActualizacion: carta.fechaActualizacion,
          fechaEnvio: carta.fechaEnvio,
          totalMetas: carta.Meta.length,
          reviewStats
        } : null,
        wizardCompleted: user.wizardCompleted,
        statusResumen: getStatusResumen(user.wizardCompleted, carta, license)
      };
    });

    return NextResponse.json({ 
      success: true,
      cartas: cartasTracking,
      totalUsuarios: cartasTracking.length
    });

  } catch (error: any) {
    console.error('Error getting cartas tracking:', error);
    return NextResponse.json(
      { error: 'Error al obtener seguimiento de cartas', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Helper para determinar el status resumen de un usuario
 */
function getStatusResumen(
  wizardCompleted: boolean, 
  carta: any, 
  license: any
): {
  tipo: 'sin-licencia' | 'licencia-no-activada' | 'sin-carta' | 'borrador' | 'en-revision' | 'cambios-requeridos' | 'aprobada';
  mensaje: string;
  color: 'gray' | 'yellow' | 'blue' | 'purple' | 'orange' | 'green' | 'red';
} {
  // Sin licencia
  if (!license) {
    return {
      tipo: 'sin-licencia',
      mensaje: 'Sin licencia asignada',
      color: 'gray'
    };
  }

  // Licencia no activada
  if (!license.activatedAt) {
    return {
      tipo: 'licencia-no-activada',
      mensaje: 'Licencia pendiente de activar',
      color: 'yellow'
    };
  }

  // Sin carta
  if (!carta) {
    return {
      tipo: 'sin-carta',
      mensaje: 'No ha iniciado wizard',
      color: 'gray'
    };
  }

  // Según el estado de la carta
  switch (carta.estado) {
    case 'BORRADOR':
      return {
        tipo: 'borrador',
        mensaje: wizardCompleted ? 'Tiene borrador guardado' : 'Wizard en progreso',
        color: 'blue'
      };
    case 'EN_REVISION':
      return {
        tipo: 'en-revision',
        mensaje: 'Enviada a revisión',
        color: 'purple'
      };
    case 'CAMBIOS_REQUERIDOS':
      return {
        tipo: 'cambios-requeridos',
        mensaje: 'Requiere cambios',
        color: 'orange'
      };
    case 'APROBADA':
      return {
        tipo: 'aprobada',
        mensaje: 'Carta aprobada',
        color: 'green'
      };
    default:
      return {
        tipo: 'sin-carta',
        mensaje: 'Estado desconocido',
        color: 'gray'
      };
  }
}
