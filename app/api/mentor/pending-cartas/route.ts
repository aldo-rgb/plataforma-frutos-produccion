import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/pending-cartas
 * Obtiene todas las cartas pendientes de revisión asignadas al mentor
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = session.user.id;

    // Verificar que sea mentor o admin/staff
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { rol: true }
    });

    if (!mentor || !['MENTOR', 'ADMIN', 'STAFF'].includes(mentor.rol)) {
      return NextResponse.json({ error: 'Acceso denegado. Solo mentores.' }, { status: 403 });
    }

    console.log('🔍 Buscando cartas para mentor ID:', mentorId);

    // Obtener cartas pendientes asignadas a este mentor
    const pendingCartas = await prisma.cartaFrutos.findMany({
      where: {
        estado: 'EN_REVISION',
        Usuario: {
          OR: [
            { mentorId: mentorId },
            { assignedMentorId: mentorId }
          ]
        }
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Meta: {
          include: {
            Accion: true
          }
        }
      },
      orderBy: {
        fechaActualizacion: 'desc' // Más recientes primero (cuando se reenvía)
      }
    });

    console.log('📊 Cartas encontradas:', pendingCartas.length);
    console.log('📋 Cartas:', pendingCartas.map(c => ({
      id: c.id,
      usuarioId: c.usuarioId,
      estado: c.estado
    })));

    // Formatear respuesta
    const formatted = pendingCartas.map(carta => ({
      id: carta.id,
      estado: carta.estado,
      submittedAt: carta.fechaActualizacion,
      usuario: {
        id: carta.Usuario.id,
        nombre: carta.Usuario.nombre,
        email: carta.Usuario.email,
        telefono: null,
        vision: null
      },
      areas: carta.Meta.map(meta => ({
        type: meta.categoria,
        identity: meta.declaracionPoder,
        meta: meta.metaPrincipal,
        hasActions: meta.Accion.length > 0
      })),
      completeness: calculateCompleteness(carta)
    }));

    return NextResponse.json({
      cartas: formatted,
      total: formatted.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo cartas pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener cartas', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Calcula el porcentaje de completitud de una carta
 * Si está EN_REVISION o APROBADA, retorna 100%
 */
function calculateCompleteness(carta: any): number {
  // Si la carta está en revisión o aprobada, está 100% completa
  if (carta.estado === 'EN_REVISION' || carta.estado === 'APROBADA') {
    return 100;
  }

  // Para otros estados, calcular basándose en las metas existentes
  if (!carta.Meta || carta.Meta.length === 0) {
    return 0;
  }

  let filled = 0;
  let total = carta.Meta.length * 2; // 2 campos por meta (declaración + objetivo)

  carta.Meta.forEach((meta: any) => {
    if (meta.declaracionPoder?.trim()) filled++;
    if (meta.metaPrincipal?.trim()) filled++;
  });

  return total > 0 ? Math.round((filled / total) * 100) : 0;
}
