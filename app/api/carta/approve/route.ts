import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateTasksForLetter, validateCartaForGeneration } from '@/lib/taskGenerator';
import { notifyCartaApproved } from '@/lib/notifications';
import logger from '@/lib/logger';

/**
 * POST /api/carta/approve
 * Aprueba la carta y genera las tareas automáticamente
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { cartaId } = await req.json();
    const userId = parseInt(session.user.id);

    // Verificar permisos (debe ser mentor o admin)
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true }
    });

    if (!user || !['MENTOR', 'ADMIN', 'COORDINADOR'].includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    // Validar que la carta está lista para generación
    const validation = await validateCartaForGeneration(cartaId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'La carta no está lista para aprobación', details: validation.errors },
        { status: 400 }
      );
    }

    // Actualizar estado a APROBADA
    await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: {
        estado: 'APROBADA',
        autorizadoMentor: true,
        autorizadoPorId: userId,
        approvedAt: new Date(),
        fechaActualizacion: new Date()
      }
    });

    // 🚀 EXPLOSIÓN DE TAREAS - Generar los 100 días
    logger.debug(`🚀 Iniciando generación automática de tareas para Carta #${cartaId}`);
    const result = await generateTasksForLetter(cartaId);

    if (!result.success) {
      return NextResponse.json(
        { error: 'Error al generar tareas', details: result.errors },
        { status: 500 }
      );
    }

    // Enviar notificación de aprobación al usuario
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: { Usuario: { select: { nombre: true, email: true } } }
    });

    if (carta) {
      await notifyCartaApproved(carta.usuarioId, result.tasksCreated);
      logger.debug(`📧 Notificación: Carta #${cartaId} APROBADA - ${result.tasksCreated} tareas generadas`);
      logger.debug(`   Usuario: ${carta.Usuario.nombre} (${carta.Usuario.email})`);
    }

    return NextResponse.json({
      success: true,
      message: `Carta aprobada exitosamente. Se generaron ${result.tasksCreated} tareas.`,
      tasksCreated: result.tasksCreated,
      carta
    });

  } catch (error: any) {
    logger.error('Error approving carta:', error);
    return NextResponse.json(
      { error: 'Error al aprobar la carta', details: error.message },
      { status: 500 }
    );
  }
}
