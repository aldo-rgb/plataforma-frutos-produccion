import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/carta/my-carta
 * Obtiene la carta del usuario con toda la información necesaria para el wizard
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      include: {
        Usuario: {
          select: {
            email: true,
            nombre: true
          }
        },
        Meta: {
          include: {
            Accion: true
          },
          orderBy: { orden: 'asc' }
        }
      }
    });

    if (!carta) {
      // Si no existe carta, obtener datos del usuario para incluir en la respuesta
      const usuario = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { email: true, nombre: true }
      });
      
      // Crear una nueva carta en estado BORRADOR
      const newCarta = await prisma.cartaFrutos.create({
        data: {
          usuarioId: userId,
          estado: 'BORRADOR',
          fechaCreacion: new Date(),
          fechaActualizacion: new Date()
        },
        include: {
          Usuario: {
            select: {
              email: true,
              nombre: true
            }
          },
          Meta: {
            include: {
              Accion: true
            }
          }
        }
      });

      return NextResponse.json({ carta: newCarta, isNew: true });
    }

    return NextResponse.json({ carta, isNew: false });

  } catch (error: any) {
    console.error('Error getting carta:', error);
    return NextResponse.json(
      { error: 'Error al obtener la carta', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/carta/my-carta
 * Actualiza la carta del usuario (auto-save)
 */
export async function PUT(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const data = await req.json();

    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId }
    });

    if (!carta) {
      return NextResponse.json({ error: 'Carta no encontrada' }, { status: 404 });
    }

    // No permitir edición si ya está aprobada
    if (carta.estado === 'APROBADA') {
      return NextResponse.json({ error: 'La carta ya está aprobada y no puede modificarse' }, { status: 403 });
    }

    // Campos permitidos en CartaFrutos (filtrar para evitar campos inválidos)
    const allowedFields = [
      'estado',
      'finanzasDeclaracion', 'finanzasDeclaracionStatus', 'finanzasDeclaracionFeedback',
      'relacionesDeclaracion', 'relacionesDeclaracionStatus', 'relacionesDeclaracionFeedback',
      'saludDeclaracion', 'saludDeclaracionStatus', 'saludDeclaracionFeedback',
      'pazMentalDeclaracion', 'pazMentalDeclaracionStatus', 'pazMentalDeclaracionFeedback',
      'ocioDeclaracion', 'ocioDeclaracionStatus', 'ocioDeclaracionFeedback',
      'talentosDeclaracion', 'talentosDeclaracionStatus', 'talentosDeclaracionFeedback',
      'servicioTransDeclaracion', 'servicioTransDeclaracionStatus', 'servicioTransDeclaracionFeedback',
      'servicioComunDeclaracion', 'servicioComunDeclaracionStatus', 'servicioComunDeclaracionFeedback',
      'feedbackMentor'
    ];

    // Filtrar solo campos permitidos
    const filteredData: any = {};
    for (const key of Object.keys(data)) {
      if (allowedFields.includes(key)) {
        filteredData[key] = data[key];
      }
    }

    const updatedCarta = await prisma.cartaFrutos.update({
      where: { id: carta.id },
      data: {
        ...filteredData,
        fechaActualizacion: new Date()
      },
      include: {
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    return NextResponse.json({ carta: updatedCarta });

  } catch (error: any) {
    console.error('Error updating carta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar la carta', details: error.message },
      { status: 500 }
    );
  }
}
