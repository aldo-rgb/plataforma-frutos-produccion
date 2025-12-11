// utils/task-filter.ts
// Utilidades para filtrado Things-like de tareas

// Mapeo de códigos de días a índices de JavaScript (0=Domingo, 6=Sábado)
const DAY_MAP = {
    'SU': 0, 'MO': 1, 'TU': 2, 'WE': 3, 'TH': 4, 'FR': 5, 'SA': 6
};

// Mapeo de nombres en español a índices
const DAY_NAME_MAP: { [key: string]: number } = {
    'domingo': 0,
    'lunes': 1,
    'martes': 2,
    'miércoles': 3,
    'miercoles': 3, // Sin acento
    'jueves': 4,
    'viernes': 5,
    'sábado': 6,
    'sabado': 6, // Sin acento
};

// Función auxiliar para obtener el día de la semana (0=Dom, 1=Lun, ..., 6=Sab)
const getDayOfWeek = (date: Date) => date.getDay();

// Función para normalizar nombres de días a índices
export const dayNameToIndex = (dayName: string): number => {
    const normalized = dayName.toLowerCase().trim();
    return DAY_NAME_MAP[normalized] ?? -1;
};

// Función para obtener el índice del día actual
export const getTodayIndex = (): number => {
    return getDayOfWeek(new Date());
};

// Función para verificar si una fecha es hoy
export const isToday = (date: Date): boolean => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
};

// Función para verificar si una fecha es anterior a hoy
export const isBeforeToday = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const compareDate = new Date(date);
    compareDate.setHours(0, 0, 0, 0);
    return compareDate < today;
};

// 🚨 FUNCIÓN PRINCIPAL: Determina si una tarea debe mostrarse HOY
export const shouldShowTaskToday = (tarea: any): boolean => {
    // Si no tiene días programados, no la mostramos
    if (!tarea.scheduledDays || tarea.scheduledDays.length === 0) {
        return false;
    }

    const today = new Date();
    const todayIndex = getDayOfWeek(today);
    
    // Convertir los días programados a índices
    const scheduledIndices = tarea.scheduledDays
        .map((day: string) => dayNameToIndex(day))
        .filter((index: number) => index !== -1);

    if (scheduledIndices.length === 0) {
        return false;
    }

    // Si está programada para hoy
    const isScheduledToday = scheduledIndices.includes(todayIndex);
    
    // Si fue completada hoy, no la mostramos
    if (tarea.lastCompletedDate) {
        const lastCompleted = new Date(tarea.lastCompletedDate);
        if (isToday(lastCompleted)) {
            return false; // Ya la completó hoy
        }
    }
    
    // Mostrar si está programada para hoy
    if (isScheduledToday) {
        return true;
    }
    
    // 🚨 LÓGICA DE VENCIMIENTO: Verificar si está vencida
    // (programada para días anteriores de esta semana y no completada)
    for (const scheduledIndex of scheduledIndices) {
        // Si el día programado es anterior en la semana
        if (scheduledIndex < todayIndex) {
            // Si nunca se ha completado, está vencida
            if (!tarea.lastCompletedDate) {
                return true;
            }
            
            // Calcular la fecha del día programado en esta semana
            const scheduledDate = new Date(today);
            scheduledDate.setDate(today.getDate() - (todayIndex - scheduledIndex));
            scheduledDate.setHours(0, 0, 0, 0);
            
            const lastCompleted = new Date(tarea.lastCompletedDate);
            lastCompleted.setHours(0, 0, 0, 0);
            
            // Si fue completada antes del día programado, está vencida
            if (lastCompleted < scheduledDate) {
                return true;
            }
        }
    }
    
    return false;
};

// 🚨 FUNCIÓN AUXILIAR: Obtener el estado de una tarea (hoy, vencida, futura)
export const getTaskStatus = (tarea: any): 'today' | 'overdue' | 'upcoming' | 'completed' => {
    if (!tarea.scheduledDays || tarea.scheduledDays.length === 0) {
        return 'upcoming';
    }

    const today = new Date();
    const todayIndex = getDayOfWeek(today);
    
    // Si fue completada hoy
    if (tarea.lastCompletedDate && isToday(new Date(tarea.lastCompletedDate))) {
        return 'completed';
    }

    const scheduledIndices = tarea.scheduledDays
        .map((day: string) => dayNameToIndex(day))
        .filter((index: number) => index !== -1);

    const isScheduledToday = scheduledIndices.includes(todayIndex);
    
    if (isScheduledToday) {
        return 'today';
    }

    // Verificar si está vencida
    for (const scheduledIndex of scheduledIndices) {
        if (scheduledIndex < todayIndex) {
            if (!tarea.lastCompletedDate) {
                return 'overdue';
            }
            
            const scheduledDate = new Date(today);
            scheduledDate.setDate(today.getDate() - (todayIndex - scheduledIndex));
            scheduledDate.setHours(0, 0, 0, 0);
            
            const lastCompleted = new Date(tarea.lastCompletedDate);
            lastCompleted.setHours(0, 0, 0, 0);
            
            if (lastCompleted < scheduledDate) {
                return 'overdue';
            }
        }
    }

    return 'upcoming';
};

// 🚨 FUNCIÓN: Filtrar todas las tareas que deben mostrarse hoy
export const getTasksForToday = (datos: any, categorias: any[]): any[] => {
    const tasksForToday: any[] = [];
    
    categorias.forEach(cat => {
        const tareas = datos[cat.id]?.tareas || [];
        tareas.forEach((tarea: any) => {
            // Solo tareas principales (ID 1) con programación
            if (tarea.id === 1 && shouldShowTaskToday(tarea)) {
                tasksForToday.push({
                    ...tarea,
                    categoria: cat.label,
                    categoriaId: cat.id,
                    icon: cat.icon,
                    color: cat.color,
                    bgColor: cat.bgColor,
                    status: getTaskStatus(tarea),
                });
            }
        });
    });
    
    // Ordenar: vencidas primero, luego las de hoy
    return tasksForToday.sort((a, b) => {
        const order: Record<string, number> = { overdue: 0, today: 1, upcoming: 2, completed: 3 };
        return (order[a.status] || 2) - (order[b.status] || 2);
    });
};

// 🚨 FUNCIÓN: Obtener estadísticas de tareas
export const getTaskStats = (datos: any, categorias: any[]) => {
    let total = 0;
    let todayCount = 0;
    let overdueCount = 0;
    let completedToday = 0;

    categorias.forEach(cat => {
        const tareas = datos[cat.id]?.tareas || [];
        tareas.forEach((tarea: any) => {
            if (tarea.id === 1 && tarea.scheduledDays && tarea.scheduledDays.length > 0) {
                total++;
                const status = getTaskStatus(tarea);
                
                if (status === 'today') todayCount++;
                if (status === 'overdue') overdueCount++;
                if (status === 'completed') completedToday++;
            }
        });
    });

    return {
        total,
        todayCount,
        overdueCount,
        completedToday,
        pendingToday: todayCount + overdueCount,
    };
};

export { DAY_MAP, getDayOfWeek };

/**
 * Filtra las tareas Things-like: pendientes pasadas y las de hoy.
 * @param allTasks Un array plano de todas las tareas (datos.tareas de todas las categorías).
 * @param today La fecha de hoy (new Date()).
 */
export const filterThingsLikeTasks = (allTasks: any[], today: Date) => {
    const overdueTasks: any[] = [];
    const todayTasks: any[] = [];
    const todayDayIndex = getDayOfWeek(today); // Día de la semana de hoy (ej: 2 para Martes)

    const todayStart = new Date(today);
    todayStart.setHours(0, 0, 0, 0);
    const oneDay = 24 * 60 * 60 * 1000;

    allTasks.forEach(task => {
        // Tareas que son irrelevantes para este filtro (no recurrentes, ya completadas, etc.)
        if (task.completado || !task.scheduledDays || task.scheduledDays.length === 0) {
            // Incluir tareas que no son recurrentes si tienen fecha de vencimiento (futura mejora)
            return;
        }

        // Convertir días programados a índices (soporta nombres en español)
        const scheduledDaysIndexes = task.scheduledDays.map((day: string) => {
            // Intentar primero con el código (MO, TU, etc.)
            if (DAY_MAP[day as keyof typeof DAY_MAP]) {
                return DAY_MAP[day as keyof typeof DAY_MAP];
            }
            // Si no, usar el nombre en español
            return dayNameToIndex(day);
        }).filter((index: number) => index !== -1);
        
        if (scheduledDaysIndexes.length === 0) {
            return; // No hay días válidos programados
        }

        const lastCompleted = task.lastCompletedDate ? new Date(task.lastCompletedDate) : null;
        
        // --- 1. LÓGICA DE TAREAS VENCIDAS (OVERDUE) ---
        
        // La revisión comienza el día después de la última completación o hace 7 días si nunca se completó.
        let checkDate = lastCompleted 
            ? new Date(lastCompleted.getTime() + oneDay)
            : new Date(today.getTime() - (7 * oneDay)); // Revisar al menos 7 días atrás
        
        checkDate.setHours(0, 0, 0, 0); // Limpiar la hora para la comparación

        let isOverdue = false;
        
        // Iterar desde el día de inicio hasta el día anterior a hoy
        while (checkDate.getTime() < todayStart.getTime()) {
            const currentDayOfWeek = getDayOfWeek(checkDate);
            
            // Si este día era programado
            if (scheduledDaysIndexes.includes(currentDayOfWeek)) {
                isOverdue = true; // La tarea se debió hacer y está vencida
                break;
            }
            checkDate = new Date(checkDate.getTime() + oneDay);
        }
        
        if (isOverdue) {
            overdueTasks.push(task);
            return; // Si está vencida, no la agregamos a las tareas de hoy
        }

        // --- 2. LÓGICA DE TAREAS DE HOY (TODAY) ---
        
        // Si el día de la semana de hoy está en los días programados
        if (scheduledDaysIndexes.includes(todayDayIndex)) {
            todayTasks.push(task);
        }
    });

    return { overdueTasks, todayTasks };
};
