import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/school-admin/visiones/[id]/replace-mentor
 * Permite al director reemplazar un mentor por otro en una visión
 * - Cancela sesiones agendadas con el mentor saliente
 * - Elimina VisionMentor del mentor saliente
 * - Crea VisionMentor del mentor entrante
 * - Reasigna estudiantes al nuevo mentor
 * - Notifica a estudiantes del cambio
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { oldMentorId, newMentorId } = body;

    if (isNaN(visionId) || !oldMentorId || !newMentorId) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    if (oldMentorId === newMentorId) {
      return NextResponse.json(
        { error: 'El nuevo mentor debe ser diferente al actual' },
        { status: 400 }
      );
    }

    // Obtener organizationId del usuario
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { error: 'Director no pertenece a ninguna organización' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe y pertenece a la organización del director
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        organizationId: director.organizationId,
        isActive: true
      }
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el mentor saliente está asignado a la visión
    const oldMentorAssignment = await prisma.visionMentor.findUnique({
      where: {
        visionId_mentorId: {
          visionId,
          mentorId: oldMentorId
        }
      }
    });

    if (!oldMentorAssignment) {
      return NextResponse.json(
        { error: 'El mentor no está asignado a esta visión' },
        { status: 400 }
      );
    }

    // Verificar que el nuevo mentor existe y está activo
    const newMentor = await prisma.usuario.findFirst({
      where: {
        id: newMentorId,
        rol: { in: ['MENTOR', 'LIDER'] },
        isActive: true
      },
      include: {
        PerfilMentor: true
      }
    });

    if (!newMentor) {
      return NextResponse.json(
        { error: 'El nuevo mentor no existe o no está activo' },
        { status: 404 }
      );
    }

    // Verificar que el nuevo mentor no esté ya asignado
    const newMentorAlreadyAssigned = await prisma.visionMentor.findUnique({
      where: {
        visionId_mentorId: {
          visionId,
          mentorId: newMentorId
        }
      }
    });

    if (newMentorAlreadyAssigned) {
      return NextResponse.json(
        { error: 'El nuevo mentor ya está asignado a esta visión' },
        { status: 400 }
      );
    }

    // Obtener estudiantes afectados (participantes y gamechangers de esta visión con el mentor saliente)
    const participantes = await prisma.visionParticipante.findMany({
      where: { visionId },
      select: { 
        participanteId: true,
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: { nombre: true, email: true }
        }
      }
    });

    const gameChangers = await prisma.visionGameChanger.findMany({
      where: { visionId },
      select: { 
        gameChangerId: true,
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: { nombre: true, email: true }
        }
      }
    });

    const allStudentIds = [
      ...participantes.map(p => p.participanteId),
      ...gameChangers.map(gc => gc.gameChangerId)
    ];

    // Filtrar solo los que tienen asignado el mentor saliente
    const affectedStudents = await prisma.usuario.findMany({
      where: {
        id: { in: allStudentIds },
        assignedMentorId: oldMentorId
      },
      select: {
        id: true,
        nombre: true,
        email: true
      }
    });

    // Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cancelar todas las sesiones PENDIENTES y CONFIRMED con el mentor saliente para esta visión
      const canceledSessions = await tx.callBooking.updateMany({
        where: {
          mentorId: oldMentorId,
          studentId: { in: affectedStudents.map(s => s.id) },
          status: { in: ['PENDING', 'CONFIRMED'] },
          scheduledAt: { gte: new Date() }, // Solo futuras
          type: 'DISCIPLINE'
        },
        data: {
          status: 'CANCELLED',
          notes: 'Sesión cancelada por reemplazo de mentor en la visión'
        }
      });

      // 2. Eliminar VisionMentor del mentor saliente
      await tx.visionMentor.delete({
        where: {
          visionId_mentorId: {
            visionId,
            mentorId: oldMentorId
          }
        }
      });

      // 3. Crear VisionMentor para el nuevo mentor
      await tx.visionMentor.create({
        data: {
          visionId,
          mentorId: newMentorId,
          asignadoPorId: session.user.id
        }
      });

      // 4. Reasignar estudiantes al nuevo mentor
      await tx.usuario.updateMany({
        where: {
          id: { in: affectedStudents.map(s => s.id) },
          assignedMentorId: oldMentorId
        },
        data: {
          assignedMentorId: newMentorId
        }
      });

      // 5. Crear notificaciones para cada estudiante afectado
      const notifications = affectedStudents.map(student => ({
        userId: student.id,
        title: '🔄 Cambio de Mentor',
        message: `Tu mentor ha sido cambiado a ${newMentor.nombre}. Por favor, reagenda tus sesiones de disciplina con tu nuevo mentor lo antes posible.`,
        type: 'SYSTEM_ALERT' as const,
        isRead: false,
        createdAt: new Date()
      }));

      if (notifications.length > 0) {
        await tx.notification.createMany({
          data: notifications
        });
      }

      return {
        canceledSessions: canceledSessions.count,
        affectedStudents: affectedStudents.length,
        notificationsSent: notifications.length
      };
    });

    console.log('✅ Mentor reemplazado exitosamente:', {
      visionId,
      oldMentorId,
      newMentorId,
      canceledSessions: result.canceledSessions,
      affectedStudents: result.affectedStudents,
      directorId: session.user.id
    });

    return NextResponse.json({
      success: true,
      message: `Mentor reemplazado exitosamente. ${result.affectedStudents} estudiantes notificados.`,
      canceledSessions: result.canceledSessions,
      affectedStudents: result.affectedStudents,
      notificationsSent: result.notificationsSent,
      newMentorName: newMentor.nombre
    });

  } catch (error) {
    console.error('❌ Error reemplazando mentor:', error);
    return NextResponse.json(
      { error: 'Error al reemplazar mentor' },
      { status: 500 }
    );
  }
}
