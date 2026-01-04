/**
 * MOTOR DE GENERACIÓN AUTOMÁTICA DE TAREAS
 * 
 * Este servicio toma una Carta F.R.U.T.O.S. aprobada y genera las task instances
 * basándose en la configuración de frecuencia de cada acción.
 * 
 * NUEVO: Soporta ciclos dinámicos (100 días personal vs visión grupal)
 */

import { prisma } from '@/lib/prisma';
import { addDays, getDay, format, startOfDay, endOfMonth, lastDayOfMonth } from 'date-fns';
import { calculateCycleDates, createEnrollment, canStartNewCycle } from './dateCalculator';

interface TaskGenerationResult {
  success: boolean;
  tasksCreated: number;
  errors?: string[];
}

interface ActionConfig {
  id: number;
  texto: string;
  metaId: number;
  frequency: string;
  assignedDays: number[];
  areaType: string;
  identityDeclaration: string;
  requiereEvidencia: boolean;
}

/**
 * Genera todas las tareas para una carta aprobada
 */
export async function generateTasksForLetter(cartaId: number): Promise<TaskGenerationResult> {
  try {
    console.log(`🚀 Iniciando generación de tareas para Carta #${cartaId}`);

    // 1. Obtener la carta con todas sus áreas, metas y acciones
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

    if (carta.estado !== 'APROBADA') {
      throw new Error(`Carta #${cartaId} no está aprobada (estado: ${carta.estado})`);
    }

    // 2. Verificar si ya existen tareas generadas para evitar duplicados
    const existingTasks = await prisma.taskInstance.count({
      where: {
        usuarioId: carta.usuarioId,
        Accion: {
          Meta: {
            cartaId: cartaId
          }
        }
      }
    });

    if (existingTasks > 0) {
      console.log(`⚠️ Ya existen ${existingTasks} tareas generadas para esta carta - Permitiendo regeneración`);
      // No retornar error - permitir regeneración
      // return {
      //   success: false,
      //   tasksCreated: 0,
      //   errors: [`Ya existen ${existingTasks} tareas generadas previamente`]
      // };
    }

    // 3. Aplanar todas las acciones de todas las áreas
    const allActions: ActionConfig[] = [];
    const areaTypes = [
      { key: 'finanzas', name: 'finanzas', declaration: carta.finanzasDeclaracion },
      { key: 'relaciones', name: 'relaciones', declaration: carta.relacionesDeclaracion },
      { key: 'talentos', name: 'talentos', declaration: carta.talentosDeclaracion },
      { key: 'salud', name: 'salud', declaration: carta.saludDeclaracion },
      { key: 'pazMental', name: 'pazMental', declaration: carta.pazMentalDeclaracion },
      { key: 'ocio', name: 'ocio', declaration: carta.ocioDeclaracion },
      { key: 'servicioTrans', name: 'servicioTrans', declaration: carta.servicioTransDeclaracion },
      { key: 'servicioComun', name: 'servicioComun', declaration: carta.servicioComunDeclaracion }
    ];

    for (const area of areaTypes) {
      const areaMetas = carta.Meta.filter(m => m.categoria === area.name);
      
      for (const meta of areaMetas) {
        for (const accion of meta.Accion) {
          // Incluir acciones con frecuencia válida
          // ONE_TIME puede tener assignedDays vacío - se crea al inicio del ciclo
          if (accion.frequency) {
            const hasValidDays = accion.assignedDays?.length > 0 || accion.frequency === 'ONE_TIME';
            
            if (hasValidDays) {
              allActions.push({
                id: accion.id,
                texto: accion.texto,
                metaId: meta.id,
                frequency: accion.frequency,
                assignedDays: accion.assignedDays || [],
                areaType: area.name,
                identityDeclaration: area.declaration || '',
                requiereEvidencia: accion.requiereEvidencia
              });
            }
          }
        }
      }
    }

    console.log(`📋 Encontradas ${allActions.length} acciones configuradas`);

    // 4. CALCULAR FECHAS DEL CICLO (DINÁMICO: 100 días o hasta fin de visión)
    const cycleDates = await calculateCycleDates(carta.usuarioId);
    
    console.log(`📅 Tipo de ciclo: ${cycleDates.cycleType}`);
    console.log(`📅 Inicio: ${format(cycleDates.startDate, 'yyyy-MM-dd')}`);
    console.log(`📅 Fin: ${format(cycleDates.endDate, 'yyyy-MM-dd')}`);
    console.log(`📅 Total de días: ${cycleDates.totalDays}`);
    if (cycleDates.visionName) {
      console.log(`📅 Visión: "${cycleDates.visionName}"`);
    }

    const startDate = cycleDates.startDate;
    const endDate = cycleDates.endDate;
    const tasksToCreate: any[] = [];

    for (const action of allActions) {
      let cursorDate = new Date(startDate);
      let taskNumber = 0;

      // ONE_TIME: solo una tarea en fecha específica o al inicio del ciclo
      if (action.frequency === 'ONE_TIME') {
        taskNumber++;
        
        // Usar specificDate si existe, sino usar startDate
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

        console.log(`  ✓ Tarea ONE_TIME: ${action.texto} - ${format(taskDate, 'yyyy-MM-dd (EEE)')}`);
        console.log(`  📊 ${action.texto}: 1 tarea generada`);
        continue; // Saltar el loop de días
      }

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

          console.log(`  ✓ Tarea #${taskNumber}: ${action.texto} - ${format(cursorDate, 'yyyy-MM-dd (EEE)')}`);
        }

        cursorDate = addDays(cursorDate, 1);
      }

      console.log(`  📊 ${action.texto}: ${taskNumber} tareas generadas`);
    }

    // 5. Inserción masiva en la base de datos
    console.log(`💾 Insertando ${tasksToCreate.length} tareas en la base de datos...`);
    
    // CRÍTICO: Usar formato de fecha local para evitar problemas de zona horaria
    // Convertir a formato YYYY-MM-DD sin información de hora para que PostgreSQL
    // lo interprete como medianoche local
    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T06:00:00.000Z`; // 6 AM UTC = Medianoche México
    };
    
    const tasksToInsert = tasksToCreate.map(task => ({
      ...task,
      dueDate: formatDateForDB(task.dueDate),
      originalDueDate: formatDateForDB(task.originalDueDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));
    
    const result = await prisma.taskInstance.createMany({
      data: tasksToInsert,
      skipDuplicates: true
    });

    console.log(`✅ Generación completada: ${result.count} tareas creadas`);

    // 6. Actualizar carta con fecha de actualización
    await prisma.cartaFrutos.update({
      where: { id: cartaId },
      data: { 
        fechaActualizacion: new Date()
      }
    });

    // 7. Crear inscripción (enrollment) si no existe
    const canStart = await canStartNewCycle(carta.usuarioId);
    if (canStart.canStart) {
      await createEnrollment(carta.usuarioId, cycleDates);
      console.log(`📝 Enrollment creado: ${cycleDates.cycleType} (${cycleDates.totalDays} días)`);
    } else {
      console.log(`⚠️ Enrollment ya existe: ${canStart.reason}`);
    }

    return {
      success: true,
      tasksCreated: result.count
    };

  } catch (error: any) {
    console.error('❌ Error generando tareas:', error);
    return {
      success: false,
      tasksCreated: 0,
      errors: [error.message]
    };
  }
}

/**
 * Determina si se debe crear una tarea en una fecha específica
 * basándose en la configuración de frecuencia
 */
function shouldCreateTaskOnDate(action: ActionConfig, date: Date): boolean {
  const dayOfWeek = getDay(date); // 0=Domingo, 1=Lunes, ..., 6=Sábado
  const dayOfMonth = date.getDate();

  switch (action.frequency) {
    case 'DAILY':
      // Todos los días
      return true;

    case 'WEEKLY':
      // Solo en los días seleccionados de la semana
      return action.assignedDays.includes(dayOfWeek);

    case 'BIWEEKLY':
      // Cada 2 semanas en los días seleccionados
      const weekNumber = Math.floor((date.getTime() - new Date(date.getFullYear(), 0, 1).getTime()) / (7 * 24 * 60 * 60 * 1000));
      return weekNumber % 2 === 0 && action.assignedDays.includes(dayOfWeek);

    case 'MONTHLY':
      // Una vez al mes en el día específico
      // assignedDays[0] contiene el día del mes (-1 = último día)
      const targetDay = action.assignedDays[0];
      if (targetDay === -1) {
        // Último día del mes
        return dayOfMonth === lastDayOfMonth(date).getDate();
      }
      return dayOfMonth === targetDay;

    case 'ONE_TIME':
      // Tarea única - solo se crea al inicio del ciclo (primera iteración)
      // El generador solo debe llamar esta función una vez para ONE_TIME
      return true;

    default:
      console.warn(`⚠️ Frecuencia desconocida: ${action.frequency}`);
      return false;
  }
}

/**
 * Valida que una carta está lista para generar tareas
 */
export async function validateCartaForGeneration(cartaId: number): Promise<{ valid: boolean; errors: string[] }> {
  const errors: string[] = [];

  const carta = await prisma.cartaFrutos.findUnique({
    where: { id: cartaId },
    include: {
      Meta: {
        include: {
          Accion: true
        }
      }
    }
  });

  if (!carta) {
    errors.push('Carta no encontrada');
    return { valid: false, errors };
  }

  if (carta.estado !== 'APROBADA') {
    errors.push(`La carta debe estar en estado APROBADA (actual: ${carta.estado})`);
  }

  // Verificar que cada área tenga al menos una acción configurada
  const actionCount = carta.Meta.reduce((count, meta) => {
    return count + meta.Accion.filter(a => a.frequency && a.assignedDays?.length > 0).length;
  }, 0);

  if (actionCount === 0) {
    errors.push('No hay acciones configuradas con frecuencia');
  }

  // Verificar que las declaraciones de identidad estén completas
  const requiredDeclarations = [
    carta.finanzasDeclaracion,
    carta.relacionesDeclaracion,
    carta.talentosDeclaracion,
    carta.saludDeclaracion,
    carta.pazMentalDeclaracion,
    carta.ocioDeclaracion
  ];

  const missingDeclarations = requiredDeclarations.filter(d => !d || d.trim() === '').length;
  if (missingDeclarations > 0) {
    errors.push(`Faltan ${missingDeclarations} declaraciones de identidad`);
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Obtiene estadísticas de tareas generadas para una carta
 */
export async function getTaskStats(cartaId: number) {
  const carta = await prisma.cartaFrutos.findUnique({
    where: { id: cartaId },
    include: {
      Meta: {
        include: {
          Accion: {
            include: {
              TaskInstance: true
            }
          }
        }
      }
    }
  });

  if (!carta) return null;

  const stats = {
    totalTasks: 0,
    tasksByArea: {} as Record<string, number>,
    tasksByFrequency: {} as Record<string, number>,
    pendingTasks: 0,
    completedTasks: 0
  };

  carta.Meta.forEach(meta => {
    const areaType = meta.categoria;
    stats.tasksByArea[areaType] = 0;

    meta.Accion.forEach(accion => {
      const taskCount = accion.TaskInstance.length;
      stats.totalTasks += taskCount;
      stats.tasksByArea[areaType] += taskCount;

      if (accion.frequency) {
        stats.tasksByFrequency[accion.frequency] = (stats.tasksByFrequency[accion.frequency] || 0) + taskCount;
      }

      stats.pendingTasks += accion.TaskInstance.filter(t => t.status === 'PENDING').length;
      stats.completedTasks += accion.TaskInstance.filter(t => t.status === 'COMPLETED').length;
    });
  });

  return stats;
}

/**
 * Genera tareas adicionales para un rango de fechas específico
 * Útil para extensiones de visión
 */
export async function generateAdditionalTasks(
  userId: number,
  fromDate: Date,
  toDate: Date
): Promise<TaskGenerationResult> {
  try {
    console.log(`🔄 Generando tareas adicionales para Usuario #${userId}`);
    console.log(`📅 Desde: ${format(fromDate, 'yyyy-MM-dd')} hasta ${format(toDate, 'yyyy-MM-dd')}`);

    // Obtener la carta aprobada del usuario
    const carta = await prisma.cartaFrutos.findFirst({
      where: {
        usuarioId: userId,
        estado: 'APROBADA'
      },
      include: {
        Meta: {
          include: {
            Accion: true
          }
        }
      }
    });

    if (!carta) {
      throw new Error(`Usuario #${userId} no tiene carta aprobada`);
    }

    // Aplanar acciones
    const allActions: ActionConfig[] = [];
    const areaTypes = [
      { key: 'finanzas', name: 'FINANZAS', declaration: carta.finanzasDeclaracion },
      { key: 'relaciones', name: 'RELACIONES', declaration: carta.relacionesDeclaracion },
      { key: 'talentos', name: 'TALENTOS', declaration: carta.talentosDeclaracion },
      { key: 'salud', name: 'SALUD', declaration: carta.saludDeclaracion },
      { key: 'pazMental', name: 'PAZ_MENTAL', declaration: carta.pazMentalDeclaracion },
      { key: 'ocio', name: 'OCIO', declaration: carta.ocioDeclaracion },
      { key: 'servicioTrans', name: 'SERVICIO_TRANS', declaration: carta.servicioTransDeclaracion },
      { key: 'servicioComun', name: 'SERVICIO_COMUN', declaration: carta.servicioComunDeclaracion }
    ];

    for (const area of areaTypes) {
      const areaMetas = carta.Meta.filter(m => m.categoria === area.name);
      
      for (const meta of areaMetas) {
        for (const accion of meta.Accion) {
          if (accion.frequency && accion.assignedDays?.length > 0) {
            allActions.push({
              id: accion.id,
              texto: accion.texto,
              metaId: meta.id,
              frequency: accion.frequency,
              assignedDays: accion.assignedDays,
              areaType: area.name,
              identityDeclaration: area.declaration || '',
              requiereEvidencia: accion.requiereEvidencia
            });
          }
        }
      }
    }

    // Generar tareas para el rango adicional
    const tasksToCreate: any[] = [];

    for (const action of allActions) {
      let cursorDate = new Date(fromDate);
      let taskNumber = 0;

      while (cursorDate <= toDate) {
        const shouldCreate = shouldCreateTaskOnDate(action, cursorDate);

        if (shouldCreate) {
          taskNumber++;
          tasksToCreate.push({
            usuarioId: userId,
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

      if (taskNumber > 0) {
        console.log(`  📊 ${action.texto}: ${taskNumber} tareas adicionales`);
      }
    }

    // Insertar
    const formatDateForDB = (date: Date) => {
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}T06:00:00.000Z`; // 6 AM UTC = Medianoche México
    };

    const tasksToInsert = tasksToCreate.map(task => ({
      ...task,
      dueDate: formatDateForDB(task.dueDate),
      originalDueDate: formatDateForDB(task.originalDueDate),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }));

    const result = await prisma.taskInstance.createMany({
      data: tasksToInsert,
      skipDuplicates: true
    });

    console.log(`✅ ${result.count} tareas adicionales creadas`);

    return {
      success: true,
      tasksCreated: result.count
    };

  } catch (error: any) {
    console.error('❌ Error generando tareas adicionales:', error);
    return {
      success: false,
      tasksCreated: 0,
      errors: [error.message]
    };
  }
}

