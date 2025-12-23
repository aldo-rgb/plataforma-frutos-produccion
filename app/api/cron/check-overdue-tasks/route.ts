import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    // Verificar autorización (opcional - puedes agregar un token secreto)
    const { searchParams } = new URL(req.url);
    const secretKey = searchParams.get('key');
    
    // Si quieres proteger el endpoint, verifica una clave secreta
    // if (secretKey !== process.env.CRON_SECRET_KEY) {
    //   return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    // }

    console.log('🔍 Iniciando chequeo de tareas retrasadas...');

    const now = new Date();
    const threeDaysAgo = new Date(now);
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    // Buscar tareas con más de 3 días de retraso
    const overdueTasks = await prisma.taskInstance.findMany({
      where: {
        status: 'PENDING',
        OR: [
          {
            originalDueDate: {
              lt: threeDaysAgo
            }
          },
          {
            originalDueDate: null,
            dueDate: {
              lt: threeDaysAgo
            }
          }
        ]
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            assignedMentorId: true
          }
        },
        Accion: {
          include: {
            Meta: {
              select: {
                categoria: true
              }
            }
          }
        }
      }
    });

    console.log(`📊 Tareas retrasadas encontradas: ${overdueTasks.length}`);

    let alertsCreated = 0;
    let alertsSkipped = 0;

    for (const task of overdueTasks) {
      // Saltar si no tiene mentor asignado
      if (!task.Usuario.assignedMentorId) {
        alertsSkipped++;
        continue;
      }

      // Calcular días de retraso
      const baseDate = task.originalDueDate || task.dueDate;
      const daysOverdue = Math.floor((now.getTime() - baseDate.getTime()) / (1000 * 60 * 60 * 24));

      // Verificar si ya existe una alerta para esta tarea (no leída)
      const existingAlert = await prisma.mentorAlert.findFirst({
        where: {
          mentorId: task.Usuario.assignedMentorId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          message: {
            contains: 'días de retraso'
          },
          read: false
        }
      });

      if (existingAlert) {
        alertsSkipped++;
        continue;
      }

      // Crear alerta para el mentor
      await prisma.mentorAlert.create({
        data: {
          mentorId: task.Usuario.assignedMentorId,
          usuarioId: task.usuarioId,
          taskInstanceId: task.id,
          type: 'RISK_ALERT',
          message: `⏰ ${task.Usuario.nombre} tiene la tarea "${task.Accion.texto}" del área ${task.Accion.Meta.categoria} con ${daysOverdue} días de retraso sin reagendar.`,
          read: false
        }
      });

      alertsCreated++;
    }

    return NextResponse.json({
      success: true,
      message: 'Chequeo de tareas retrasadas completado',
      stats: {
        totalOverdue: overdueTasks.length,
        alertsCreated,
        alertsSkipped
      }
    });

  } catch (error) {
    console.error('Error checking overdue tasks:', error);
    return NextResponse.json(
      { error: 'Error al verificar tareas retrasadas' },
      { status: 500 }
    );
  }
}
