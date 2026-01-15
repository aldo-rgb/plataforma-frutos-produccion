import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Roles permitidos para actualizar asistencia
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED',
  'TRAINER'
];

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!usuario || !ALLOWED_ROLES.includes(usuario.rol)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    const resolvedParams = await params;
    const visionId = parseInt(resolvedParams.id);

    const body = await request.json();
    const { enrollmentId, attendanceStatus, level } = body;

    if (!enrollmentId || !attendanceStatus) {
      return NextResponse.json({ 
        error: 'enrollmentId y attendanceStatus son requeridos' 
      }, { status: 400 });
    }

    // Validar que el status sea válido
    const validStatuses = ['ATTENDED', 'NOT_ATTENDED', 'PENDING', 'DROP', 'BACKLOG'];
    if (!validStatuses.includes(attendanceStatus)) {
      return NextResponse.json({ 
        error: 'attendanceStatus inválido. Debe ser: ATTENDED, NOT_ATTENDED, PENDING, DROP o BACKLOG' 
      }, { status: 400 });
    }

    // Verificar que el enrollment existe y pertenece a esta visión
    const enrollment = await prisma.vision_enrollments.findFirst({
      where: {
        id: enrollmentId,
        visionId: visionId
      }
    });

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'Enrollment no encontrado para esta visión' 
      }, { status: 404 });
    }

    // Guardar el estado anterior para el historial
    const previousStatus = enrollment.attendanceStatus || 'PENDING';

    // Actualizar el estado de asistencia
    const updatedEnrollment = await prisma.vision_enrollments.update({
      where: { id: enrollmentId },
      data: { 
        attendanceStatus: attendanceStatus 
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Vision: {
          select: {
            nombre: true
          }
        }
      }
    });

    const participanteName = updatedEnrollment.Usuario_vision_enrollments_userIdToUsuario?.nombre || 'Participante';
    const visionName = updatedEnrollment.Vision?.nombre || `Visión ${visionId}`;

    // ========================================
    // HISTORIAL DE CAMBIOS - Log del cambio
    // ========================================
    // Crear notificación como registro de auditoría para el admin
    await prisma.notification.create({
      data: {
        userId: usuario.id, // El admin que hizo el cambio
        type: 'OTHER',
        title: 'Cambio de Asistencia',
        message: `Cambiaste el estado de asistencia de ${participanteName} de "${previousStatus}" a "${attendanceStatus}" en ${visionName} (${updatedEnrollment.level})`,
        relatedId: enrollmentId
      }
    });

    // ========================================
    // NOTIFICACIÓN AL PARTICIPANTE (solo si es DROP)
    // ========================================
    if (attendanceStatus === 'DROP') {
      await prisma.notification.create({
        data: {
          userId: updatedEnrollment.userId, // El participante afectado
          type: 'SYSTEM_ALERT',
          title: 'Estado de Inscripción Actualizado',
          message: `Tu inscripción en ${visionName} (${updatedEnrollment.level}) ha sido marcada como DROP. Contacta a tu coordinador para más información.`,
          relatedId: enrollmentId
        }
      });
      
      console.log(`📧 Notificación DROP enviada a usuario ${updatedEnrollment.userId}`);
    }

    console.log(`✅ Asistencia actualizada: Enrollment ${enrollmentId} -> ${attendanceStatus} (antes: ${previousStatus})`);
    console.log(`📝 Historial guardado por usuario ${usuario.id}`);

    return NextResponse.json({
      success: true,
      message: 'Asistencia actualizada correctamente',
      enrollment: {
        id: updatedEnrollment.id,
        userId: updatedEnrollment.userId,
        attendanceStatus: updatedEnrollment.attendanceStatus,
        previousStatus: previousStatus,
        level: updatedEnrollment.level,
        usuario: updatedEnrollment.Usuario_vision_enrollments_userIdToUsuario
      },
      historyLogged: true,
      dropNotificationSent: attendanceStatus === 'DROP'
    });

  } catch (error: any) {
    console.error('❌ Error actualizando asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asistencia', message: error?.message },
      { status: 500 }
    );
  }
}
