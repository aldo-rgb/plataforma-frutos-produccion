import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { id } = await params;
    const usuarioId = parseInt(id);

    // Obtener la carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: usuarioId },
      include: {
        Meta: {
          orderBy: {
            id: 'asc'
          }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // Obtener información del usuario con visión y mentor
    const usuario = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: {
        Usuario_Usuario_assignedMentorIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        },
        ParticipanteEnVisiones: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                forceTransformationArea: true,
                forceCommunityServiceArea: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el coordinador tiene acceso a esta carta
    const tieneAcceso = coordinador.organizationId 
      ? usuario.organizationId === coordinador.organizationId
      : usuario.coordinadorId === coordinador.id;

    if (!tieneAcceso) {
      return NextResponse.json({ error: 'No tienes acceso a esta carta' }, { status: 403 });
    }

    // Obtener la visión activa
    const visionActiva = usuario.ParticipanteEnVisiones?.[0]?.Vision || null;

    // Agrupar metas por categoría
    const metasPorCategoria: Record<string, any[]> = {};
    carta.Meta.forEach((meta: any) => {
      const categoria = meta.categoria?.toLowerCase() || '';
      if (categoria) {
        if (!metasPorCategoria[categoria]) {
          metasPorCategoria[categoria] = [];
        }
        metasPorCategoria[categoria].push({
          id: meta.id,
          descripcion: meta.metaPrincipal,
          declaracion: meta.declaracionPoder,
          avance: meta.avance
        });
      }
    });

    return NextResponse.json({
      success: true,
      carta: {
        id: carta.id,
        usuario: {
          nombre: usuario.nombre,
          email: usuario.email
        },
        mentor: usuario.Usuario_Usuario_assignedMentorIdToUsuario ? {
          nombre: usuario.Usuario_Usuario_assignedMentorIdToUsuario.nombre,
          email: usuario.Usuario_Usuario_assignedMentorIdToUsuario.email
        } : null,
        estado: carta.estado,
        fechaCreacion: carta.fechaCreacion,
        fechaActualizacion: carta.fechaActualizacion,
        vision: visionActiva,
        metasPorCategoria: metasPorCategoria,
        
        // Metas de cada área (legacy)
        finanzasMeta: carta.finanzasMeta,
        relacionesMeta: carta.relacionesMeta,
        talentosMeta: carta.talentosMeta,
        saludMeta: carta.saludMeta,
        pazMentalMeta: carta.pazMentalMeta,
        ocioMeta: carta.ocioMeta,
        servicioTransMeta: carta.servicioTransMeta,
        servicioComunMeta: carta.servicioComunMeta,
        enrolamientoMeta: carta.enrolamientoMeta
      }
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo detalle de carta:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener la carta',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
