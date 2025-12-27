# 🚀 QUANTUM DETECTOR - Sistema de Desbloqueo de Tareas

## 📋 Resumen

Sistema completo de detección y desbloqueo de tareas retrasadas con IA conversacional especializada.

---

## 🎯 Componentes Implementados

### 1. **Backend APIs**

#### `/api/quantum/detector` (GET)
- **Función**: Detecta tareas retrasadas (+3 días) del usuario actual
- **Filtros**:
  - `status: PENDING`
  - `dueDate < (HOY - 3 días)`
  - `rarity: COMMON` (solo tareas STANDARD, excluye misiones/extraordinarias)
- **Retorna**:
  ```typescript
  {
    needsIntervention: boolean,
    stats: {
      total: number,
      categorias: number,
      diasPromedioRetraso: number,
      masRetrasada: number
    },
    tareasPorCategoria: Record<string, TareaRetrasada[]>,
    tareasRaw: TareaRetrasada[],
    message: string
  }
  ```

#### `/api/quantum/unblocker/action` (POST)
- **Función**: Ejecuta acciones rápidas sobre tareas
- **Acciones Disponibles**:
  - `MOVE_TO_TODAY` - Mueve la tarea a HOY
  - `MARK_COMPLETE` - Marca como completada
  - `DELETE_TASK` - Elimina la instancia
  - `POSTPONE` - Pospone N días (configurable)
  - `RESCHEDULE` - Reprograma a fecha específica

#### `/api/quantum/unblocker/chat` (POST)
- **Función**: Chat con IA especializada en desbloqueo
- **Características**:
  - Streaming con OpenAI GPT-4o
  - System prompt inyectado con contexto de tareas
  - Tono empático, sin juicios
  - Enfoque en micro-pasos y renegociación
- **Payload**:
  ```typescript
  {
    messages: Mensaje[],
    tareasContext: TareaRetrasada[]
  }
  ```

#### `/api/cron/detector-diario` (GET)
- **Función**: Cron job diario (06:00 AM)
- **Proceso**:
  1. Escanea todas las tareas retrasadas (+3 días, STANDARD)
  2. Agrupa por usuario
  3. Crea notificaciones tipo `QUANTUM_INTERVENTION`
  4. Registra metadata (conteo, IDs, promedio retraso)
- **Autenticación**: Bearer token (`CRON_SECRET`)

#### `/api/notificaciones/quantum` (GET)
- **Función**: Obtiene notificación Quantum no leída más reciente
- **Retorna**: Notificación con metadata o `null`

#### `/api/notificaciones/[id]/read` (POST)
- **Función**: Marca notificación como leída
- **Seguridad**: Verifica que pertenece al usuario

---

### 2. **Frontend Components**

#### `/dashboard/quantum-detector` (Página Principal)
- **Características**:
  - Dashboard con 4 stats cards (total, áreas, promedio, más antigua)
  - Invitación empática a sesión de desbloqueo
  - Lista de tareas por categoría con acciones rápidas
  - Chat integrado con IA en modo desbloqueo
  - UI con colores ámbar/naranja (no juzga)

#### `QuantumNotificationBanner` (Componente)
- **Ubicación**: Fixed top-right
- **Trigger**: Cuando existe notificación `QUANTUM_INTERVENTION` no leída
- **Acciones**:
  - "Desbloquear Ahora" → Redirige a `/dashboard/quantum-detector`
  - "Más Tarde" → Marca como leída, oculta banner
  - "X" → Cierra y marca como leída

---

### 3. **Configuración de Cron**

**Archivo**: `vercel.json`

```json
{
  "crons": [
    {
      "path": "/api/cron/detector-diario",
      "schedule": "0 6 * * *"
    }
  ]
}
```

**Schedule**: Diario a las 06:00 AM (GMT)

---

### 4. **Sidebar Integration**

**Link agregado**:
- Icono: `Zap` (⚡)
- Texto: "Quantum IA"
- Badge: "Beta"
- Gradiente: ámbar a naranja
- Ruta: `/dashboard/quantum-detector`

---

## 🧠 System Prompt Especializado

### Identidad de la IA
- **Rol**: Ingeniero de Posibilidades
- **NO es**: Capataz, juez, disciplinario
- **Misión**: Eliminar fricción mental para cerrar tareas HOY o renegociarlas sin culpa

### Framework de 3 Pasos

1. **Detectar el Bloqueo**
   - Pregunta con empatía
   - "¿Qué hace que [Tarea] se sienta pesada?"

2. **Ofrecer Micro-Pasos**
   - Divide tareas grandes en ridículamente pequeñas
   - "Solo abre el documento y escribe el título. ¿Trato?"

3. **Renegociación Radical**
   - Mover a HOY
   - Marcar completada (si ya se hizo)
   - Eliminar (si ya no aporta)
   - Posponer con plan claro

### Reglas de Oro

✅ **HACER**:
- Centrarse SOLO en tareas retrasadas
- Tono comprensivo pero orientado a acción
- Ofrecer opciones concretas
- Preguntar: "¿Con cuál atacamos primero?"

❌ **NO HACER**:
- Juzgar o presionar
- Hablar de nuevas tareas
- Dar sermones de disciplina
- Usar "debes", "tienes que"

---

## 📊 Flujo de Usuario

### Escenario 1: Usuario con Tareas Retrasadas

1. **06:00 AM** - Cron ejecuta detección
2. **Notificación creada** - `QUANTUM_INTERVENTION` insertada en BD
3. **Usuario entra al dashboard** - Banner aparece (top-right)
4. **Usuario hace click** - Redirige a `/dashboard/quantum-detector`
5. **Dashboard muestra**:
   - Stats cards con métricas visuales
   - Invitación empática a conversar
   - Lista de tareas con botones de acción rápida
6. **Usuario inicia chat** - Modal de desbloqueo se abre
7. **IA responde con contexto** - System prompt inyectado con tareas específicas
8. **Usuario ejecuta acciones** - Mover a HOY, Completar, Eliminar
9. **Dashboard actualiza** - Stats refrescan en tiempo real

### Escenario 2: Usuario Sin Tareas Retrasadas

1. **Usuario accede** - Banner NO aparece
2. **Dashboard muestra** - Card verde: "¡Todo al día! 🎉"
3. **Sin intervención necesaria**

---

## 🔧 Variables de Entorno

```env
# Cron Job
CRON_SECRET=quantum-cron-2025

# OpenAI (ya existente)
OPENAI_API_KEY=sk-...
```

---

## 📝 Testing

### Test Manual del Cron Job

```bash
curl -X GET http://localhost:3000/api/cron/detector-diario \
  -H "Authorization: Bearer quantum-cron-2025"
```

### Test Manual del Detector

```bash
curl -X GET http://localhost:3000/api/quantum/detector \
  -H "Cookie: next-auth.session-token=..."
```

### Test de Acciones

```bash
curl -X POST http://localhost:3000/api/quantum/unblocker/action \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=..." \
  -d '{
    "action": "MOVE_TO_TODAY",
    "taskId": 123
  }'
```

---

## 🚀 Deployment

### Vercel

1. **Push al repositorio** - El cron se configura automáticamente
2. **Vercel detecta** - `vercel.json` y registra el cron
3. **Verificar en Dashboard** - Vercel > Settings > Cron Jobs

### Variables de Entorno en Vercel

- `CRON_SECRET` → Configurar en Project Settings > Environment Variables

---

## 📈 Métricas Sugeridas

- **Total de detecciones diarias**
- **Usuarios con intervención activa**
- **Tasa de conversión** (usuarios que usan el chat)
- **Acciones ejecutadas** (mover, completar, eliminar)
- **Promedio de días de retraso** (antes vs después)

---

## 🎨 UI/UX Decisions

- **Colores**: Ámbar/Naranja (cálidos, no agresivos)
- **Tono**: Empático, sin juicios
- **Mensajes**: "Abrir posibilidades" no "Debes cumplir"
- **Badge Beta**: Indica que es experimental
- **Streaming**: Respuestas en tiempo real para mejor UX

---

## 🔮 Futuras Mejoras

1. **Function Calling**: IA ejecuta acciones directamente sin botones
2. **Voice Mode**: Desbloqueo por voz con Whisper
3. **Predicción**: ML para detectar patrones de procrastinación
4. **Gamificación**: Puntos cuánticos por desbloqueos exitosos
5. **Analytics**: Dashboard de métricas de desbloqueo

---

**Creado**: 26 Diciembre 2025  
**Versión**: 1.0  
**Status**: ✅ Production Ready
