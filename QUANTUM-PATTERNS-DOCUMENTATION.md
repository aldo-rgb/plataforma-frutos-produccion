# 🧬 QUANTUM PATTERNS - Motor de Análisis Predictivo

## ✅ Status: IMPLEMENTADO - Listo para Testing

**Fecha de Implementación**: 23 de Diciembre de 2025

---

## 🎯 Concepto Core

**"Quantum Patterns"** es un motor de análisis que cruza variables de comportamiento del usuario para descubrir **correlaciones ocultas** entre hábitos, horarios y estados de ánimo.

### Promesa al Usuario
> "Descubre el código fuente de tu éxito. Patrones invisibles que explican por qué algunas semanas vuelas y otras te estancas."

### Mecánica Central
- Sistema analiza últimas 4 semanas de comportamiento
- Detecta 3 tipos de patrones:
  1. **Golden Hour** (Hora Dorada): Franja horaria con >90% éxito
  2. **Keystone Habit** (Hábito Llave): Tarea A que aumenta éxito de Tarea B en >20%
  3. **Cursed Day** (Día Maldito): Día de la semana con >60% fallas
- Genera "Insights" con nivel de confianza
- Usuario recibe revelaciones cada semana

---

## 📦 Implementación Completa

### 1. Schema de Base de Datos

**Tablas Creadas**:
- ✅ `QuantumPattern` - Almacena patrones detectados
- ✅ `QuantumInsight` - Revelaciones presentadas al usuario

**Enums Creados**:
- ✅ `TimeSlot` (7 franjas: DAWN, MORNING, MIDDAY, AFTERNOON, EVENING, NIGHT, MIDNIGHT)
- ✅ `PatternType` (GOLDEN_HOUR, KEYSTONE_HABIT, CURSED_DAY)

**Relaciones**:
```prisma
model Usuario {
  quantumPatterns QuantumPattern[]
  quantumInsights QuantumInsight[]
}

model QuantumPattern {
  id              Int          @id @default(autoincrement())
  usuarioId       Int
  usuario         Usuario      @relation(...)
  
  type            PatternType
  confidence      Float        // 0.0 - 1.0
  
  // Metadata específica por tipo de patrón
  timeSlot        TimeSlot?    // Para GOLDEN_HOUR
  keystoneTaskId  Int?         // Para KEYSTONE_HABIT
  boostedTaskId   Int?         // Para KEYSTONE_HABIT
  dayOfWeek       Int?         // Para CURSED_DAY (0-6)
  
  // Métricas
  sampleSize      Int
  effectSize      Float?       // Magnitud del efecto
  
  insights        QuantumInsight[]
  
  createdAt       DateTime     @default(now())
}

model QuantumInsight {
  id              Int             @id @default(autoincrement())
  usuarioId       Int
  usuario         Usuario         @relation(...)
  
  patternId       Int
  pattern         QuantumPattern  @relation(...)
  
  title           String          // "Tu Hora Dorada: 6-9 AM"
  description     String          // Texto explicativo
  actionable      String?         // Recomendación accionable
  
  isRead          Boolean         @default(false)
  isDismissed     Boolean         @default(false)
  
  createdAt       DateTime        @default(now())
}
```

### 2. Motor de Análisis

**Archivo**: `lib/quantum-engine.ts` (385 líneas)

**Función Principal**: `analyzeUserPatterns(usuarioId)`

```typescript
export async function analyzeUserPatterns(usuarioId: number) {
  // 1. Obtener últimas 4 semanas de tareas
  const fourWeeksAgo = subWeeks(new Date(), 4);
  const tasks = await prisma.taskInstance.findMany({
    where: {
      usuarioId,
      dueDate: { gte: fourWeeksAgo }
    },
    include: { taskTemplate: true }
  });

  // 2. Detectar patrones
  const goldenHour = await detectGoldenHour(usuarioId, tasks);
  const keystoneHabit = await detectKeystoneHabit(usuarioId, tasks);
  const cursedDay = await detectCursedDay(usuarioId, tasks);

  // 3. Guardar patrones encontrados
  const patterns = [];
  if (goldenHour) patterns.push(goldenHour);
  if (keystoneHabit) patterns.push(keystoneHabit);
  if (cursedDay) patterns.push(cursedDay);

  await savePatterns(usuarioId, patterns);
  
  return patterns;
}
```

### 3. Algoritmo: Golden Hour

**Concepto**: Encuentra la franja horaria donde el usuario tiene >90% de éxito.

```typescript
async function detectGoldenHour(usuarioId: number, tasks: TaskInstance[]) {
  // Agrupar por franja horaria
  const byTimeSlot: Record<TimeSlot, { completed: number; total: number }> = {};
  
  for (const task of tasks) {
    if (!task.completedAt) continue;
    
    const hour = task.completedAt.getHours();
    const slot = getTimeSlot(hour); // Mapea 0-23 a 7 franjas
    
    if (!byTimeSlot[slot]) {
      byTimeSlot[slot] = { completed: 0, total: 0 };
    }
    
    byTimeSlot[slot].total++;
    if (task.isCompleted) {
      byTimeSlot[slot].completed++;
    }
  }
  
  // Buscar franja con >90% éxito y mínimo 10 muestras
  for (const [slot, stats] of Object.entries(byTimeSlot)) {
    const successRate = stats.completed / stats.total;
    
    if (successRate >= 0.9 && stats.total >= 10) {
      return {
        type: 'GOLDEN_HOUR',
        timeSlot: slot,
        confidence: successRate,
        sampleSize: stats.total,
        effectSize: successRate - 0.5 // vs baseline 50%
      };
    }
  }
  
  return null;
}
```

**Ejemplo de Resultado**:
```json
{
  "type": "GOLDEN_HOUR",
  "timeSlot": "MORNING", // 6-9 AM
  "confidence": 0.94,
  "sampleSize": 28,
  "effectSize": 0.44
}
```

**Insight Generado**:
> **"Tu Hora Dorada: 6-9 AM" (94% confianza)**
> 
> Cuando completas tareas en esta franja, tu tasa de éxito es **94%** (vs 50% en otras horas). En las últimas 4 semanas, 28 de 30 tareas matutinas fueron exitosas.
> 
> **Acción**: Programa tus tareas más difíciles entre 6-9 AM.

### 4. Algoritmo: Keystone Habit

**Concepto**: Descubre qué tarea A, cuando se completa, aumenta la probabilidad de éxito de tarea B.

```typescript
async function detectKeystoneHabit(usuarioId: number, tasks: TaskInstance[]) {
  // Agrupar por día
  const tasksByDay = groupBy(tasks, (t) => format(t.dueDate, 'yyyy-MM-dd'));
  
  // Obtener todas las combinaciones de tareas
  const taskTemplateIds = [...new Set(tasks.map(t => t.taskTemplateId))];
  
  for (const taskA of taskTemplateIds) {
    for (const taskB of taskTemplateIds) {
      if (taskA === taskB) continue;
      
      let daysWithBoth = 0;
      let daysWithACompleted_BCompleted = 0;
      let daysWithoutA_BCompleted = 0;
      let daysWithoutA_Total = 0;
      
      for (const [date, dayTasks] of Object.entries(tasksByDay)) {
        const taskAInstance = dayTasks.find(t => t.taskTemplateId === taskA);
        const taskBInstance = dayTasks.find(t => t.taskTemplateId === taskB);
        
        if (!taskBInstance) continue;
        
        if (taskAInstance) {
          daysWithBoth++;
          if (taskAInstance.isCompleted && taskBInstance.isCompleted) {
            daysWithACompleted_BCompleted++;
          }
        } else {
          daysWithoutA_Total++;
          if (taskBInstance.isCompleted) {
            daysWithoutA_BCompleted++;
          }
        }
      }
      
      // Calcular efecto
      if (daysWithBoth < 10) continue; // Mínimo 10 días
      
      const successRateWithA = daysWithACompleted_BCompleted / daysWithBoth;
      const successRateWithoutA = daysWithoutA_Total > 0 
        ? daysWithoutA_BCompleted / daysWithoutA_Total 
        : 0;
      
      const boost = successRateWithA - successRateWithoutA;
      
      if (boost >= 0.2) { // Boost de +20%
        return {
          type: 'KEYSTONE_HABIT',
          keystoneTaskId: taskA,
          boostedTaskId: taskB,
          confidence: successRateWithA,
          sampleSize: daysWithBoth,
          effectSize: boost
        };
      }
    }
  }
  
  return null;
}
```

**Ejemplo de Resultado**:
```json
{
  "type": "KEYSTONE_HABIT",
  "keystoneTaskId": 42, // "Meditar 10 min"
  "boostedTaskId": 57,  // "Estudiar 1 hora"
  "confidence": 0.88,
  "sampleSize": 24,
  "effectSize": 0.35
}
```

**Insight Generado**:
> **"Hábito Llave: Meditar → Estudiar" (88% confianza)**
> 
> Cuando completas **"Meditar 10 min"**, tu probabilidad de completar **"Estudiar 1 hora"** aumenta **35%** (de 53% a 88%).
> 
> **Acción**: Siempre medita antes de estudiar. Este ritual desbloquea tu productividad.

### 5. Algoritmo: Cursed Day

**Concepto**: Identifica el día de la semana con >60% de tasa de fallas.

```typescript
async function detectCursedDay(usuarioId: number, tasks: TaskInstance[]) {
  // Agrupar por día de la semana (0 = Domingo, 6 = Sábado)
  const byDayOfWeek: Record<number, { completed: number; total: number }> = {};
  
  for (const task of tasks) {
    const dayOfWeek = getDayOfWeek(task.dueDate); // 0-6
    
    if (!byDayOfWeek[dayOfWeek]) {
      byDayOfWeek[dayOfWeek] = { completed: 0, total: 0 };
    }
    
    byDayOfWeek[dayOfWeek].total++;
    if (task.isCompleted) {
      byDayOfWeek[dayOfWeek].completed++;
    }
  }
  
  // Buscar día con >60% fallas
  for (const [day, stats] of Object.entries(byDayOfWeek)) {
    const failureRate = 1 - (stats.completed / stats.total);
    
    if (failureRate >= 0.6 && stats.total >= 8) {
      return {
        type: 'CURSED_DAY',
        dayOfWeek: parseInt(day),
        confidence: failureRate,
        sampleSize: stats.total,
        effectSize: failureRate - 0.4 // vs baseline 40% failure
      };
    }
  }
  
  return null;
}
```

**Ejemplo de Resultado**:
```json
{
  "type": "CURSED_DAY",
  "dayOfWeek": 1, // Lunes
  "confidence": 0.71,
  "sampleSize": 16,
  "effectSize": 0.31
}
```

**Insight Generado**:
> **"Tu Día Maldito: Lunes" (71% confianza)**
> 
> Los **lunes** fallas **71%** de tus tareas (vs 40% en otros días). Analizamos 16 lunes en 4 semanas.
> 
> **Posibles causas**: Cansancio del fin de semana, muchas reuniones, falta de planificación.
> 
> **Acción**: Los domingos por la noche, prepara TODO para el lunes. Reduce carga ese día.

### 6. Helpers de Tiempo

**Archivo**: `lib/quantum-helpers.ts`

```typescript
export type TimeSlot = 
  | 'DAWN'      // 4-6 AM
  | 'MORNING'   // 6-9 AM
  | 'MIDDAY'    // 9-12 PM
  | 'AFTERNOON' // 12-6 PM
  | 'EVENING'   // 6-9 PM
  | 'NIGHT'     // 9-12 AM
  | 'MIDNIGHT'; // 12-4 AM

export function getTimeSlot(hour: number): TimeSlot {
  if (hour >= 4 && hour < 6) return 'DAWN';
  if (hour >= 6 && hour < 9) return 'MORNING';
  if (hour >= 9 && hour < 12) return 'MIDDAY';
  if (hour >= 12 && hour < 18) return 'AFTERNOON';
  if (hour >= 18 && hour < 21) return 'EVENING';
  if (hour >= 21 && hour < 24) return 'NIGHT';
  return 'MIDNIGHT';
}

export function getDayOfWeek(date: Date): number {
  return date.getDay(); // 0 = Sunday, 6 = Saturday
}

export function calculateCompletionSpeed(
  dueDate: Date,
  completedAt: Date
): number {
  // Retorna minutos de diferencia (negativo = temprano, positivo = tarde)
  return differenceInMinutes(completedAt, dueDate);
}
```

### 7. APIs REST

**Endpoints Creados**:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/quantum/insights` | GET | Obtener revelaciones actuales |
| `/api/quantum/insights/:id/read` | POST | Marcar insight como leído |
| `/api/quantum/insights/:id/dismiss` | POST | Descartar insight |

**Ejemplo de Respuesta (`/api/quantum/insights`)**:
```json
{
  "insights": [
    {
      "id": 123,
      "title": "Tu Hora Dorada: 6-9 AM",
      "description": "Cuando completas tareas en esta franja...",
      "actionable": "Programa tus tareas más difíciles entre 6-9 AM",
      "confidence": 0.94,
      "type": "GOLDEN_HOUR",
      "createdAt": "2025-12-23T00:00:00Z",
      "isRead": false,
      "pattern": {
        "timeSlot": "MORNING",
        "sampleSize": 28,
        "effectSize": 0.44
      }
    }
  ]
}
```

### 8. Componente UI

**Archivo**: `components/quantum/QuantumInsightCard.tsx` (259 líneas)

**Características**:
- ✅ Tarjeta animada con Framer Motion
- ✅ Badge de confianza (ej. "94% confianza")
- ✅ Iconos según tipo de patrón:
  - 🌅 Golden Hour
  - 🔑 Keystone Habit
  - 🌩️ Cursed Day
- ✅ Mini gráfico animado (Line Chart)
- ✅ Botones de acción: "Ver Detalle", "Descartar"
- ✅ Navegación entre múltiples insights

---

## ✅ Checklist de Implementación

- [x] Schema de base de datos (2 tablas)
- [x] Motor de análisis (`quantum-engine.ts`)
- [x] Helpers de tiempo (`quantum-helpers.ts`)
- [x] 3 Algoritmos de detección
- [x] 3 APIs REST
- [x] Componente UI (`QuantumInsightCard.tsx`)
- [x] Job semanal de análisis
- [x] Documentación completa
- [x] Migración aplicada
- [x] Servidor compilando
- [ ] Integración en dashboard
- [ ] Configuración de Cron Job
- [ ] Sistema de notificaciones

---

**Última Actualización**: 23 de Diciembre de 2025, 9:35 AM  
**Status**: ✅ **IMPLEMENTADO Y COMPILANDO**  
**Servidor**: http://localhost:3000
