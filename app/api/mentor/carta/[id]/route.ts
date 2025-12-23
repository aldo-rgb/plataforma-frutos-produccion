import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/carta/[id]
 * Obtiene los detalles completos de una carta para revisión del mentor
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const cartaId = parseInt(params.id);

    if (isNaN(cartaId)) {
      return NextResponse.json({ error: 'ID de carta inválido' }, { status: 400 });
    }

    const mentorId = session.user.id;

    // Buscar usuario mentor y verificar permisos
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { rol: true }
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    if (!['MENTOR', 'ADMIN', 'STAFF', 'COORDINADOR', 'GAMECHANGER'].includes(mentor.rol)) {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Obtener carta con todos sus datos (usando estructura nueva con Meta)
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            mentorId: true,
            assignedMentorId: true,
            ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
              where: { status: 'ACTIVE' },
              take: 1
            }
          }
        },
        Meta: {
          include: {
            Accion: {
              orderBy: { id: 'asc' }
            }
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // Verificar que la carta está asignada a este mentor (solo si no es admin/staff)
    const usuario = (carta as any).Usuario;
    const isAssigned = usuario.mentorId === mentorId || usuario.assignedMentorId === mentorId;
    
    if (!isAssigned && !['ADMIN', 'STAFF', 'COORDINADOR', 'GAMECHANGER'].includes(mentor.rol)) {
      return NextResponse.json({ error: 'Esta carta no está asignada a ti' }, { status: 403 });
    }

    // Formatear respuesta con estructura de metas agrupadas por categoría
    const enrollment = usuario.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0] || null;

    const response = {
      carta: {
        id: carta.id,
        estado: carta.estado,
        fechaCreacion: carta.fechaCreacion,
        fechaActualizacion: carta.fechaActualizacion,
        autorizadoMentor: carta.autorizadoMentor,
        autorizadoCoord: carta.autorizadoCoord
      },
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        email: usuario.email,
        telefono: null,
        enrollment: enrollment ? {
          cycleType: enrollment.cycleType,
          cycleStartDate: enrollment.startDate,
          cycleEndDate: enrollment.endDate,
          status: enrollment.status
        } : null
      },
      metas: (carta as any).Meta.map((meta: any) => ({
        id: meta.id,
        categoria: meta.categoria,
        orden: meta.orden,
        declaracionPoder: meta.declaracionPoder,
        metaPrincipal: meta.metaPrincipal,
        status: meta.status,
        mentorFeedback: meta.mentorFeedback,
        acciones: meta.Accion.map((accion: any) => ({
          id: accion.id,
          texto: accion.texto,
          frequency: accion.frequency,
          assignedDays: accion.assignedDays,
          specificDate: accion.specificDate,
          completada: accion.completada
        }))
      }))
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('❌ Error obteniendo carta:', error);
    return NextResponse.json(
      { error: 'Error al obtener carta', details: error.message },
      { status: 500 }
    );
  }
}
