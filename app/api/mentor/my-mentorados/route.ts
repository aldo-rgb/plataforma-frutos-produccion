import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/my-mentorados
 * Obtiene lista de usuarios asignados al mentor con sus estadísticas
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = session.user.id;

    console.log('🔍 Buscando mentorados para mentor ID:', mentorId);

    // Verificar rol
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId },
      select: { rol: true, nombre: true }
    });

    if (!mentor || !['MENTOR', 'ADMIN', 'STAFF'].includes(mentor.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener mentorados
    const mentorados = await prisma.usuario.findMany({
      where: {
        OR: [
          { mentorId: mentorId },
          { assignedMentorId: mentorId }
        ],
        isActive: true
      },
      include: {
        CartaFrutos: {
          take: 1,
          orderBy: { fechaCreacion: 'desc' }
        },
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: { status: 'ACTIVE' },
          take: 1
        }
      },
      orderBy: { nombre: 'asc' }
    });

    console.log('📊 Mentorados encontrados:', mentorados.length);
    mentorados.forEach(m => {
      console.log(`  - ${m.nombre} (ID: ${m.id}) - Carta:`, m.CartaFrutos[0] ? { id: m.CartaFrutos[0].id, estado: m.CartaFrutos[0].estado } : 'sin carta');
    });

    // Obtener estadísticas de tareas para cada mentorado
    const mentoradosWithStats = await Promise.all(
      mentorados.map(async (user: any) => {
        const taskStats = await prisma.taskInstance.groupBy({
          by: ['status'],
          where: { usuarioId: user.id },
          _count: true
        });

        const stats = {
          total: 0,
          completed: 0,
          pending: 0,
          cancelled: 0
        };

        taskStats.forEach(stat => {
          stats.total += stat._count;
          if (stat.status === 'COMPLETED') stats.completed = stat._count;
          if (stat.status === 'PENDING') stats.pending = stat._count;
          // CANCELLED no existe en TaskStatus, usar COMPLETED y PENDING solamente
        });

        // Si la carta está EN_REVISION o APROBADA, el progreso es 100%
        // Si no, calculamos basado en tareas completadas
        const cartaEstado = user.CartaFrutos[0]?.estado;
        const progressPercentage = (cartaEstado === 'EN_REVISION' || cartaEstado === 'APROBADA')
          ? 100
          : stats.total > 0 
            ? Math.round((stats.completed / stats.total) * 100) 
            : 0;

        return {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          telefono: user.telefono || null,
          fechaRegistro: user.createdAt,
          carta: user.CartaFrutos[0] ? {
            id: user.CartaFrutos[0].id,
            estado: user.CartaFrutos[0].estado,
            submittedAt: user.CartaFrutos[0].fechaActualizacion,
            approvedAt: user.CartaFrutos[0].fechaActualizacion
          } : null,
          enrollment: user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0] ? {
            cycleType: user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0].cycleType,
            cycleEndDate: user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0].cycleEndDate,
            status: user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0].status,
            vision: null
          } : null,
          vision: null,
          stats: {
            ...stats,
            progressPercentage
          }
        };
      })
    );

    return NextResponse.json({
      mentor: {
        nombre: mentor.nombre,
        totalMentorados: mentoradosWithStats.length
      },
      mentorados: mentoradosWithStats
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo mentorados:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentorados', details: error.message },
      { status: 500 }
    );
  }
}
