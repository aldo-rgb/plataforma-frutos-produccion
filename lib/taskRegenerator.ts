/**
 * REGENERADOR INTELIGENTE DE TAREAS
 * 
 * Cuando un mentor aprueba una carta después de CAMBIOS_REQUERIDOS,
 * este módulo identifica qué acciones fueron modificadas y regenera
 * SOLO esas tareas, manteniendo las tareas de acciones no modificadas.
 */

import { prisma } from '@/lib/prisma';
import { addDays, getDay, format, lastDayOfMonth } from 'date-fns';

interface RegenerationResult {
  success: boolean;
  actionsRegenerated: number;
  tasksDeleted: number;
  tasksCreated: number;
  errors?: string[];
}

interface ActionConfig {
  id: number;
  texto: string;
  metaId: number;
  frequency: string;
  assignedDays: number[];
  specificDate: Date | null;
  requiereEvidencia: boolean;
}

/**
 * Regenera tareas solo para acciones modificadas después de la última aprobación
 */
export async function regenerateModifiedTasks(cartaId: number): Promise<RegenerationResult> {
  try {
    console.log(`🔄 Iniciando regeneración inteligente para Carta #${cartaId}`);

    // 1. Obtener la carta con sus datos de aprobación
    const carta = await prisma.cartaFrutos.findUnique({
      where: { id: cartaId },
      include: {
        Usuario: true,
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    if (!carta) {
      throw new Error(`Carta #${cartaId} no encontrada`);
    }

    // 2. Obtener la fecha de la última aprobación (approvedAt)
    const lastApprovalDate = carta.approvedAt;
    
    if (!lastApprovalDate) {
      console.log('⚠️ No hay fecha de aprobación previa - Generación inicial');
      // Si no hay aprobación previa, usar generación normal
      return {
        success: false,
        actionsRegenerated: 0,
        tasksDeleted: 0,
        tasksCreated: 0,
        errors: ['No hay aprobación previa - usar generación normal']
      };
    }

    console.log(`📅 Última aprobación: ${format(lastApprovalDate, 'yyyy-MM-dd HH:mm')}`);

    // 3. Identificar acciones modificadas después de la última aprobación
    const modifiedActions: ActionConfig[] = [];
    
    for (const meta of carta.Meta) {
      for (const accion of meta.Accion) {
        // Comparar updatedAt con lastApprovalDate
        if (accion.updatedAt > lastApprovalDate) {
          console.log(`🔄 Acción modificada: "${accion.texto}" (${format(accion.updatedAt, 'yyyy-MM-dd HH:mm')})`);
          
          if (accion.frequency) {
            const hasValidDays = accion.assignedDays?.length > 0 || accion.frequency === 'ONE_TIME';
            
            if (hasValidDays) {
              modifiedActions.push({
                id: accion.id,
                texto: accion.texto,
                metaId: meta.id,
                frequency: accion.frequency,
                assignedDays: accion.assignedDays || [],
                specificDate: accion.specificDate,
                requiereEvidencia: accion.requiereEvidencia
              });
            }
          }
        }
      }
    }

    console.log(`📋 Encontradas ${modifiedActions.length} acciones modificadas`);

    if (modifiedActions.length === 0) {
      console.log('✅ No hay acciones modificadas - No se requiere regeneración');
      return {
        success: true,
        actionsRegenerated: 0,
        tasksDeleted: 0,
        tasksCreated: 0
      };
    }

    // 4. Obtener la fecha de inicio del ciclo (fecha de contratación de Lobo Solitario)
    const packageOrder = await prisma.mentorPackageOrder.findFirst({
      where: {
        usuarioId: carta.usuarioId,
        status: 'COMPLETED'
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!packageOrder) {
      throw new Error('No se encontró orden de paquete completada');
    }

    const startDate = packageOrder.createdAt; // Fecha de contratación
    const endDate = addDays(startDate, 63); // 63 días = 9 semanas

    console.log(`📅 Fecha de contratación: ${format(startDate, 'yyyy-MM-dd')}`);
    console.log(`📅 Fin del ciclo: ${format(endDate, 'yyyy-MM-dd')}`);

    let totalDeleted = 0;
    let totalCreated = 0;

    // 5. Para cada acción modificada: eliminar tareas existentes y regenerar
    for (const action of modifiedActions) {
      console.log(`\n🔄 Procesando: "${action.texto}"`);

      // 5.1 Eliminar tareas existentes de esta acción
      const deleteResult = await prisma.taskInstance.deleteMany({
        where: {
          accionId: action.id,
          usuarioId: carta.usuarioId
        }
      });

      totalDeleted += deleteResult.count;
      console.log(`  🗑️ Eliminadas ${deleteResult.count} tareas antiguas`);

      // 5.2 Regenerar tareas desde la fecha de contratación
      const tasksToCreate: any[] = [];
      let cursorDate = new Date(startDate);
      let taskNumber = 0;

      // ONE_TIME: solo una tarea
      if (action.frequency === 'ONE_TIME') {
        taskNumber++;
        
        const taskDate = action.specificDate 
          ? new Date(action.specificDate)
          : new Date(startDate);
        
        tasksToCreate.push({
          usuarioId: carta.usuarioId,
          accionId: action.id,
          dueDate: taskDate,
          originalDueDate: taskDate,
          status: 'PENDING',
          evidenceStatus: action.requiereEvidencia ? 'NONE' : undefined,
          postponeCount: 0,
          createdAt: new Date(),
          updatedAt: new Date()
        });

        console.log(`  ✓ Tarea ONE_TIME: ${format(taskDate, 'yyyy-MM-dd')}`);
      } else {
        // RECURRING TASKS: iterar por todos los días del ciclo
        while (cursorDate <= endDate) {
          const shouldCreate = shouldCreateTaskOnDate(action, cursorDate);

          if (shouldCreate) {
            taskNumber++;
            
            tasksToCreate.push({
              usuarioId: carta.usuarioId,
              accionId: action.id,
              dueDate: new Date(cursorDate),
              originalDueDate: new Date(cursorDate),
              status: 'PENDING',
              evidenceStatus: action.requiereEvidencia ? 'NONE' : undefined,
              postponeCount: 0,
              createdAt: new Date(),
              updatedAt: new Date()
            });
          }

          cursorDate = addDays(cursorDate, 1);
        }
      }

      // 5.3 Insertar las nuevas tareas
      if (tasksToCreate.length > 0) {
        const tasksToInsert = tasksToCreate.map(task => ({
          ...task,
          dueDate: task.dueDate.toISOString(),
          originalDueDate: task.originalDueDate.toISOString(),
          createdAt: task.createdAt.toISOString(),
          updatedAt: task.updatedAt.toISOString()
        }));
        
        const result = await prisma.taskInstance.createMany({
          data: tasksToInsert,
          skipDuplicates: true
        });

        totalCreated += result.count;
        console.log(`  ✅ Creadas ${result.count} tareas nuevas`);
      }
    }

    console.log(`\n✅ Regeneración completada:`);
    console.log(`   - Acciones regeneradas: ${modifiedActions.length}`);
    console.log(`   - Tareas eliminadas: ${totalDeleted}`);
    console.log(`   - Tareas creadas: ${totalCreated}`);

    return {
      success: true,
      actionsRegenerated: modifiedActions.length,
      tasksDeleted: totalDeleted,
      tasksCreated: totalCreated
    };

  } catch (error: any) {
    console.error('❌ Error regenerando tareas:', error);
    return {
      success: false,
      actionsRegenerated: 0,
      tasksDeleted: 0,
      tasksCreated: 0,
      errors: [error.message]
    };
  }
}

/**
 * Determina si se debe crear una tarea en una fecha específica
 */
function shouldCreateTaskOnDate(action: ActionConfig, date: Date): boolean {
  const dayOfWeek = getDay(date); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const dayOfMonth = date.getDate();

  switch (action.frequency) {
    case 'DAILY':
      return true;

    case 'WEEKLY':
      return action.assignedDays.includes(dayOfWeek);

    case 'BIWEEKLY':
      const weekNumber = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weekNumber % 2 === 0 && action.assignedDays.includes(dayOfWeek);

    case 'MONTHLY':
      const targetDay = action.assignedDays[0];
      if (targetDay === -1) {
        return dayOfMonth === lastDayOfMonth(date).getDate();
      }
      return dayOfMonth === targetDay;

    case 'ONE_TIME':
      return true;

    default:
      console.warn(`⚠️ Frecuencia desconocida: ${action.frequency}`);
      return false;
  }
}
