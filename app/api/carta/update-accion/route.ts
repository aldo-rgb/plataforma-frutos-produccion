import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { accionId, texto, frequency, assignedDays, specificDate, requiereEvidencia } = body;

    console.log('🔄 Actualizando acción:', {
      accionId,
      texto,
      frequency,
      assignedDays,
      specificDate,
      requiereEvidencia
    });

    // Validaciones
    if (!accionId) {
      return NextResponse.json({ error: 'accionId es requerido' }, { status: 400 });
    }

    if (!texto?.trim()) {
      return NextResponse.json({ error: 'texto es requerido' }, { status: 400 });
    }

    if (!frequency) {
      return NextResponse.json({ error: 'frequency es requerido' }, { status: 400 });
    }

    // Verificar que la acción existe y pertenece al usuario
    const accionExistente = await prisma.accion.findUnique({
      where: { id: accionId },
      include: {
        Meta: {
          include: {
            CartaFrutos: {
              include: {
                Usuario: true
              }
            }
          }
        }
      }
    });

    if (!accionExistente) {
      return NextResponse.json({ error: 'Acción no encontrada' }, { status: 404 });
    }

    if (accionExistente.Meta.CartaFrutos.Usuario.email !== session.user.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Actualizar la acción
    const accionActualizada = await prisma.accion.update({
      where: { id: accionId },
      data: {
        texto: texto.trim(),
        frequency,
        assignedDays: assignedDays || [],
        specificDate: specificDate ? new Date(specificDate) : null,
        requiereEvidencia: requiereEvidencia || false,
        updatedAt: new Date()
      }
    });

    console.log('✅ Acción actualizada:', accionActualizada);

    return NextResponse.json({
      success: true,
      accion: accionActualizada
    });

  } catch (error: any) {
    console.error('❌ Error al actualizar acción:', error);
    return NextResponse.json(
      { error: 'Error al actualizar acción: ' + error.message },
      { status: 500 }
    );
  }
}
