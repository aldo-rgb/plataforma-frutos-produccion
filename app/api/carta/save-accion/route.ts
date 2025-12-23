import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/carta/save-accion
 * Guarda una acción en la tabla Accion
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { metaId, texto, frequency, assignedDays, requiereEvidencia, specificDate } = await req.json();

    console.log('📅 API save-accion - Datos recibidos:', {
      metaId,
      texto: texto?.substring(0, 50),
      frequency,
      assignedDays,
      specificDate
    });

    if (!metaId || !texto) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Verificar que la meta existe y pertenece a una carta del usuario
    const meta = await prisma.meta.findFirst({
      where: { id: metaId },
      include: {
        CartaFrutos: true
      }
    });

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    if (!meta || meta.CartaFrutos.usuarioId !== userId) {
      return NextResponse.json({ error: 'Meta no encontrada' }, { status: 404 });
    }

    // Crear la acción
    const accion = await prisma.accion.create({
      data: {
        metaId,
        texto,
        frequency: frequency || 'WEEKLY',
        assignedDays: assignedDays || [],
        requiereEvidencia: requiereEvidencia || false,
        specificDate: specificDate ? new Date(specificDate) : null,
        completada: false,
        createdAt: new Date(),
        updatedAt: new Date()
      }
    });

    return NextResponse.json({ 
      success: true, 
      accion 
    });

  } catch (error: any) {
    console.error('Error saving accion:', error);
    return NextResponse.json(
      { error: 'Error al guardar la acción', details: error.message },
      { status: 500 }
    );
  }
}
