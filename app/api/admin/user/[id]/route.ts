import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/user/[id]
 * Obtiene información completa de un usuario para el panel de admin
 */
export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const userId = parseInt(params.id);

    // Obtener usuario completo
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        Vision: {
          select: {
            id: true,
            name: true,
            startDate: true,
            endDate: true,
            status: true
          }
        },
        ProgramEnrollment: {
          where: { status: 'ACTIVE' },
          take: 1,
          orderBy: { createdAt: 'desc' }
        },
        CartaFrutos: {
          take: 1,
          orderBy: { fechaCreacion: 'desc' },
          include: {
            Meta: {
              include: {
                Accion: true
              }
            }
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Estadísticas de tareas
    const taskStats = await prisma.taskInstance.groupBy({
      by: ['status'],
      where: { usuarioId: userId },
      _count: true
    });

    const stats = {
      total: 0,
      pending: 0,
      completed: 0,
      cancelled: 0
    };

    taskStats.forEach(stat => {
      stats.total += stat._count;
      if (stat.status === 'PENDING') stats.pending = stat._count;
      if (stat.status === 'COMPLETED') stats.completed = stat._count;
      if (stat.status === 'CANCELADA') stats.cancelled = stat._count;
    });

    // Carta data
    const carta = user.CartaFrutos[0] || null;
    const enrollment = user.ProgramEnrollment[0] || null;

    return NextResponse.json({
      user: {
        id: user.id,
        nombre: user.nombre,
        email: user.email,
        rol: user.rol,
        status: user.status,
        telefono: user.telefono,
        fechaRegistro: user.fechaRegistro
      },
      vision: user.Vision,
      enrollment: enrollment ? {
        cycleType: enrollment.cycleType,
        cycleStartDate: enrollment.cycleStartDate,
        cycleEndDate: enrollment.cycleEndDate,
        status: enrollment.status
      } : null,
      carta: carta ? {
        id: carta.id,
        estado: carta.estado,
        approvedAt: carta.approvedAt,
        cycleStartDate: carta.cycleStartDate,
        cycleEndDate: carta.cycleEndDate,
        tasksGenerated: carta.tasksGenerated,
        // Declaraciones
        finanzasDeclaracion: carta.finanzasDeclaracion,
        relacionesDeclaracion: carta.relacionesDeclaracion,
        talentosDeclaracion: carta.talentosDeclaracion,
        saludDeclaracion: carta.saludDeclaracion,
        pazMentalDeclaracion: carta.pazMentalDeclaracion,
        ocioDeclaracion: carta.ocioDeclaracion,
        servicioTransDeclaracion: carta.servicioTransDeclaracion,
        servicioComunDeclaracion: carta.servicioComunDeclaracion,
        // Metas
        finanzasMeta: carta.finanzasMeta,
        relacionesMeta: carta.relacionesMeta,
        talentosMeta: carta.talentosMeta,
        saludMeta: carta.saludMeta,
        pazMentalMeta: carta.pazMentalMeta,
        ocioMeta: carta.ocioMeta,
        servicioTransMeta: carta.servicioTransMeta,
        servicioComunMeta: carta.servicioComunMeta,
        metas: carta.Meta
      } : null,
      stats: stats
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario', details: error.message },
      { status: 500 }
    );
  }
}
