# 🎯 Sistema de Tareas Estilo Things 3 - Carta F.R.U.T.O.S.

## 📋 Descripción General

Este sistema transforma la experiencia de la Carta F.R.U.T.O.S. de un formulario de configuración estático a un flujo de acción dinámico inspirado en Things 3, la aplicación de gestión de tareas considerada el "estándar de oro" en diseño UX.

## 🏗️ Arquitectura del Sistema

### Base de Datos

#### 1. **TaskInstance** - El Corazón del Sistema
```prisma
model TaskInstance {
  id            Int           @id @default(autoincrement())
  accionId      Int           // Referencia a la acción plantilla
  usuarioId     Int           // Usuario dueño de la tarea
  dueDate       DateTime      // Fecha programada
  status        TaskStatus    // PENDING, COMPLETED, SKIPPED
  postponeCount Int           // Contador de posposiciones
  completedAt   DateTime?     // Timestamp de completado
}
```

**Propósito**: Cada TaskInstance es una instancia concreta de una tarea para un día específico. Se generan automáticamente para los próximos 3 meses basándose en la configuración de las Acciones.

#### 2. **MentorAlert** - Sistema de Notificaciones Inteligentes
```prisma
model MentorAlert {
  id             Int        @id @default(autoincrement())
  mentorId       Int        // Mentor que recibe la alerta
  usuarioId      Int        // Estudiante involucrado
  taskInstanceId Int?       // Tarea relacionada
  type           AlertType  // RISK_ALERT, MILESTONE, ENCOURAGEMENT
  message        String     // Mensaje personalizado
  read           Boolean    // Estado de lectura
}
```

**Propósito**: Solo se crean alertas cuando realmente importa:
- **RISK_ALERT**: Cuando un estudiante pospone una tarea 3+ veces
- **ENCOURAGEMENT**: Cuando completa una tarea muy pospuesta
- **MILESTONE**: Logros importantes (racha de 7 días, etc.)

### Modificaciones a Modelos Existentes

#### **Accion** - Plantilla de Tareas Recurrentes
```prisma
model Accion {
  frequency       String?    // 'DAILY', 'WEEKLY', 'BIWEEKLY', 'MONTHLY'
  assignedDays    Int[]      // [1,3,5] = Lunes, Miércoles, Viernes
  TaskInstance    TaskInstance[]
}
```

## 🎨 Componentes Frontend

### 1. **SmartTask.tsx** - El Componente Estrella

Características estilo Things:
- ✅ Checkbox circular con animación suave
- 🏷️ Tags de color por área (Finanzas verde, Salud roja, etc.)
- ⏰ Contador visual de posposiciones
- 🔔 Alertas de retraso con días vencidos
- 📅 Menú contextual para reagendar (mañana, 3 días, semana)

```tsx
<SmartTask
  task={{
    id: 1,
    title: "Transferir $100 a ahorro",
    areaType: "FINANZAS",
    identity: "Soy abundancia",
    dueDate: "2025-12-18",
    status: "PENDING",
    postponeCount: 1
  }}
  onUpdate={handleUpdate}
/>
```

### 2. **Dashboard "HOY"** - Vista Principal

**Filosofía**: Separar Planificación de Ejecución
- No mostrar toda la estructura (Área > Meta > Acción)
- Solo mostrar: Checkbox + Título + Contexto mínimo
- Agrupar por estado: Retrasadas → Pendientes → Completadas
- Barra de progreso circular arriba

**Navegación**:
- Mini calendario semanal para cambiar de día
- Botón "Ir a Hoy" cuando estás en otro día
- Navegación con flechas ← →

## 🔌 API Endpoints

### 1. `/api/tasks/generate` - Generador de Instancias

**POST**: Generar tareas para una acción específica
```json
{
  "accionId": 123,
  "durationMonths": 3
}
```

**Respuesta**:
```json
{
  "success": true,
  "created": 36,
  "message": "Se generaron 36 instancias..."
}
```

**PUT**: Regenerar todas las tareas de un usuario
```json
{
  "userId": 48,
  "durationMonths": 3
}
```

### 2. `/api/tasks/today` - Vista del Día

**GET**: Obtener tareas del día
```
/api/tasks/today?date=2025-12-18&status=PENDING
```

**Respuesta**:
```json
{
  "success": true,
  "date": "2025-12-18",
  "tasks": [...],
  "stats": {
    "total": 8,
    "completed": 5,
    "pending": 3,
    "overdue": 1,
    "completionRate": 62
  }
}
```

**POST**: Completar una tarea
```json
{
  "taskId": 456
}
```

### 3. `/api/tasks/postpone` - Posponer y Notificar

**POST**: Reagendar una tarea
```json
{
  "taskId": 456,
  "daysToAdd": 3
}
```

**Lógica de Negocio**:
1. Si `postponeCount <= 2`: Solo actualiza la fecha
2. Si `postponeCount > 2`: 
   - Muestra alerta al usuario
   - Crea MentorAlert
   - Devuelve `mentorNotified: true`

**GET**: Ver alertas del mentor
```
/api/tasks/postpone?unreadOnly=true
```

**PATCH**: Marcar alertas como leídas
```json
{
  "alertId": 789
}
// o
{
  "markAllAsRead": true
}
```

## 📊 Flujo de Usuario

### Al Crear una Acción en la Carta FRUTOS

1. Usuario define:
   - Texto de la acción: "Meditar 10 minutos"
   - Área: PAZ_MENTAL
   - Frecuencia: WEEKLY
   - Días: [1, 3, 5] (Lun, Mié, Vie)

2. Sistema ejecuta automáticamente:
```javascript
POST /api/tasks/generate
{
  "accionId": createdAccion.id,
  "durationMonths": 3
}
```

3. Se crean ~36 TaskInstances (12 semanas × 3 días/semana)

### En el Dashboard "HOY"

**Escenario 1: Completar Tarea**
```
Usuario hace click en checkbox 
→ POST /api/tasks/today { taskId: X }
→ status = COMPLETED
→ avance++ en CartaFrutos
→ Confeti/animación 🎉
```

**Escenario 2: Posponer 1ra vez**
```
Usuario click "Para mañana"
→ POST /api/tasks/postpone { taskId: X, daysToAdd: 1 }
→ dueDate = mañana
→ postponeCount = 1
→ Mensaje: "Recuerda que la constancia es clave"
```

**Escenario 3: Posponer 3ra vez**
```
Usuario click "Próxima semana"
→ Alerta: "⚠️ Tu mentor será notificado"
→ Usuario confirma
→ POST /api/tasks/postpone { taskId: X, daysToAdd: 7 }
→ postponeCount = 3
→ Crea MentorAlert (RISK_ALERT)
→ Email/notificación al mentor
```

## 🎯 Reglas de Negocio

### Generación de Tareas

**DAILY**: Todos los días (incluye fines de semana)
```javascript
assignedDays: [0,1,2,3,4,5,6]
```

**WEEKLY**: Días específicos de la semana
```javascript
// Lunes, Miércoles, Viernes
assignedDays: [1, 3, 5]
```

**BIWEEKLY**: Cada 2 semanas en días específicos
```javascript
// Martes de semanas pares
assignedDays: [2]
weekNumber % 2 === 0
```

**MONTHLY**: Día específico del mes
```javascript
// Día 15 de cada mes
assignedDays: [15]
```

### Alertas al Mentor

**NO notificar** por:
- 1ra posposición (normal)
- 2da posposición (advertencia al usuario)

**SÍ notificar** por:
- 3ra+ posposición (patrón de procrastinación)
- Completar tarea con 3+ posposiciones (reconocimiento)

## 🚀 Cómo Ejecutar

### 1. Ejecutar Migración
```bash
cd /Users/aldokmps/plataforma-frutos-FINAL
npx prisma db push
npx prisma generate
```

### 2. Regenerar Tareas para Usuario Existente
```bash
curl -X PUT http://localhost:3003/api/tasks/generate \
  -H "Content-Type: application/json" \
  -d '{"userId": 48, "durationMonths": 3}'
```

### 3. Acceder al Dashboard
```
http://localhost:3003/dashboard/hoy
```

## 📱 Experiencia de Usuario

### Antes (Formulario)
❌ "Configurar Carta FRUTOS"
- 8 acordeones con campos
- No está claro qué hacer
- Se ve como tarea administrativa

### Después (Things Style)
✅ "¿Qué harás hoy?"
- Lista limpia con checkboxes
- Contexto mínimo (área + declaración)
- Acción inmediata sin fricción

## 🎨 Paleta de Colores por Área

```javascript
FINANZAS:       Verde    #10b981
SALUD:          Rojo     #ef4444
RELACIONES:     Rosa     #ec4899
TALENTOS:       Púrpura  #a855f7
PAZ_MENTAL:     Azul     #3b82f6
OCIO:           Amarillo #eab308
SERVICIO_TRANS: Índigo   #6366f1
SERVICIO_COMUN: Verde    #14b8a6
```

## 📈 Métricas y Analytics

El sistema rastrea automáticamente:
- ✅ Tasa de completado diaria/semanal/mensual
- ⏰ Promedio de posposiciones por tarea
- 🔥 Rachas de días consecutivos
- 📊 Áreas con más/menos completado
- ⚠️ Patrones de procrastinación (para alertas)

## 🔮 Próximos Pasos

1. **Notificaciones Push**: Recordatorios matutinos
2. **Gamificación**: Puntos por rachas, logros
3. **IA Predictiva**: "Mejor hora para hacer X según tu historial"
4. **Vista Calendario**: Arrastrar y soltar para reagendar
5. **Modo Enfoque**: Ocultar todo excepto 1-3 tareas prioritarias

---

**Filosofía**: "Hacer lo complejo simple, sin perder profundidad"
