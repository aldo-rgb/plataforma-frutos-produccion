/**
 * TRIGGER AUTOMÁTICO DE TAREAS DE ENROLAMIENTO
 * 
 * Este módulo detecta cuando un invitado asiste a su primer entrenamiento
 * y automáticamente completa una tarea de enrolamiento del invitador.
 * 
 * Flujo:
 * 1. Usuario A invita a Usuario B (invitedBy = A)
 * 2. Usuario B asiste al entrenamiento BASIC (attendanceStatus = 'ATTENDED')
 * 3. Sistema busca tareas de enrolamiento de Usuario A (área servicioTrans)
 * 4. Sistema completa una tarea y actualiza el texto con el nombre del invitado
 */

import { prisma } from './prisma';

interface EnrollmentTriggerResult {
  success: boolean;
  taskCompleted: boolean;
  taskId?: number;
  inviterName?: string;
  guestName?: string;
  message: string;
}

/**
 * Completa automáticamente una tarea de enrolamiento cuando un invitado asiste
 * 
 * @param guestUserId - ID del usuario que acaba de asistir (el invitado)
 * @param enrollmentLevel - Nivel del enrollment ('BASIC', 'ADVANCED', 'PL')
 * @returns Resultado del trigger
 */
export async function triggerEnrollmentTaskCompletion(
  guestUserId: number,
  enrollmentLevel: string
): Promise<EnrollmentTriggerResult> {
  try {
    console.log(`🎯 Trigger de enrolamiento iniciado para usuario ${guestUserId}, nivel ${enrollmentLevel}`);

    // Solo procesar si es el primer entrenamiento (BASIC)
    if (enrollmentLevel !== 'BASIC') {
      console.log(`⏭️ Saltando trigger - nivel ${enrollmentLevel} no es BASIC`);
      return {
        success: true,
        taskCompleted: false,
        message: 'Solo se procesa para nivel BASIC'
      };
    }

    // Obtener datos del invitado
    const guest = await prisma.usuario.findUnique({
      where: { id: guestUserId },
      select: {
        id: true,
        nombre: true,
        invitedBy: true
      }
    });

    if (!guest) {
      console.log(`❌ Usuario ${guestUserId} no encontrado`);
      return {
        success: false,
        taskCompleted: false,
        message: 'Usuario no encontrado'
      };
    }

    // Verificar si tiene invitador
    if (!guest.invitedBy) {
      console.log(`⏭️ Usuario ${guest.nombre} no tiene invitador (invitedBy es null)`);
      return {
        success: true,
        taskCompleted: false,
        message: 'Usuario no fue invitado por nadie'
      };
    }

    const inviterId = guest.invitedBy;
    console.log(`👤 Invitador encontrado: ID ${inviterId}`);

    // Obtener datos del invitador
    const inviter = await prisma.usuario.findUnique({
      where: { id: inviterId },
      select: {
        id: true,
        nombre: true
      }
    });

    if (!inviter) {
      console.log(`❌ Invitador ${inviterId} no encontrado`);
      return {
        success: false,
        taskCompleted: false,
        message: 'Invitador no encontrado'
      };
    }

    // Buscar la carta del invitador
    const inviterCarta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: inviterId },
      select: { id: true }
    });

    if (!inviterCarta) {
      console.log(`⏭️ Invitador ${inviter.nombre} no tiene carta de frutos`);
      return {
        success: true,
        taskCompleted: false,
        message: 'Invitador no tiene carta de frutos'
      };
    }

    // Buscar metas de SERVICIO TRANSFORMACIONAL del invitador
    const servicioTransMetas = await prisma.meta.findMany({
      where: {
        cartaId: inviterCarta.id,
        categoria: 'servicioTrans'
      },
      include: {
        Accion: {
          include: {
            TaskInstance: {
              where: {
                usuarioId: inviterId,
                status: 'PENDING'
              },
              orderBy: { dueDate: 'asc' }
            }
          }
        }
      }
    });

    if (servicioTransMetas.length === 0) {
      console.log(`⏭️ Invitador ${inviter.nombre} no tiene metas de servicioTrans`);
      return {
        success: true,
        taskCompleted: false,
        message: 'Invitador no tiene tareas de enrolamiento'
      };
    }

    // Buscar la primera tarea pendiente de enrolamiento
    let targetTask: { id: number; accionId: number; texto: string } | null = null;
    let taskOrder = 0;

    for (const meta of servicioTransMetas) {
      for (const accion of meta.Accion) {
        // Contar cuántas tareas ya se completaron para determinar el orden
        const completedTasks = await prisma.taskInstance.count({
          where: {
            accionId: accion.id,
            usuarioId: inviterId,
            status: 'COMPLETED'
          }
        });

        // La siguiente tarea pendiente
        const pendingTask = accion.TaskInstance[0];
        if (pendingTask && !targetTask) {
          taskOrder = completedTasks + 1;
          targetTask = {
            id: pendingTask.id,
            accionId: accion.id,
            texto: accion.texto
          };
          break;
        }
      }
      if (targetTask) break;
    }

    if (!targetTask) {
      console.log(`⏭️ No hay tareas de enrolamiento pendientes para ${inviter.nombre}`);
      return {
        success: true,
        taskCompleted: false,
        message: 'Todas las tareas de enrolamiento ya están completadas'
      };
    }

    // Actualizar la tarea: marcar como completada y cambiar el texto
    const newTaskText = `${taskOrder}- ${guest.nombre}`;
    
    await prisma.taskInstance.update({
      where: { id: targetTask.id },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        updatedAt: new Date()
      }
    });

    // Actualizar el texto de la acción para reflejar quién fue enrolado
    await prisma.accion.update({
      where: { id: targetTask.accionId },
      data: {
        texto: newTaskText,
        completada: true,
        lastCompletedDate: new Date(),
        updatedAt: new Date()
      }
    });

    console.log(`✅ Tarea de enrolamiento completada automáticamente:`);
    console.log(`   - TaskInstance ID: ${targetTask.id}`);
    console.log(`   - Invitador: ${inviter.nombre}`);
    console.log(`   - Invitado: ${guest.nombre}`);
    console.log(`   - Nuevo texto: "${newTaskText}"`);

    return {
      success: true,
      taskCompleted: true,
      taskId: targetTask.id,
      inviterName: inviter.nombre,
      guestName: guest.nombre,
      message: `Tarea completada: ${inviter.nombre} enroló a ${guest.nombre}`
    };

  } catch (error) {
    console.error('❌ Error en triggerEnrollmentTaskCompletion:', error);
    return {
      success: false,
      taskCompleted: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Verifica si una tarea es de enrolamiento (área servicioTrans)
 * Usado para bloquear el completado manual
 */
export async function isEnrollmentTask(taskInstanceId: number): Promise<boolean> {
  try {
    const task = await prisma.taskInstance.findUnique({
      where: { id: taskInstanceId },
      include: {
        Accion: {
          include: {
            Meta: {
              select: { categoria: true }
            }
          }
        }
      }
    });

    if (!task?.Accion?.Meta) {
      return false;
    }

    return task.Accion.Meta.categoria === 'servicioTrans';
  } catch (error) {
    console.error('Error verificando si es tarea de enrolamiento:', error);
    return false;
  }
}
