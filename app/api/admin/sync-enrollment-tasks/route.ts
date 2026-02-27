import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { syncEnrollmentTasksForUser, syncAllEnrollmentTasks } from '@/lib/enrollment-task-trigger';

/**
 * POST /api/admin/sync-enrollment-tasks
 * 
 * Sincroniza las tareas de enrolamiento (servicioTrans) con los invitados reales.
 * 
 * Body:
 * - userId?: number - Sincronizar solo un usuario específico
 * - all?: boolean - Sincronizar todos los usuarios (default: false)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Verificar permisos (solo admin o school-admin)
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true }
    });

    if (!user || !['ADMIN', 'SCHOOL_ADMIN', 'DIRECTOR'].includes(user.rol)) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const body = await request.json().catch(() => ({}));
    const { userId, all } = body;

    if (all) {
      // Sincronizar todos
      const result = await syncAllEnrollmentTasks();
      return NextResponse.json({
        success: result.success,
        data: {
          usersProcessed: result.usersProcessed,
          totalTasksCompleted: result.totalTasksCompleted,
          errors: result.errors.length > 0 ? result.errors : undefined
        }
      });
    }

    if (userId) {
      // Sincronizar un usuario específico
      const result = await syncEnrollmentTasksForUser(userId);
      return NextResponse.json({
        success: result.success,
        data: {
          tasksCompleted: result.tasksCompleted,
          message: result.message
        }
      });
    }

    return NextResponse.json({
      success: false,
      error: 'Especifica userId o all: true'
    }, { status: 400 });

  } catch (error) {
    console.error('Error en sync-enrollment-tasks:', error);
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor'
    }, { status: 500 });
  }
}
