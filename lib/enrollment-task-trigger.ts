/**
 * TRIGGER AUTOMÁTICO DE TAREAS DE ENROLAMIENTO
 * 
 * Este módulo detecta cuando un invitado asiste a su primer entrenamiento
 * y automáticamente completa una tarea de enrolamiento del invitador.
 * 
 * Flujo:
 * 1. Usuario A invita a Usuario B (invitedBy = A)
 * 2. Usuario B asiste al entrenamiento BASIC (attendanceStatus = 'ATTENDED')
 *    O Usuario B se registra con código de referido de A
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
 * Completa una tarea de enrolamiento cuando un nuevo usuario se registra con código de referido
 * 
 * @param newUserId - ID del nuevo usuario registrado
 * @param inviterId - ID del usuario que invitó (referrer)
 * @param guestName - Nombre del nuevo usuario
 * @returns Resultado del trigger
 */
export async function triggerEnrollmentTaskOnRegistration(
  newUserId: number,
  inviterId: number,
  guestName: string
): Promise<EnrollmentTriggerResult> {
  try {
    console.log(`🎯 Trigger de enrolamiento por registro para invitador ${inviterId}, nuevo usuario ${newUserId}`);

    // Obtener datos del invitador
    const inviter = await prisma.usuario.findUnique({
      where: { id: inviterId },
      select: { id: true, nombre: true }
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

    // Actualizar la tarea: marcar como completada
    const newTaskText = `${taskOrder}- ${guestName}`;
    
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

    console.log(`✅ Tarea de enrolamiento completada por registro:`);
    console.log(`   - TaskInstance ID: ${targetTask.id}`);
    console.log(`   - Invitador: ${inviter.nombre}`);
    console.log(`   - Nuevo usuario: ${guestName}`);
    console.log(`   - Nuevo texto: "${newTaskText}"`);

    return {
      success: true,
      taskCompleted: true,
      taskId: targetTask.id,
      inviterName: inviter.nombre,
      guestName: guestName,
      message: `Tarea completada: ${inviter.nombre} enroló a ${guestName}`
    };

  } catch (error) {
    console.error('❌ Error en triggerEnrollmentTaskOnRegistration:', error);
    return {
      success: false,
      taskCompleted: false,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

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

/**
 * Sincroniza retroactivamente las tareas de enrolamiento de un usuario
 * basándose en su invitedCount actual
 * 
 * @param userId - ID del usuario cuyas tareas se sincronizarán
 * @returns Resultado de la sincronización
 */
export async function syncEnrollmentTasksForUser(userId: number): Promise<{
  success: boolean;
  tasksCompleted: number;
  message: string;
}> {
  try {
    console.log(`🔄 Sincronizando tareas de enrolamiento para usuario ${userId}`);

    // Obtener datos del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, invitedCount: true }
    });

    if (!user) {
      return { success: false, tasksCompleted: 0, message: 'Usuario no encontrado' };
    }

    // Obtener lista de invitados reales
    const invitados = await prisma.usuario.findMany({
      where: { invitedBy: userId },
      select: { id: true, nombre: true, createdAt: true },
      orderBy: { createdAt: 'asc' }
    });

    const invitedCount = invitados.length;
    console.log(`👥 Usuario ${user.nombre} tiene ${invitedCount} invitados reales`);

    if (invitedCount === 0) {
      return { success: true, tasksCompleted: 0, message: 'Usuario no tiene invitados' };
    }

    // Buscar la carta del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: { usuarioId: userId },
      select: { id: true }
    });

    if (!carta) {
      return { success: true, tasksCompleted: 0, message: 'Usuario no tiene carta de frutos' };
    }

    // Buscar todas las tareas de servicioTrans
    const servicioTransMetas = await prisma.meta.findMany({
      where: {
        cartaId: carta.id,
        categoria: 'servicioTrans'
      },
      include: {
        Accion: {
          include: {
            TaskInstance: {
              where: { usuarioId: userId },
              orderBy: { dueDate: 'asc' }
            }
          }
        }
      }
    });

    // Recopilar todas las tareas ordenadas
    const allTasks: { taskId: number; accionId: number; status: string }[] = [];
    for (const meta of servicioTransMetas) {
      for (const accion of meta.Accion) {
        for (const task of accion.TaskInstance) {
          allTasks.push({
            taskId: task.id,
            accionId: accion.id,
            status: task.status
          });
        }
      }
    }

    // Contar tareas ya completadas
    const completedCount = allTasks.filter(t => t.status === 'COMPLETED').length;
    const pendingTasks = allTasks.filter(t => t.status === 'PENDING');

    // Calcular cuántas tareas faltan por completar
    const tasksToComplete = Math.min(invitedCount - completedCount, pendingTasks.length);
    
    console.log(`📊 Estado actual: ${completedCount} completadas, ${pendingTasks.length} pendientes, ${tasksToComplete} por sincronizar`);

    if (tasksToComplete <= 0) {
      return { 
        success: true, 
        tasksCompleted: 0, 
        message: `Las tareas ya están sincronizadas (${completedCount}/${invitedCount})` 
      };
    }

    // Completar las tareas pendientes
    let completed = 0;
    for (let i = 0; i < tasksToComplete; i++) {
      const task = pendingTasks[i];
      const invitado = invitados[completedCount + i];
      
      if (!task || !invitado) break;

      const taskOrder = completedCount + i + 1;
      const newTaskText = `${taskOrder}- ${invitado.nombre}`;

      await prisma.taskInstance.update({
        where: { id: task.taskId },
        data: {
          status: 'COMPLETED',
          completedAt: invitado.createdAt, // Usar fecha de registro del invitado
          updatedAt: new Date()
        }
      });

      await prisma.accion.update({
        where: { id: task.accionId },
        data: {
          texto: newTaskText,
          completada: true,
          lastCompletedDate: invitado.createdAt,
          updatedAt: new Date()
        }
      });

      console.log(`   ✅ Tarea ${task.taskId} completada: "${newTaskText}"`);
      completed++;
    }

    return {
      success: true,
      tasksCompleted: completed,
      message: `Sincronizadas ${completed} tareas de enrolamiento para ${user.nombre}`
    };

  } catch (error) {
    console.error('❌ Error en syncEnrollmentTasksForUser:', error);
    return {
      success: false,
      tasksCompleted: 0,
      message: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
}

/**
 * Sincroniza todas las tareas de enrolamiento para todos los usuarios
 * que tienen invitados pero tareas pendientes desincronizadas
 */
export async function syncAllEnrollmentTasks(): Promise<{
  success: boolean;
  usersProcessed: number;
  totalTasksCompleted: number;
  errors: string[];
}> {
  console.log('🔄 Iniciando sincronización masiva de tareas de enrolamiento...');
  
  const errors: string[] = [];
  let usersProcessed = 0;
  let totalTasksCompleted = 0;

  try {
    // Buscar usuarios que tienen invitados
    const usersWithInvitees = await prisma.usuario.findMany({
      where: {
        OR: [
          { invitedCount: { gt: 0 } },
          // También buscar por relación directa por si invitedCount está desactualizado
        ]
      },
      select: { id: true, nombre: true }
    });

    // También incluir usuarios que tienen invitados por relación pero invitedCount = 0
    const userIdsWithInvitees = await prisma.usuario.groupBy({
      by: ['invitedBy'],
      where: { invitedBy: { not: null } },
      _count: true
    });

    const allUserIds = new Set<number>();
    usersWithInvitees.forEach(u => allUserIds.add(u.id));
    userIdsWithInvitees.forEach(g => g.invitedBy && allUserIds.add(g.invitedBy));

    console.log(`📋 Encontrados ${allUserIds.size} usuarios con posibles invitados`);

    for (const userId of allUserIds) {
      try {
        const result = await syncEnrollmentTasksForUser(userId);
        usersProcessed++;
        totalTasksCompleted += result.tasksCompleted;
        
        if (result.tasksCompleted > 0) {
          console.log(`   ${result.message}`);
        }
      } catch (err) {
        const errorMsg = `Error sincronizando usuario ${userId}: ${err}`;
        errors.push(errorMsg);
        console.error(errorMsg);
      }
    }

    console.log(`✅ Sincronización completada: ${usersProcessed} usuarios, ${totalTasksCompleted} tareas`);

    return {
      success: true,
      usersProcessed,
      totalTasksCompleted,
      errors
    };

  } catch (error) {
    console.error('❌ Error en syncAllEnrollmentTasks:', error);
    return {
      success: false,
      usersProcessed,
      totalTasksCompleted,
      errors: [...errors, `Error general: ${error}`]
    };
  }
}
