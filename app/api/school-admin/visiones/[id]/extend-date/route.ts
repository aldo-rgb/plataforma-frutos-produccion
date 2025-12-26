import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const visionId = parseInt(id);
    const body = await request.json();
    const { newEndDate } = body;

    if (isNaN(visionId) || !newEndDate) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    const newEnd = new Date(newEndDate);
    const now = new Date();

    if (newEnd <= now) {
      return NextResponse.json(
        { error: 'La nueva fecha debe ser mayor a la fecha actual' },
        { status: 400 }
      );
    }

    // Primero obtener la visión para validar la fecha original
    const visionCheck = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { endDate: true }
    });

    if (!visionCheck?.endDate) {
      return NextResponse.json(
        { error: 'La visión no tiene fecha de fin establecida' },
        { status: 400 }
      );
    }

    // Validar que la extensión no exceda 30 días de la fecha original
    const originalEndDate = new Date(visionCheck.endDate);
    const maxExtensionDate = new Date(originalEndDate);
    maxExtensionDate.setDate(maxExtensionDate.getDate() + 30);
    
    if (newEnd > maxExtensionDate) {
      const maxDateStr = maxExtensionDate.toLocaleDateString('es-MX', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      return NextResponse.json(
        { error: `La extensión no puede ser mayor a 30 días de la fecha original. Fecha máxima permitida: ${maxDateStr}` },
        { status: 400 }
      );
    }

    // Obtener la visión con todos los datos
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Participantes: {
          include: {
            Participante: {
              include: {
                ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
                  where: {
                    cycleType: 'VISION',
                    status: 'ACTIVE'
                  }
                },
                Usuario_Usuario_assignedMentorIdToUsuario: {
                  include: {
                    CallAvailability: {
                      where: {
                        type: 'DISCIPLINE',
                        isActive: true
                      }
                    }
                  }
                }
              }
            }
          }
        },
        GameChangers: {
          include: {
            GameChanger: {
              include: {
                ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
                  where: {
                    cycleType: 'VISION',
                    status: 'ACTIVE'
                  }
                },
                Usuario_Usuario_assignedMentorIdToUsuario: {
                  include: {
                    CallAvailability: {
                      where: {
                        type: 'DISCIPLINE',
                        isActive: true
                      }
                    }
                  }
                }
              }
            }
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Actualizar la fecha de la visión Y todas las licencias asociadas
    await prisma.$transaction([
      // 1. Actualizar la fecha de fin de la visión
      prisma.vision.update({
        where: { id: visionId },
        data: { endDate: newEnd }
      }),
      
      // 2. Actualizar licencias con autoAssignVision que coincida con el nombre de la visión
      prisma.license.updateMany({
        where: {
          autoAssignVision: vision.nombre,
          organizationId: vision.organizationId,
          isActive: true
        },
        data: {
          expiresAt: newEnd
        }
      }),
      
      // 3. Actualizar licencias asignadas a través de LicenseAssignment
      prisma.$executeRaw`
        UPDATE "License"
        SET "expiresAt" = ${newEnd}
        WHERE "code" IN (
          SELECT DISTINCT "licenseCode"
          FROM "LicenseAssignment"
          WHERE "visionId" = ${visionId}
            AND "isActive" = true
        )
      `
    ]);

    // Log para confirmar la actualización
    console.log(`✅ Fecha de visión ${visionId} (${vision.nombre}) extendida a ${newEnd.toISOString()}`);
    console.log(`✅ Licencias con autoAssignVision="${vision.nombre}" actualizadas`);
    console.log(`✅ Licencias en LicenseAssignment para visionId=${visionId} actualizadas`);

    const results = {
      extendedUsers: 0,
      scheduledCalls: 0,
      usersNeedingReschedule: [] as any[],
      errors: [] as any[]
    };

    // Procesar participantes y game changers
    const allUsers = [
      ...vision.Participantes.map(p => p.Participante),
      ...vision.GameChangers.map(gc => gc.GameChanger)
    ];

    for (const user of allUsers) {
      try {
        const enrollment = user.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
        
        if (!enrollment) continue;

        const oldEndDate = enrollment.cycleEndDate ? new Date(enrollment.cycleEndDate) : null;
        const startDate = enrollment.cycleStartDate ? new Date(enrollment.cycleStartDate) : null;
        
        if (!oldEndDate || !startDate || newEnd <= oldEndDate) continue;

        // Calcular semanas adicionales (para llamadas)
        const diffTime = newEnd.getTime() - oldEndDate.getTime();
        const additionalWeeks = Math.ceil(diffTime / (1000 * 60 * 60 * 24 * 7));

        // Calcular el total de semanas real (desde inicio hasta nuevo fin)
        const totalDiffTime = newEnd.getTime() - startDate.getTime();
        const totalWeeks = Math.ceil(totalDiffTime / (1000 * 60 * 60 * 24 * 7));

        // Actualizar el enrollment
        await prisma.programEnrollment.update({
          where: { id: enrollment.id },
          data: {
            cycleEndDate: newEnd,
            totalWeeks: totalWeeks  // Usar el total calculado, no sumar
          }
        });

        results.extendedUsers++;

        // Obtener el mentor asignado
        const mentor = user.Usuario_Usuario_assignedMentorIdToUsuario;

        if (!mentor || !mentor.CallAvailability || mentor.CallAvailability.length === 0) {
          results.usersNeedingReschedule.push({
            userId: user.id,
            userName: user.nombre,
            reason: 'No tiene mentor asignado o el mentor no tiene horarios configurados',
            additionalWeeks
          });
          
          // Crear notificación para el usuario
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'MENTOR_ASSIGNMENT',
              title: 'Extensión de Programa - Reagenda tus Llamadas',
              message: `Tu programa ha sido extendido por ${additionalWeeks} semana(s) adicional(es). Por favor, agenda tus nuevas llamadas de disciplina lo antes posible.`,
              isRead: false
            }
          });
          
          continue;
        }

        // Intentar agendar las semanas adicionales
        let callsScheduled = 0;
        let needsManualSchedule = false;

        // Obtener la última llamada programada del usuario
        const lastCall = await prisma.callBooking.findFirst({
          where: {
            studentId: user.id,
            type: 'DISCIPLINE',
            status: { in: ['PENDING', 'CONFIRMED'] }
          },
          orderBy: { scheduledAt: 'desc' }
        });

        const lastScheduledDate = lastCall ? new Date(lastCall.scheduledAt) : new Date();
        const availability = mentor.CallAvailability;

        // Intentar agendar semanas adicionales
        for (let week = 1; week <= additionalWeeks; week++) {
          const targetDate = new Date(lastScheduledDate);
          targetDate.setDate(targetDate.getDate() + (7 * week));

          // Buscar el horario correspondiente al día de la semana
          const dayOfWeek = targetDate.getDay();
          const availableSlot = availability.find(av => av.dayOfWeek === dayOfWeek);

          if (!availableSlot) {
            needsManualSchedule = true;
            break;
          }

          // Construir la fecha y hora de la llamada
          const [hours, minutes] = availableSlot.startTime.split(':').map(Number);
          const scheduledDate = new Date(targetDate);
          scheduledDate.setHours(hours, minutes, 0, 0);

          // Verificar si el mentor ya tiene una llamada en ese horario
          const conflictingCall = await prisma.callBooking.findFirst({
            where: {
              mentorId: mentor.id,
              scheduledAt: scheduledDate,
              status: { in: ['PENDING', 'CONFIRMED'] }
            }
          });

          if (conflictingCall) {
            needsManualSchedule = true;
            break;
          }

          // Crear la llamada
          await prisma.callBooking.create({
            data: {
              mentorId: mentor.id,
              studentId: user.id,
              scheduledAt: scheduledDate,
              duration: 15,
              type: 'DISCIPLINE',
              status: 'PENDING',
              weekNumber: enrollment.totalWeeks - additionalWeeks + week,
              programEnrollmentId: enrollment.id
            }
          });

          callsScheduled++;
        }

        if (needsManualSchedule || callsScheduled < additionalWeeks) {
          results.usersNeedingReschedule.push({
            userId: user.id,
            userName: user.nombre,
            reason: 'Conflictos de horario con el mentor',
            additionalWeeks,
            callsScheduled
          });

          // Crear notificación
          await prisma.notification.create({
            data: {
              userId: user.id,
              type: 'MENTOR_ASSIGNMENT',
              title: 'Extensión de Programa - Reagenda tus Llamadas',
              message: `Tu programa ha sido extendido por ${additionalWeeks} semana(s). Se agendaron automáticamente ${callsScheduled} llamada(s), pero necesitas reagendar las ${additionalWeeks - callsScheduled} semana(s) restante(s) debido a conflictos de horario.`,
              isRead: false
            }
          });
        } else {
          results.scheduledCalls += callsScheduled;
        }

      } catch (error: any) {
        results.errors.push({
          userId: user.id,
          userName: user.nombre,
          error: error.message
        });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Fecha de visión extendida exitosamente',
      results
    });

  } catch (error) {
    console.error('Error extendiendo fecha de visión:', error);
    return NextResponse.json(
      { error: 'Error al extender fecha de visión' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
