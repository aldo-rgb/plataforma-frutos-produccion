import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Obtener todas las cartas pendientes de revisión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Buscar usuario mentor
    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar que el usuario sea mentor o game changer
    if (mentor.rol !== 'MENTOR' && mentor.rol !== 'LIDER' && mentor.rol !== 'COORDINADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Obtener IDs de participantes asignados a este mentor
    const participantesAsignados = await prisma.programEnrollment.findMany({
      where: {
        mentorId: mentor.id,
        status: { in: ['ACTIVE', 'COMPLETED'] }
      },
      select: { userId: true }
    });

    const participanteIds = participantesAsignados.map(p => p.userId);

    // Si no tiene participantes asignados, devolver lista vacía
    if (participanteIds.length === 0) {
      return NextResponse.json({ cartas: [] }, { status: 200 });
    }

    // Obtener cartas en estado EN_REVISION de participantes asignados
    const cartas = await prisma.cartaFrutos.findMany({
      where: {
        estado: 'EN_REVISION',
        usuarioId: { in: participanteIds }
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
        fechaActualizacion: 'desc'
      }
    });

    // Formatear respuesta
    const cartasPendientes = cartas.map((carta: any) => ({
      id: carta.id,
      usuarioId: carta.usuarioId,
      usuarioNombre: carta.Usuario.nombre,
      usuarioEmail: carta.Usuario.email,
      estado: carta.estado,
      fechaEnvio: carta.fechaActualizacion || carta.fechaCreacion,
      totalMetas: carta.Meta?.length || 0,
      metas: (carta.Meta || []).map((meta: any) => ({
        id: meta.id,
        categoria: meta.categoria,
        orden: meta.orden,
        metaPrincipal: meta.metaPrincipal,
        declaracionPoder: meta.declaracionPoder,
        acciones: meta.Accion || []
      }))
    }));

    return NextResponse.json({ 
      cartas: cartasPendientes 
    }, { status: 200 });

  } catch (error) {
    logger.error('❌ Error al obtener cartas pendientes:', error);
    return NextResponse.json({ error: 'Error al cargar cartas' }, { status: 500 });
  }
}
