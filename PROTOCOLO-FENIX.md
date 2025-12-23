# 🔥 PROTOCOLO FÉNIX - Crisis Management System

## 📋 Resumen Ejecutivo

El **Protocolo Fénix** es un sistema de gestión de crisis diseñado para reducir el churn (abandono) permitiendo a los usuarios abrumados "reiniciar" su día sin culpa, con una victoria pequeña inmediata.

**Objetivo:** Convertir el momento de máxima frustración en un punto de recuperación emocional y momentum.

### 🎯 Usuarios Objetivo
- **PARTICIPANTES**: Usuarios del programa F.R.U.T.O.S.
- **GAMECHANGER**: Líderes de la comunidad

### 🔔 Sistema de Notificaciones SOS
Cuando un usuario activa el Protocolo Fénix, se envían notificaciones automáticas a:
1. **Mentor asignado** (si tiene)
2. **Coordinador asignado** (si tiene)
3. **Game Changer asignado** (si tiene)

Esto permite que el equipo de apoyo esté al tanto de la situación y pueda brindar acompañamiento proactivo.

---

## 🎯 ¿Por Qué Funciona?

### Psicología del Sistema

1. **Sin Juicio:** No pregunta "¿Estás seguro?". Activa inmediatamente.
2. **Pizarra Limpia:** Reagenda automáticamente tareas sin marcarlas como "retrasadas" (rojas).
3. **Micro-Victoria:** Una tarea ridículamente pequeña para recuperar dopamina.
4. **Honor, No Puntos:** El badge Fénix es simbólico, no transaccional.
5. **Confianza:** No pide evidencia de la micro-tarea. Confiamos en el usuario.

---

## 🏗️ Arquitectura Técnica

### 1. Base de Datos (`prisma/schema.prisma`)

**Modelo PhoenixSession:**
```prisma
model PhoenixSession {
  id                      Int              @id @default(autoincrement())
  usuarioId               Int
  triggerReason           String?
  snapshotTasks           Json             // Snapshot para posible rollback
  microTaskId             Int?
  microTaskType           MicroTaskType
  microTaskCompleted      Boolean          @default(false)
  completedAt             DateTime?
  tasksRescheduled        Int              @default(0)
  tasksGracefullySkipped  Int              @default(0)
  badgeAwarded            Boolean          @default(false)
  createdAt               DateTime         @default(now())
  exitedAt                DateTime?
  
  Usuario                 Usuario          @relation(fields: [usuarioId], references: [id])
}

enum MicroTaskType {
  DRINK_WATER
  READ_ONE_PAGE
  BREATHE_TWO_MIN
  MAKE_BED
  WALK_5_MIN
  STRETCH
  CUSTOM
}
```

**TaskStatus Actualizado:**
```prisma
enum TaskStatus {
  PENDING
  COMPLETED
  SKIPPED
  SKIPPED_GRACEFULLY  // ← Perdonada por Protocolo Fénix
}
```

---

### 2. Backend API (`/app/api/phoenix/`)

#### **POST /api/phoenix/activate**
Activa el protocolo y procesa tareas.

**Request:**
```json
{
  "triggerReason": "Me siento bloqueado" // Opcional
}
```

**Lógica:**
1. **Snapshot:** Guarda el estado actual de tareas pendientes
2. **Triaje:**
   - Tareas de HOY → Reagendar para MAÑANA
   - Tareas atrasadas → Marcar como `SKIPPED_GRACEFULLY`
3. **Crear Sesión Fénix**
4. **Retornar Opciones de Micro-Tareas**

**Response:**
```json
{
  "success": true,
  "phoenixSessionId": 123,
  "message": "Protocolo Fénix activado. Respira, el pasado no importa.",
  "stats": {
    "tasksRescheduled": 5,
    "tasksPerdonadas": 3,
    "totalProcessed": 8
  },
  "microTaskOptions": [
    {
      "type": "DRINK_WATER",
      "label": "💧 Beber un vaso de agua",
      "duration": 1,
      "description": "Hidrátate y reinicia tu energía"
    }
    // ... más opciones
  ]
}
```

---

#### **POST /api/phoenix/select-task**
Usuario selecciona la micro-tarea.

**Request:**
```json
{
  "phoenixSessionId": 123,
  "microTaskType": "DRINK_WATER"
}
```

**Response:**
```json
{
  "success": true,
  "task": {
    "title": "💧 Beber un vaso de agua",
    "timer": 60,
    "instructions": "Tómate un momento para hidratarte...",
    "zenMessage": "El agua es vida. Cada sorbo te devuelve al presente."
  },
  "message": "Solo concéntrate en esto. Nada más importa ahora."
}
```

---

#### **POST /api/phoenix/complete**
Marca la micro-tarea como completada y otorga badge.

**Request:**
```json
{
  "phoenixSessionId": 123
}
```

**Response:**
```json
{
  "success": true,
  "message": "Día Reiniciado. Estás de vuelta en control. 🔥",
  "badge": {
    "name": "Fénix",
    "icon": "🔥",
    "description": "Reconocimiento por no rendirse en momentos difíciles",
    "rarity": "HONOR"
  },
  "session": {
    "tasksRescheduled": 5,
    "tasksPerdonadas": 3,
    "microTaskCompleted": true
  }
}
```

---

#### **GET /api/phoenix/status**
Verifica si hay una sesión activa.

**Response:**
```json
{
  "isActive": true,
  "session": {
    "id": 123,
    "microTaskType": "DRINK_WATER",
    "tasksRescheduled": 5,
    "tasksPerdonadas": 3,
    "createdAt": "2025-12-23T14:30:00Z"
  }
}
```

---

### 3. Frontend Components

#### **PhoenixContext (`/contexts/PhoenixContext.tsx`)**
Context Provider para gestionar el estado global del Protocolo Fénix.

**Estado:**
```typescript
{
  isPhoenixMode: boolean
  phoenixSessionId: number | null
  activatePhoenix: (reason?: string) => Promise<void>
  exitPhoenix: () => void
  isLoading: boolean
}
```

**Uso:**
```tsx
const { isPhoenixMode, activatePhoenix } = usePhoenix();
```

---

#### **PhoenixButton (`/components/phoenix/PhoenixButton.tsx`)**
Botón de emergencia "SOS" visible en el Topbar.

**Características:**
- Icono de Llama 🔥
- Tooltip explicativo al hover
- Activación inmediata (sin confirmación)
- Estado de loading durante activación

**Ubicación:** `<Topbar>` del dashboard

---

#### **ZenView (`/components/phoenix/ZenView.tsx`)**
Vista de "Modo Zen" que reemplaza todo el dashboard.

**Flujo de 3 Pasos:**

1. **OPTIONS:** Muestra las 6 micro-tareas disponibles
   - Fondo: Gradiente azul profundo
   - UI: Cards grandes con emojis
   - Mensaje: "Respira. El pasado no importa."

2. **TIMER:** Cronómetro para la tarea seleccionada
   - Temporizador circular
   - Instrucciones claras
   - Mensaje zen
   - Botón "Marcar como Completado" (sin evidencia)

3. **COMPLETE:** Celebración y badge
   - Animación de confetti 🔥 (fuego naranja/dorado)
   - Badge Fénix desbloqueado
   - Mensaje: "Día Reiniciado"
   - Auto-redirect después de 5 segundos

**Estética:**
- Fondo: `bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900`
- Sin distracciones: Rankings, puntos, notificaciones OCULTOS
- Solo QUANTUM en el centro (conceptualmente)

---

#### **PhoenixWrapper (`/components/phoenix/PhoenixWrapper.tsx`)**
Wrapper que decide si mostrar ZenView o el dashboard normal.

```tsx
{isPhoenixMode ? <ZenView /> : <Dashboard />}
```

**Integración en Layout:**
```tsx
<PhoenixProvider>
  <PhoenixWrapper>
    <Dashboard>{children}</Dashboard>
  </PhoenixWrapper>
</PhoenixProvider>
```

---

## 🎨 UX/UI Design Specs

### Colores del Modo Zen
```css
Background: #020617 → #1e3a8a → #020617 (gradient)
Text Primary: #ffffff
Text Secondary: #cbd5e1
Accent: #f97316 (orange-500) - Fénix
Border: #1e293b (slate-800)
```

### Animaciones

**1. Entrada al Modo Zen:**
```css
.animate-fadeIn {
  animation: fadeIn 0.5s ease-in;
}
```

**2. Phoenix Rise (Confetti):**
- Colores: `['#ff6b00', '#ff8c00', '#ffa500', '#ffb84d']`
- Dirección: Desde ambos lados hacia el centro
- Duración: 3 segundos
- Librería: `canvas-confetti`

**3. Badge Pulse:**
```css
.animate-bounce {
  animation: bounce 1s infinite;
}
```

---

## 📊 Métricas de Éxito

### Eventos a Trackear

1. **Phoenix Activations:**
   - `phoenix_activated`
   - Props: `trigger_reason`, `tasks_rescheduled`, `tasks_perdonadas`

2. **Micro-Task Selection:**
   - `phoenix_task_selected`
   - Props: `task_type`, `duration`

3. **Completion:**
   - `phoenix_completed`
   - Props: `time_to_complete`, `badge_awarded`

4. **Abandonment:**
   - `phoenix_abandoned`
   - Props: `step`, `time_in_mode`

### KPIs Esperados

- **Tasa de Completación:** >80%
- **Tiempo Promedio en Modo:** 3-5 minutos
- **Churn Reduction:** -25% en usuarios que usan Fénix vs los que no
- **Badge Fénix:** Debe tener valor emocional, no transaccional

---

## 🚀 Flujo del Usuario (End-to-End)

```
Usuario abrumado → Ve SOS en Topbar
    ↓
Click en 🔥 "SOS"
    ↓
Dashboard DESAPARECE (fade out)
    ↓
MODO ZEN aparece (fade in)
    ↓
[STEP 1: OPTIONS]
"Respira. El pasado no importa."
6 opciones de micro-tareas
    ↓
Usuario selecciona: "💧 Beber agua"
    ↓
[STEP 2: TIMER]
Cronómetro 1 minuto
Instrucciones: "Tómate un momento para hidratarte"
Mensaje zen: "El agua es vida. Cada sorbo te devuelve al presente."
    ↓
Usuario bebe agua
    ↓
Click "Marcar como Completado"
    ↓
[STEP 3: COMPLETE]
🔥 ANIMACIÓN DE FUEGO 🔥
"Día Reiniciado. Estás de vuelta en control."
Badge Fénix desbloqueado
    ↓
Auto-redirect (5 segundos)
    ↓
Dashboard NORMAL (sin tareas rojas)
Tareas de hoy → Movidas a mañana
Tareas atrasadas → Perdonadas (SKIPPED_GRACEFULLY)
```

---

## 🛠️ Testing Checklist

### Backend
- [ ] POST /api/phoenix/activate crea sesión correctamente
- [ ] Tareas de HOY se reagendan a MAÑANA
- [ ] Tareas atrasadas se marcan como SKIPPED_GRACEFULLY
- [ ] Snapshot se guarda en JSON
- [ ] POST /api/phoenix/complete otorga badge
- [ ] GET /api/phoenix/status detecta sesión activa

### Frontend
- [ ] Botón SOS visible en Topbar
- [ ] Tooltip muestra mensaje correcto
- [ ] Click activa Modo Zen (dashboard desaparece)
- [ ] 6 opciones de micro-tareas se muestran
- [ ] Selección de tarea carga STEP 2
- [ ] Cronómetro cuenta regresivamente
- [ ] Botón "Completado" activa animación
- [ ] Confetti se dispara correctamente
- [ ] Badge Fénix aparece en la pantalla final
- [ ] Auto-redirect funciona después de 5 segundos
- [ ] Dashboard vuelve sin tareas rojas

### UX
- [ ] Transición suave entre dashboard y Modo Zen
- [ ] Fondo calmante (azul profundo)
- [ ] No hay elementos distractores en Modo Zen
- [ ] Mensajes zen son claros y motivadores
- [ ] Animación de fuego es satisfactoria
- [ ] Badge tiene valor emocional percibido

---

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **¿Por qué no pedir evidencia?**
   - Reducir fricción en momento de crisis
   - Confianza > Validación
   - El objetivo es recuperar momentum, no acumular puntos

2. **¿Por qué no dar puntos por el badge?**
   - Mantener el valor simbólico (honor)
   - Evitar "gaming the system"
   - El badge es un recordatorio de resiliencia

3. **¿Por qué reagendar en lugar de eliminar?**
   - No perder el trabajo de planificación
   - Dar segunda oportunidad
   - Evitar arrepentimiento posterior

4. **¿Por qué SKIPPED_GRACEFULLY?**
   - Diferencia de skip normal (voluntario)
   - No cuenta como falla en métricas
   - El sistema "perdona" el retraso

---

## 🔧 Mantenimiento

### Posibles Mejoras Futuras

1. **Opciones personalizadas:**
   - Permitir al usuario definir su propia micro-tarea

2. **Música/Audio:**
   - Sonidos de respiración guiada
   - White noise opcional

3. **Analytics Dashboard:**
   - Frecuencia de uso por usuario
   - Micro-tareas más populares
   - Correlación con retención

4. **Modo Preventivo:**
   - Sugerir Fénix antes de que el usuario lo active
   - Detectar patrones de frustración (3 skips seguidos)

---

## 📚 Referencias

- **Atomic Habits** (James Clear): Micro-hábitos como recuperación
- **The Phoenix Project**: Concepto de "renacimiento" después de crisis
- **Dopamine Nation**: Recuperación de baseline con victorias pequeñas
- **Flow State Research**: Reducción de fricción para entrar en estado productivo

---

**Creado:** 23 de diciembre de 2025  
**Última actualización:** 23 de diciembre de 2025  
**Autor:** Sistema Protocolo Fénix - F.R.U.T.O.S.

🔥 **"De las cenizas, renaces más fuerte"** 🔥
