# 💼 Sistema de Gestión de Sesiones de Mentoría

## Descripción General

Sistema completo que maneja todo el ciclo de vida de una sesión de mentoría pagada:
1. **Reserva** - Estudiante reserva y paga
2. **Retención** - Dinero en custodia (HELD)
3. **Realización** - Mentor imparte la sesión
4. **Completado** - Mentor confirma y cobra (RELEASED)
5. **Review** - Estudiante califica la experiencia

---

## 🔄 Flujo Completo

```
ESTUDIANTE                SISTEMA                 MENTOR
    |                        |                       |
    | 1. Reserva sesión      |                       |
    |----------------------->|                       |
    | (Paga $1500)           |                       |
    |                        |                       |
    |                        | Transaction HELD      |
    |                        | ($1050 retenido)      |
    |                        |                       |
    |                        | ... Sesión ocurre ... |
    |                        |                       |
    |                        |  2. Completa sesión   |
    |                        |<----------------------|
    |                        |                       |
    |                        | Transaction RELEASED  |
    |                        | ($1050 disponible)    |
    |                        |                       |
    |                        | 🏅 Actualiza insignias|
    |                        |                       |
    | 3. Califica (5⭐)      |                       |
    |----------------------->|                       |
    |                        |                       |
    |                        | 📊 Actualiza stats    |
    |                        |                       |
    |                        | 🏅 Re-evalúa insignias|
```

---

## 📦 Componentes Implementados

### 1. **SessionManager** (Componente para Mentores)

**Ubicación:** `components/dashboard/mentor/SessionManager.tsx`

**Funcionalidad:**
- Lista sesiones pendientes de completar
- Solo muestra sesiones que ya ocurrieron
- Botón "Terminar y Cobrar" para liberar pago
- Integración con sistema de insignias
- Indicadores visuales (MENTORSHIP vs DISCIPLINE)

**Uso:**
```tsx
import SessionManager from '@/components/dashboard/mentor/SessionManager';

// En la página del dashboard del mentor
<SessionManager mentorId={session.user.id} />
```

**APIs que consume:**
- `GET /api/mentor/sessions` - Cargar sesiones pendientes
- `POST /api/mentor/complete-session` - Completar sesión

---

### 2. **ReviewModal** (Componente para Estudiantes)

**Ubicación:** `components/dashboard/student/ReviewModal.tsx`

**Funcionalidad:**
- Modal elegante para calificar sesiones
- 5 estrellas interactivas con hover
- Checkbox "Compartió recursos" (para insignia ERUDITO)
- Comentario obligatorio (min 10 caracteres)
- Validaciones integradas

**Uso:**
```tsx
import ReviewModal from '@/components/dashboard/student/ReviewModal';

const [showReview, setShowReview] = useState(false);

{showReview && (
  <ReviewModal
    bookingId={session.id}
    mentorName={mentorName}
    onClose={() => setShowReview(false)}
    onSuccess={() => {
      // Opcional: recargar datos
    }}
  />
)}
```

**API que consume:**
- `POST /api/student/review` - Crear reseña

---

## 🔌 APIs Implementadas

### 1. GET /api/mentor/sessions

**Descripción:** Obtiene sesiones pendientes de completar del mentor

**Autenticación:** Requiere sesión activa + rol MENTOR

**Filtros aplicados:**
- Status: PENDING o CONFIRMED
- Fecha: Solo sesiones que ya pasaron (`scheduledAt <= now`)

**Response:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": 123,
      "studentName": "Juan Pérez",
      "studentEmail": "juan@example.com",
      "scheduledAt": "2025-12-16T10:00:00.000Z",
      "duration": 60,
      "status": "CONFIRMED",
      "type": "MENTORSHIP",
      "meetingLink": "https://zoom.us/..."
    }
  ],
  "total": 1
}
```

---

### 2. POST /api/mentor/complete-session

**Descripción:** Completa una sesión y libera el pago al mentor

**Autenticación:** Requiere sesión activa + rol MENTOR

**Request Body:**
```json
{
  "bookingId": 123
}
```

**Validaciones:**
- El booking debe existir
- Debe pertenecer al mentor autenticado
- No debe estar ya completado
- La fecha programada debe haber pasado

**Proceso:**
1. Marca `CallBooking.status = COMPLETED`
2. Registra `CallBooking.completedAt`
3. Si es MENTORSHIP: Cambia `Transaction.status = RELEASED`
4. Registra `Transaction.releasedAt`
5. Dispara evaluación de insignias (async)

**Response exitosa:**
```json
{
  "success": true,
  "message": "Sesión completada exitosamente",
  "booking": {
    "id": 123,
    "status": "COMPLETED",
    "completedAt": "2025-12-16T15:30:00.000Z"
  },
  "payment": {
    "released": true,
    "amount": 1050,
    "message": "Se liberaron $1050 a tu cuenta"
  },
  "student": {
    "name": "Juan Pérez",
    "message": "El estudiante ahora puede calificarte"
  }
}
```

---

### 3. POST /api/student/review

**Descripción:** Crea una reseña para una sesión completada

**Autenticación:** Requiere sesión activa

**Request Body:**
```json
{
  "bookingId": 123,
  "rating": 5,
  "comment": "Excelente sesión, muy útil!",
  "sharedResources": true
}
```

**Validaciones:**
- Booking debe existir y pertenecer al estudiante
- Status debe ser COMPLETED
- Rating entre 1 y 5
- Comentario mínimo 10 caracteres

**Proceso:**
1. Crea `SolicitudMentoria` (requerido por schema)
2. Crea `ResenasMentoria` con los datos
3. Recalcula `PerfilMentor.calificacionPromedio`
4. Actualiza `PerfilMentor.totalResenas`
5. Dispara evaluación de insignias (async)

**Response exitosa:**
```json
{
  "success": true,
  "message": "¡Gracias por tu review!",
  "review": {
    "id": 456,
    "rating": 5,
    "comment": "Excelente sesión..."
  },
  "mentorStats": {
    "newAverage": 4.8,
    "totalReviews": 15
  }
}
```

---

## 🏅 Integración con Sistema de Insignias

### Disparadores Automáticos

**Al completar sesión:**
```typescript
checkAndAwardBadges(mentorId);
```

**Insignias afectadas:**
- 🛡️ **INQUEBRANTABLE** - 5 sesiones consecutivas sin faltas
- ⚡ **FLASH** - 80%+ de bookings confirmados

**Al recibir review:**
```typescript
checkAndAwardBadges(mentorId);
```

**Insignias afectadas:**
- 📚 **ERUDITO** - 3+ reviews donde compartió recursos
- 🧘 **ZEN_MASTER** - 10+ reviews con rating >= 4.8

---

## 💰 Integración con Sistema Financiero

### Estados de Transacción

```typescript
HELD      → Dinero retenido (sesión pendiente)
RELEASED  → Dinero liberado al mentor (sesión completada)
REFUNDED  → Dinero devuelto al estudiante (cancelación)
```

### Flujo de Dinero

```
Estudiante paga: $1500
├── Plataforma (30%): $450
└── Mentor (70%): $1050 ← Se libera al completar
```

### Consultas Útiles

**Balance pendiente de un mentor:**
```typescript
const pending = await prisma.transaction.aggregate({
  _sum: { mentorEarnings: true },
  where: {
    booking: { mentorId },
    status: 'HELD'
  }
});
// $pending._sum.mentorEarnings = Dinero en espera
```

**Balance disponible para retiro:**
```typescript
const available = await prisma.transaction.aggregate({
  _sum: { mentorEarnings: true },
  where: {
    booking: { mentorId },
    status: 'RELEASED'
  }
});
// $available._sum.mentorEarnings = Dinero disponible
```

---

## 🧪 Testing

### Script de Prueba Completo

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-flujo-completo.ts
```

**Verifica:**
- ✅ Creación de reserva con transacción
- ✅ Completado de sesión
- ✅ Liberación de pago
- ✅ Sistema de reviews
- ✅ Actualización de stats
- ✅ Sistema de insignias

**Output esperado:**
```
🎬 TEST: Flujo Completo de Sesión de Mentoría

👨‍🏫 Mentor: Ana Marina Lara (ID: 21)
🎓 Estudiante: Aldo 1 (ID: 17)

📝 PASO 1: Crear reserva con transacción...
✅ Reserva creada: Booking #4
💰 Transacción: $1500 (HELD)

📝 PASO 2: Completar sesión y liberar pago...
✅ Sesión completada
💸 Pago liberado: $1050 disponible

📝 PASO 3: Verificar sistema de reviews...
📝 El estudiante puede calificar la sesión

🎉 TEST COMPLETADO EXITOSAMENTE
```

---

## 📊 Ejemplo de Uso Real

### 1. Mentor ve sesiones pendientes

```tsx
// En el dashboard del mentor
<SessionManager mentorId={session.user.id} />
```

### 2. Mentor completa sesión

Click en "Terminar y Cobrar" →
- Backend libera $1050
- Actualiza insignias
- Notifica al estudiante

### 3. Estudiante califica

```tsx
// Mostrar botón solo si status = COMPLETED
{booking.status === 'COMPLETED' && (
  <button onClick={() => setShowReview(true)}>
    ⭐ Calificar Sesión
  </button>
)}

{showReview && (
  <ReviewModal
    bookingId={booking.id}
    mentorName={booking.mentorName}
    onClose={() => setShowReview(false)}
  />
)}
```

---

## 🔐 Seguridad

### Validaciones Implementadas

**En completar sesión:**
- ✅ Solo el mentor dueño puede completar
- ✅ No se puede completar si no ha ocurrido
- ✅ No se puede completar dos veces

**En crear review:**
- ✅ Solo el estudiante de la sesión
- ✅ Solo sesiones completadas
- ✅ Validación de datos (rating, comment)

---

## 🚀 Estado del Sistema

- ✅ `SessionManager` componente creado
- ✅ `ReviewModal` componente creado
- ✅ API `GET /api/mentor/sessions` funcional
- ✅ API `POST /api/mentor/complete-session` funcional
- ✅ API `POST /api/student/review` funcional
- ✅ Integración con sistema de transacciones
- ✅ Integración con sistema de insignias
- ✅ Actualización automática de stats
- ✅ Script de testing completo
- ✅ Validaciones de seguridad

---

**Fecha:** 16 de diciembre de 2025  
**Estado:** Sistema completo implementado y probado 💼✨
