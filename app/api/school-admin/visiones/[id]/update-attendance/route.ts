import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { processBacklogForAllPaidLevels, createBacklogTickets } from '@/lib/backlog-ticket';
import { triggerEnrollmentTaskCompletion } from '@/lib/enrollment-task-trigger';

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
      },
      include: {
        Vision: {
          select: {
            organizationId: true
          }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ 
        error: 'Enrollment no encontrado para esta visión' 
      }, { status: 404 });
    }

    const organizationId = enrollment.Vision?.organizationId;

    // Guardar el estado anterior para el historial
    const previousStatus = enrollment.attendanceStatus || 'PENDING';

    // ========================================
    // CONSUMIR LICENCIA - Solo para BASIC cuando se marca ATTENDED
    // Usa el mismo proceso que check-in/complete
    // ========================================
    let licenseConsumed = false;
    let licensesWentNegative = false;
    
    if (attendanceStatus === 'ATTENDED' && 
        enrollment.level === 'BASIC' && 
        previousStatus !== 'ATTENDED' && 
        organizationId) {
      
      // Decrementar licensesAvailable de la organización (igual que check-in)
      const updatedOrg = await prisma.organization.update({
        where: { id: organizationId },
        data: {
          licensesAvailable: { decrement: 1 },
          activeLicenses: { increment: 1 }
        }
      });

      licenseConsumed = true;
      
      if (updatedOrg.licensesAvailable < 0) {
        licensesWentNegative = true;
        console.log(`⚠️ ALERTA: Organización ${organizationId} tiene ${updatedOrg.licensesAvailable} licencias (NEGATIVO)`);
      }

      // Crear LicenseAssignment si no existe
      const user = await prisma.usuario.findUnique({
        where: { id: enrollment.userId }
      });

      if (user && ['PARTICIPANTE', 'GAMECHANGER', 'LIDER'].includes(user.rol)) {
        const existingAssignment = await prisma.licenseAssignment.findFirst({
          where: {
            userId: user.id,
            organizationId: organizationId,
            isActive: true
          }
        });

        if (!existingAssignment) {
          const licenseCode = `LIC-${organizationId}-${user.id}-${Date.now()}`;
          
          await prisma.licenseAssignment.create({
            data: {
              userId: user.id,
              organizationId: organizationId,
              visionId: visionId,
              licenseCode: licenseCode,
              assignedBy: usuario.id,
              isActive: true,
              activatedAt: new Date(),
              notes: `Asignado manualmente por coordinador - Marcado asistencia BASIC`
            }
          });
          
          console.log(`✅ LicenseAssignment creado para usuario ${user.nombre} (ID: ${user.id})`);
        }
      }

      console.log(`🎫 Licencia consumida para usuario ${enrollment.userId} en nivel BASIC`);
    }

    // ========================================
    // CREAR CheckInRecord - Solo cuando se marca ATTENDED
    // Para tener registro de asistencia igual que el QR check-in
    // ========================================
    let checkInRecordCreated = false;
    
    if (attendanceStatus === 'ATTENDED' && previousStatus !== 'ATTENDED') {
      // Obtener el producto correspondiente al nivel
      const product = await prisma.schoolProduct.findFirst({
        where: {
          visionId: visionId,
          levelType: enrollment.level || 'BASIC'
        }
      });

      // Verificar si ya existe un CheckInRecord para este usuario, visión y producto
      const existingCheckIn = await prisma.checkInRecord.findFirst({
        where: {
          userId: enrollment.userId,
          visionId: visionId,
          productId: product?.id
        }
      });

      if (!existingCheckIn && organizationId && product) {
        await prisma.checkInRecord.create({
          data: {
            userId: enrollment.userId,
            organizationId: organizationId,
            productId: product.id,
            visionId: visionId,
            enrollmentId: enrollment.id,
            checkInTime: new Date(),
            checkInMethod: 'MANUAL_SEARCH',
            checkedInBy: usuario.id,
            notes: `Check-in manual por coordinador (${usuario.rol})`
          }
        });
        checkInRecordCreated = true;
        console.log(`✅ CheckInRecord creado para usuario ${enrollment.userId} en visión ${visionId}`);
      }
    }

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
    // TRIGGER ENROLLMENT TASK - Auto-completar tarea de enrolamiento
    // Si el invitado asiste a BASIC, completar tarea del que lo invitó
    // ========================================
    let enrollmentTaskCompleted = false;
    
    if (attendanceStatus === 'ATTENDED' && 
        updatedEnrollment.level === 'BASIC' && 
        previousStatus !== 'ATTENDED') {
      try {
        const triggerResult = await triggerEnrollmentTaskCompletion(
          updatedEnrollment.userId, 
          visionId
        );
        enrollmentTaskCompleted = triggerResult.success;
        
        if (triggerResult.success) {
          console.log(`✅ Tarea de enrolamiento completada automáticamente para quien invitó a ${participanteName}`);
        } else {
          console.log(`ℹ️ No se completó tarea de enrolamiento: ${triggerResult.message}`);
        }
      } catch (triggerError) {
        console.error('⚠️ Error en trigger de enrollment task:', triggerError);
      }
    }

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
    // TICKETS DE CORTESÍA CON CASCADA DE NIVELES
    // Si es BACKLOG o DROP, genera tickets desde el nivel afectado hacia arriba
    // ========================================
    let courtesyTicketResult = null;
    if ((attendanceStatus === 'BACKLOG' || attendanceStatus === 'DROP') && organizationId) {
      console.log(`🎫 Procesando tickets ${attendanceStatus} para usuario ${updatedEnrollment.userId} desde nivel ${updatedEnrollment.level}...`);
      
      // Procesar desde el nivel donde cayó hacia los niveles superiores
      courtesyTicketResult = await processBacklogForAllPaidLevels(
        updatedEnrollment.userId,
        visionId,
        organizationId,
        attendanceStatus as 'BACKLOG' | 'DROP',
        updatedEnrollment.level as 'BASIC' | 'ADVANCED' | 'PL' // Nivel donde ocurrió el DROP/BACKLOG
      );
      
      if (courtesyTicketResult.success) {
        console.log(`✅ ${courtesyTicketResult.totalTickets} ticket(s) creados para niveles: ${courtesyTicketResult.levelsProcessed.join(', ')}`);
        if (courtesyTicketResult.ticketsCancelled.length > 0) {
          console.log(`🔄 ${courtesyTicketResult.ticketsCancelled.length} ticket(s) cancelados y movidos a siguiente visión`);
        }
      } else {
        console.log(`⚠️ No se pudieron crear tickets: ${courtesyTicketResult.error}`);
      }
    }

    console.log(`✅ Asistencia actualizada: Enrollment ${enrollmentId} -> ${attendanceStatus} (antes: ${previousStatus})`);
    console.log(`📝 Historial guardado por usuario ${usuario.id}`);
    if (licenseConsumed) {
      console.log(`🎫 Licencia consumida para nivel BASIC`);
    }
    if (checkInRecordCreated) {
      console.log(`📋 CheckInRecord creado para asistencia manual`);
    }
    if (enrollmentTaskCompleted) {
      console.log(`🎯 Tarea de enrolamiento completada automáticamente`);
    }

    return NextResponse.json({
      success: true,
      message: licensesWentNegative 
        ? 'Asistencia actualizada (⚠️ licencias en negativo)' 
        : 'Asistencia actualizada correctamente',
      enrollment: {
        id: updatedEnrollment.id,
        userId: updatedEnrollment.userId,
        attendanceStatus: updatedEnrollment.attendanceStatus,
        previousStatus: previousStatus,
        level: updatedEnrollment.level,
        usuario: updatedEnrollment.Usuario_vision_enrollments_userIdToUsuario
      },
      historyLogged: true,
      courtesyTicket: courtesyTicketResult,
      licenseConsumed: licenseConsumed,
      licensesWentNegative: licensesWentNegative,
      checkInRecordCreated: checkInRecordCreated,
      enrollmentTaskCompleted: enrollmentTaskCompleted
    });

  } catch (error: any) {
    console.error('❌ Error actualizando asistencia:', error);
    return NextResponse.json(
      { error: 'Error al actualizar asistencia', message: error?.message },
      { status: 500 }
    );
  }
}
