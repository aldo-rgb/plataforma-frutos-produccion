import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/cycle/drop
 * Da de baja a un usuario del ciclo actual
 * 
 * El usuario pierde acceso a tareas pero conserva su historial
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminId = parseInt(session.user.id);

    // Verificar permisos
    const admin = await prisma.usuario.findUnique({
      where: { id: adminId },
      select: { rol: true }
    });

    if (!admin || !['ADMIN', 'STAFF'].includes(admin.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { userId, motivo } = await req.json();

    if (!userId || !motivo) {
      return NextResponse.json({ error: 'userId y motivo son requeridos' }, { status: 400 });
    }

    console.log(`⚠️ BAJA DE USUARIO iniciada por Admin #${adminId} para Usuario #${userId}`);

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
      }
    });

    if (!enrollment) {
      return NextResponse.json({ error: 'Usuario no tiene ciclo activo' }, { status: 400 });
    }

    // TRANSACCIÓN
    await prisma.$transaction(async (tx) => {
      // 1. Cambiar estado del enrollment a DROPPED
      await tx.programEnrollment.update({
        where: { id: enrollment.id },
        data: {
          status: 'DROPPED',
          dropReason: motivo,
          updatedAt: new Date()
        }
      });

      // 2. Marcar tareas pendientes como CANCELADAS (opcional)
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

      // 3. Registrar en log
      await tx.adminActionLog.create({
        data: {
          adminId: adminId,
          targetUserId: userId,
          actionType: 'DROP_USER',
          details: {
            motivo: motivo,
            userName: user.nombre,
            userEmail: user.email,
            enrollmentId: enrollment.id
          }
        }
      });
    });

    console.log(`✅ Usuario ${user.nombre} dado de baja del ciclo`);

    // TODO: Enviar notificación al usuario

    return NextResponse.json({
      success: true,
      message: `${user.nombre} ha sido dado de baja del ciclo.`,
      details: {
        userName: user.nombre,
        motivo: motivo,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error dando de baja usuario:', error);
    return NextResponse.json(
      { error: 'Error al dar de baja', details: error.message },
      { status: 500 }
    );
  }
}
