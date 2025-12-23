import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/cycle/restart
 * ACCIÓN NUCLEAR: Reinicia el ciclo completo de un usuario
 * 
 * Acciones:
 * 1. Elimina TODAS las tareas generadas
 * 2. Elimina el enrollment activo
 * 3. Devuelve la carta a estado BORRADOR
 * 4. Registra la acción en el log de auditoría
 */
export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const adminId = parseInt(session.user.id);

    // Verificar que el usuario sea ADMIN o STAFF
    const admin = await prisma.usuario.findUnique({
      where: { id: adminId },
      select: { rol: true }
    });

    if (!admin || !['ADMIN', 'STAFF'].includes(admin.rol)) {
      return NextResponse.json({ error: 'Acceso denegado. Solo ADMIN/STAFF.' }, { status: 403 });
    }

    const { userId, reason } = await req.json();

    if (!userId) {
      return NextResponse.json({ error: 'userId es requerido' }, { status: 400 });
    }

    console.log(`🚨 REINICIO DE CICLO iniciado por Admin #${adminId} para Usuario #${userId}`);
    console.log(`   Razón: ${reason || 'No especificada'}`);

    // Obtener información del usuario antes de borrar
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { nombre: true, email: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // TRANSACCIÓN ATÓMICA
    await prisma.$transaction(async (tx) => {
      // 1. Eliminar TODAS las tareas generadas
      const deletedTasks = await tx.taskInstance.deleteMany({
        where: { usuarioId: userId }
      });
      console.log(`   ❌ ${deletedTasks.count} tareas eliminadas`);

      // 2. Eliminar inscripciones activas
      const deletedEnrollments = await tx.programEnrollment.deleteMany({
        where: {
          usuarioId: userId,
          status: 'ACTIVE'
        }
      });
      console.log(`   ❌ ${deletedEnrollments.count} enrollments eliminados`);

      // 3. Regresar carta a BORRADOR (si existe)
      const updatedCartas = await tx.cartaFrutos.updateMany({
        where: {
          usuarioId: userId,
          estado: 'APROBADA'
        },
        data: {
          estado: 'BORRADOR',
          approvedAt: null,
          cycleStartDate: null,
          cycleEndDate: null,
          tasksGenerated: false,
          tasksGeneratedAt: null,
          fechaActualizacion: new Date()
        }
      });
      console.log(`   🔄 ${updatedCartas.count} cartas devueltas a BORRADOR`);

      // 4. Registrar en log de auditoría
      await tx.adminActionLog.create({
        data: {
          adminId: adminId,
          targetUserId: userId,
          actionType: 'RESTART_CYCLE',
          details: {
            reason: reason || 'No especificada',
            tasksDeleted: deletedTasks.count,
            enrollmentsDeleted: deletedEnrollments.count,
            cartasReverted: updatedCartas.count,
            userName: user.nombre,
            userEmail: user.email
          }
        }
      });
    });

    console.log(`✅ Ciclo reiniciado exitosamente para ${user.nombre}`);

    return NextResponse.json({
      success: true,
      message: `Ciclo reiniciado para ${user.nombre}. La carta está ahora en estado BORRADOR.`,
      details: {
        userName: user.nombre,
        action: 'RESTART_CYCLE',
        timestamp: new Date().toISOString()
      }
    });

  } catch (error: any) {
    console.error('❌ Error reiniciando ciclo:', error);
    return NextResponse.json(
      { error: 'Error al reiniciar ciclo', details: error.message },
      { status: 500 }
    );
  }
}
