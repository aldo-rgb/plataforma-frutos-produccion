import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/user/desert
 * Permite al usuario desertar (abandonar) su ciclo actual
 * 
 * Esta es una acción voluntaria del usuario (no forzada por admin)
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { confirmacion } = await req.json();

    // Validar confirmación
    if (confirmacion !== 'DESERTAR') {
      return NextResponse.json({ 
        error: 'Confirmación incorrecta. Escribe "DESERTAR" para confirmar.' 
      }, { status: 400 });
    }

    console.log(`⚠️ DESERCIÓN iniciada por Usuario #${userId}`);

    // Obtener usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar enrollment activo
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        usuarioId: userId,
        status: 'ACTIVE'
      },
      include: {
        Vision: {
          select: { name: true }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'No tienes un ciclo activo del cual desertar' 
      }, { status: 400 });
    }

    // TRANSACCIÓN
    await prisma.$transaction(async (tx) => {
      // 1. Cambiar estado a DESERTER
      await tx.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'DESERTER',
          desertedAt: new Date(),
          dropReason: `Deserción voluntaria el ${new Date().toLocaleDateString()}`,
          updatedAt: new Date()
        }
      });

      // 2. Cancelar tareas pendientes
      await tx.taskInstance.updateMany({
        where: {
          usuarioId: userId,
          status: 'PENDING'
        },
        data: {
          status: 'CANCELADA',
          updatedAt: new Date()
        }
      });

      // 3. Log de auditoría (auto-acción)
      await tx.adminActionLog.create({
        data: {
          adminId: userId, // El mismo usuario es quien ejecuta
          targetUserId: userId,
          actionType: 'USER_DESERT',
          details: {
            userName: user.nombre,
            userEmail: user.email,
            cycleType: enrollment.cycleType,
            visionName: enrollment.Vision?.name,
            desertedAt: new Date().toISOString()
          }
        }
      });
    });

    console.log(`❌ ${user.nombre} ha desertado del ciclo`);

    // TODO: Notificar al mentor/admin

    return NextResponse.json({
      success: true,
      message: 'Has desertado del ciclo actual. Tu progreso quedará congelado.',
      details: {
        userName: user.nombre,
        cycleType: enrollment.cycleType,
        visionName: enrollment.Vision?.name,
        desertedAt: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error procesando deserción:', error);
    return NextResponse.json(
      { error: 'Error al procesar deserción', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/desert
 * Verifica si el usuario tiene un ciclo activo del cual puede desertar
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        usuarioId: userId,
        status: 'ACTIVE'
      },
      include: {
        Vision: {
          select: { name: true, endDate: true }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({
        canDesert: false,
        message: 'No tienes un ciclo activo'
      });
    }

    // Obtener estadísticas
    const stats = await prisma.taskInstance.groupBy({
      by: ['status'],
      where: { usuarioId: userId },
      _count: true
    });

    const taskStats = {
      total: 0,
      completed: 0,
      pending: 0
    };

    stats.forEach(stat => {
      taskStats.total += stat._count;
      if (stat.status === 'COMPLETED') taskStats.completed = stat._count;
      if (stat.status === 'PENDING') taskStats.pending = stat._count;
    });

    return NextResponse.json({
      canDesert: true,
      enrollment: {
        cycleType: enrollment.cycleType,
        cycleStartDate: enrollment.cycleStartDate,
        cycleEndDate: enrollment.cycleEndDate,
        visionName: enrollment.Vision?.name
      },
      stats: taskStats,
      warning: `Perderás acceso a ${taskStats.pending} tareas pendientes y tu progreso quedará congelado.`
    });

  } catch (error: any) {
    console.error('❌ Error verificando deserción:', error);
    return NextResponse.json(
      { error: 'Error al verificar', details: error.message },
      { status: 500 }
    );
  }
}
