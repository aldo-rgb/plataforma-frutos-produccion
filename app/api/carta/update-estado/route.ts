import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/carta/update-estado
 * Actualiza el estado de una carta (para reenvío a revisión)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { cartaId, estado } = await req.json();

    if (!cartaId || !estado) {
      return NextResponse.json(
        { error: 'Faltan parámetros requeridos' },
        { status: 400 }
      );
    }

    // Verificar que la carta pertenece al usuario
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      select: { usuarioId: true }
    });

    if (!carta || carta.usuarioId !== session.user.id) {
      return NextResponse.json(
        { error: 'Carta no encontrada o sin permisos' },
        { status: 404 }
      );
    }

    console.log(`🔄 Actualizando carta ${cartaId} a estado: ${estado}`);

    // Actualizar el estado y la fecha de actualización
    const cartaActualizada = await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: {
        estado: estado,
        fechaActualizacion: new Date()
      }
    });

    console.log(`✅ Carta ${cartaId} actualizada correctamente a estado: ${estado}`);

    return NextResponse.json({
      success: true,
      carta: {
        id: cartaActualizada.id,
        estado: cartaActualizada.estado,
        fechaActualizacion: cartaActualizada.fechaActualizacion
      }
    });

  } catch (error: any) {
    console.error('❌ Error actualizando estado de carta:', error);
    return NextResponse.json(
      { error: 'Error al actualizar estado', details: error.message },
      { status: 500 }
    );
  }
}
