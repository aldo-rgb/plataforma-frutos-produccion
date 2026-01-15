import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createBacklogTicket } from '@/lib/backlog-ticket';

// API para actualizar automáticamente los estados de asistencia
// Puede ser llamado por Vercel Cron Jobs o manualmente

// Esta API realiza 2 operaciones:
// 1. Marca NOT_ATTENDED a las 12:00 PM del día de inicio del entrenamiento
// 2. Marca BACKLOG 1 día después de finalizar el entrenamiento para los NOT_ATTENDED

export async function POST(request: NextRequest) {
  try {
    // Verificar autorización con clave secreta (para cron jobs)
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || 'frutos-cron-secret-2026';
    
    if (authHeader !== `Bearer ${cronSecret}`) {
      // También permitir llamadas desde el servidor (sesión válida)
      const { searchParams } = new URL(request.url);
      const manualKey = searchParams.get('key');
      if (manualKey !== cronSecret) {
        return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
      }
    }

    const now = new Date();
    const results = {
      markedNotAttended: 0,
      markedBacklog: 0,
      backlogTicketsCreated: 0,
      backlogTicketsFailed: 0,
      backlogTicketsAlreadyUsed: 0,
      errors: [] as string[]
    };

    // ========================================
    // 1. MARCAR NOT_ATTENDED
    // A las 12:00 PM del día de inicio del entrenamiento
    // ========================================
    
    // Buscar visiones que hayan iniciado hoy y sean las 12:00 PM o después
    const todayNoon = new Date();
    todayNoon.setHours(12, 0, 0, 0);

    if (now >= todayNoon) {
      // Buscar visiones con nivel BASIC que iniciaron hoy
      const visionesBasicIniciadas = await prisma.vision.findMany({
        where: {
          startDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
          }
        },
        select: { id: true, nombre: true }
      });

      for (const vision of visionesBasicIniciadas) {
        try {
          // Marcar como NOT_ATTENDED a los que están en PENDING y no tienen check-in
          const enrollmentsToMark = await prisma.vision_enrollments.findMany({
            where: {
              visionId: vision.id,
              level: 'BASIC',
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
              attendanceStatus: { in: ['PENDING', null] }
            },
            select: { id: true, userId: true }
          });

          for (const enrollment of enrollmentsToMark) {
            // Verificar si tiene CheckInRecord de hoy
            const hasCheckIn = await prisma.checkInRecord.findFirst({
              where: {
                userId: enrollment.userId,
                checkInTime: {
                  gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                  lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
                }
              }
            });

            if (!hasCheckIn) {
              await prisma.vision_enrollments.update({
                where: { id: enrollment.id },
                data: { attendanceStatus: 'NOT_ATTENDED' }
              });
              results.markedNotAttended++;
            }
          }
        } catch (error: any) {
          results.errors.push(`Error en visión ${vision.id}: ${error.message}`);
        }
      }

      // Buscar visiones con nivel ADVANCED que iniciaron hoy
      const visionesAdvancedIniciadas = await prisma.vision.findMany({
        where: {
          advancedStartDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
          }
        },
        select: { id: true, nombre: true }
      });

      for (const vision of visionesAdvancedIniciadas) {
        try {
          const enrollmentsToMark = await prisma.vision_enrollments.findMany({
            where: {
              visionId: vision.id,
              level: 'ADVANCED',
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
              attendanceStatus: { in: ['PENDING', null] }
            },
            select: { id: true, userId: true }
          });

          for (const enrollment of enrollmentsToMark) {
            const hasCheckIn = await prisma.checkInRecord.findFirst({
              where: {
                userId: enrollment.userId,
                checkInTime: {
                  gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                  lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
                }
              }
            });

            if (!hasCheckIn) {
              await prisma.vision_enrollments.update({
                where: { id: enrollment.id },
                data: { attendanceStatus: 'NOT_ATTENDED' }
              });
              results.markedNotAttended++;
            }
          }
        } catch (error: any) {
          results.errors.push(`Error en visión ADVANCED ${vision.id}: ${error.message}`);
        }
      }

      // Buscar visiones con nivel PL (primer fin de semana) que iniciaron hoy
      const visionesPLIniciadas = await prisma.vision.findMany({
        where: {
          plWeekend1StartDate: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59)
          }
        },
        select: { id: true, nombre: true }
      });

      for (const vision of visionesPLIniciadas) {
        try {
          const enrollmentsToMark = await prisma.vision_enrollments.findMany({
            where: {
              visionId: vision.id,
              level: 'PL',
              enrollmentStatus: { in: ['ENROLLED', 'ACTIVE'] },
              attendanceStatus: { in: ['PENDING', null] }
            },
            select: { id: true, userId: true }
          });

          for (const enrollment of enrollmentsToMark) {
            const hasCheckIn = await prisma.checkInRecord.findFirst({
              where: {
                userId: enrollment.userId,
                checkInTime: {
                  gte: new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0),
                  lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0)
                }
              }
            });

            if (!hasCheckIn) {
              await prisma.vision_enrollments.update({
                where: { id: enrollment.id },
                data: { attendanceStatus: 'NOT_ATTENDED' }
              });
              results.markedNotAttended++;
            }
          }
        } catch (error: any) {
          results.errors.push(`Error en visión PL ${vision.id}: ${error.message}`);
        }
      }
    }

    // ========================================
    // 2. MARCAR BACKLOG
    // 1 día después de finalizar el entrenamiento
    // Para los que quedaron como NOT_ATTENDED
    // ========================================
    
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);
    
    const yesterdayEnd = new Date(yesterday);
    yesterdayEnd.setHours(23, 59, 59, 999);

    // Visiones BASIC que finalizaron ayer
    const visionesBasicFinalizadas = await prisma.vision.findMany({
      where: {
        endDate: {
          gte: yesterday,
          lte: yesterdayEnd
        }
      },
      select: { id: true, nombre: true, organizationId: true }
    });

    for (const vision of visionesBasicFinalizadas) {
      try {
        // Obtener enrollments individuales para poder crear tickets
        const enrollmentsToBacklog = await prisma.vision_enrollments.findMany({
          where: {
            visionId: vision.id,
            level: 'BASIC',
            attendanceStatus: 'NOT_ATTENDED'
          },
          select: { id: true, userId: true }
        });

        // Marcar todos como BACKLOG
        if (enrollmentsToBacklog.length > 0) {
          await prisma.vision_enrollments.updateMany({
            where: {
              id: { in: enrollmentsToBacklog.map(e => e.id) }
            },
            data: { attendanceStatus: 'BACKLOG' }
          });
          results.markedBacklog += enrollmentsToBacklog.length;

          // Crear tickets para el siguiente básico
          for (const enrollment of enrollmentsToBacklog) {
            const ticketResult = await createBacklogTicket(
              enrollment.userId,
              vision.id,
              vision.organizationId
            );
            
            if (ticketResult.success && ticketResult.ticketId) {
              results.backlogTicketsCreated++;
              console.log(`🎫 Ticket BACKLOG creado para usuario ${enrollment.userId} -> ${ticketResult.visionName}${ticketResult.isPendingAssignment ? ' (PENDIENTE)' : ''}`);
            } else if (ticketResult.alreadyUsedBacklog) {
              results.backlogTicketsAlreadyUsed++;
              console.log(`⚠️ Usuario ${enrollment.userId} ya usó su oportunidad BACKLOG`);
            } else {
              results.backlogTicketsFailed++;
              if (ticketResult.error) {
                results.errors.push(`Ticket BACKLOG usuario ${enrollment.userId}: ${ticketResult.error}`);
              }
            }
          }
        }
      } catch (error: any) {
        results.errors.push(`Error backlog BASIC visión ${vision.id}: ${error.message}`);
      }
    }

    // Visiones ADVANCED que finalizaron ayer
    const visionesAdvancedFinalizadas = await prisma.vision.findMany({
      where: {
        advancedEndDate: {
          gte: yesterday,
          lte: yesterdayEnd
        }
      },
      select: { id: true, nombre: true }
    });

    for (const vision of visionesAdvancedFinalizadas) {
      try {
        const updated = await prisma.vision_enrollments.updateMany({
          where: {
            visionId: vision.id,
            level: 'ADVANCED',
            attendanceStatus: 'NOT_ATTENDED'
          },
          data: { attendanceStatus: 'BACKLOG' }
        });
        results.markedBacklog += updated.count;
      } catch (error: any) {
        results.errors.push(`Error backlog ADVANCED visión ${vision.id}: ${error.message}`);
      }
    }

    // Visiones PL que finalizaron ayer (último fin de semana)
    const visionesPLFinalizadas = await prisma.vision.findMany({
      where: {
        plWeekend3EndDate: {
          gte: yesterday,
          lte: yesterdayEnd
        }
      },
      select: { id: true, nombre: true }
    });

    for (const vision of visionesPLFinalizadas) {
      try {
        const updated = await prisma.vision_enrollments.updateMany({
          where: {
            visionId: vision.id,
            level: 'PL',
            attendanceStatus: 'NOT_ATTENDED'
          },
          data: { attendanceStatus: 'BACKLOG' }
        });
        results.markedBacklog += updated.count;
      } catch (error: any) {
        results.errors.push(`Error backlog PL visión ${vision.id}: ${error.message}`);
      }
    }

    console.log('📊 Resultado de actualización automática de asistencia:', results);

    return NextResponse.json({
      success: true,
      message: 'Actualización de asistencia completada',
      results,
      timestamp: now.toISOString()
    });

  } catch (error: any) {
    console.error('❌ Error en cron de asistencia:', error);
    return NextResponse.json(
      { error: 'Error al procesar actualización de asistencia', message: error?.message },
      { status: 500 }
    );
  }
}

// GET para verificar estado del cron
export async function GET() {
  return NextResponse.json({
    status: 'ok',
    description: 'API de actualización automática de asistencia',
    actions: [
      'NOT_ATTENDED: Se marca a las 12:00 PM del día de inicio si no hay check-in',
      'BACKLOG: Se marca 1 día después de finalizar el entrenamiento para los NOT_ATTENDED'
    ],
    usage: 'POST con Authorization: Bearer <CRON_SECRET>'
  });
}
