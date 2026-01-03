import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/lobo-solitario/orden/[ordenId]
 * Obtiene los detalles de una orden de paquete de lobo solitario
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { ordenId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { ordenId } = params;

    // Buscar la orden
    const orden = await prisma.mentorPackageOrder.findUnique({
      where: {
        id: ordenId,
      },
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            imagen: true,
            PerfilMentor: {
              select: {
                titulo: true,
                especialidad: true,
              },
            },
          },
        },
        Vision: {
          select: {
            nombre: true,
          },
        },
      },
    });

    if (!orden) {
      return NextResponse.json(
        { error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden pertenece al usuario
    if (orden.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'No tienes permiso para ver esta orden' },
        { status: 403 }
      );
    }

    return NextResponse.json({
      orden: {
        id: orden.id,
        precioTotal: orden.precioTotal,
        cantidadSesiones: orden.cantidad,
        plan: (orden.paymentData as any)?.plan || 'STANDARD',
        frecuencia: (orden.paymentData as any)?.frecuencia || 'BIMESTRAL',
        mentor: {
          nombre: orden.Mentor.nombre,
          imagen: orden.Mentor.imagen,
          titulo: orden.Mentor.PerfilMentor?.titulo || 'Mentor',
          especialidad: orden.Mentor.PerfilMentor?.especialidad || '',
        },
        status: orden.status,
        createdAt: orden.createdAt,
      },
    });
  } catch (error) {
    console.error('Error al obtener orden:', error);
    return NextResponse.json(
      { error: 'Error al obtener la orden' },
      { status: 500 }
    );
  }
}
