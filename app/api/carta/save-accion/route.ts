import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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

    logger.debug('📅 API save-accion - Datos recibidos:', {
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

    // BUSCAR si ya existe una acción con el mismo texto para esta meta
    const existingAccion = await prisma.accion.findFirst({
      where: {
        metaId,
        texto
      }
    });

    let accion;
    if (existingAccion) {
      // ACTUALIZAR la acción existente (evita duplicados)
      accion = await prisma.accion.update({
        where: { id: existingAccion.id },
        data: {
          frequency: frequency || 'WEEKLY',
          assignedDays: assignedDays || [],
          requiereEvidencia: requiereEvidencia || false,
          specificDate: specificDate ? new Date(specificDate) : null,
          updatedAt: new Date()
        }
      });
      logger.debug('✅ Acción actualizada (evitando duplicado) ID:', accion.id);
    } else {
      // CREAR nueva acción
      accion = await prisma.accion.create({
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
      logger.debug('✅ Acción creada ID:', accion.id);
    }

    return NextResponse.json({ 
      success: true, 
      accion 
    });

  } catch (error: any) {
    logger.error('Error saving accion:', error);
    return NextResponse.json(
      { error: 'Error al guardar la acción', details: error.message },
      { status: 500 }
    );
  }
}
