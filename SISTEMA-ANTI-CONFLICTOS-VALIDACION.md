# 🛡️ SISTEMA DE VALIDACIÓN Y ANTI-CONFLICTOS - Reservas de Mentorías
**Fecha de Implementación:** 17 de Diciembre 2025  
**Prioridad:** ALTA - Crítico para evitar errores de agenda  
**Estado:** ✅ IMPLEMENTADO

---

## 📋 TABLA DE CONTENIDOS

1. [Resumen Ejecutivo](#resumen-ejecutivo)
2. [Reglas de Negocio](#reglas-de-negocio)
3. [Arquitectura de Validación](#arquitectura-de-validación)
4. [Implementación Técnica](#implementación-técnica)
5. [Casos de Prueba](#casos-de-prueba)
6. [Manejo de Errores](#manejo-de-errores)
7. [Migraciones de Base de Datos](#migraciones-de-base-de-datos)

---

## 🎯 RESUMEN EJECUTIVO

### Problema Original
El sistema permitía crear solicitudes de mentoría incompletas o conflictivas:
- ❌ Reservas sin fecha/hora definida ("Por confirmar --")
- ❌ Dos estudiantes podían reservar el mismo horario con un mentor
- ❌ Un estudiante podía reservar sesiones simultáneas con mentores diferentes
- ❌ Falta de validación en frontend permitía envíos incompletos

### Solución Implementada
Sistema de validación en **4 capas** que previene conflictos en tiempo real:

✅ **Capa 1:** Validación de UI (Botón deshabilitado sin fecha/hora)  
✅ **Capa 2:** Validación de API (400 Bad Request si faltan datos)  
✅ **Capa 3:** Validación de Disponibilidad del Mentor (409 Conflict)  
✅ **Capa 4:** Validación de Disponibilidad del Estudiante (409 Conflict)  
✅ **Capa 5:** Restricciones UNIQUE en Base de Datos (Prevención de Race Conditions)

---

## 📜 REGLAS DE NEGOCIO

### Regla 1: Campos Obligatorios
**Descripción:** "Un usuario NO puede enviar una solicitud de reserva si no ha seleccionado explícitamente una fecha y una hora válida."

**Implementación:**
- **Frontend:** Botón "Solicitar Reserva" deshabilitado hasta que ambos campos tengan valor
- **Backend:** API retorna `400 Bad Request` con código `MISSING_DATETIME`

**Impacto:**
- Elimina tarjetas con estado "Por confirmar --"
- Mejora UX con mensajes claros
- Reduce errores de coordinación

---

### Regla 2: Bloqueo de Slots del Mentor
**Descripción:** "Una vez que un horario es reservado (incluso si está en estado 'Pendiente'), ese bloque debe desaparecer del selector de horarios para cualquier otro usuario."

**Implementación:**
```typescript
// API: /api/student/booking/slots
// Excluir horarios ocupados en SolicitudMentoria
const existingMentorias = await prisma.solicitudMentoria.findMany({
  where: {
    perfilMentorId: mentorId,
    fechaSolicitada: selectedDate,
    estado: { in: ['PENDIENTE', 'CONFIRMADA'] },
    horaSolicitada: { not: null }
  }
});
```

**Estados que bloquean:**
- ✅ `PENDIENTE` - Desde el momento que se solicita
- ✅ `CONFIRMADA` - Confirmada por el mentor
- ❌ `COMPLETADA` - Ya pasó, no bloquea futuros
- ❌ `CANCELADA` - Liberada, disponible de nuevo
- ❌ `RECHAZADA` - No consumió el slot

**Objetivo:** Evitar double-booking del lado del mentor

---

### Regla 3: Anti-Ubiquidad del Estudiante
**Descripción:** "El sistema debe impedir que un participante reserve dos mentorías diferentes a la misma hora exacta, incluso si son con mentores distintos."

**Implementación:**
```typescript
// API: /api/mentorias/solicitar (POST)
const conflictoEstudiante = await prisma.solicitudMentoria.findFirst({
  where: {
    clienteId: currentUserId,
    fechaSolicitada: fecha,
    horaSolicitada: hora,
    estado: { in: ['PENDIENTE', 'CONFIRMADA'] }
  }
});

if (conflictoEstudiante) {
  return { error: "Ya tienes una sesión a esta hora con [Mentor X]" };
}
```

**Mensaje de Error:**
> ⚠️ Ya tienes una sesión programada a esta hora con **Tony Senior Stark**.  
> 💡 Por favor elige otro horario o cancela tu sesión anterior.

**Objetivo:** Prevenir que el estudiante se duplique físicamente

---

### Regla 4: Validación de Fechas Pasadas
**Descripción:** "No se pueden agendar sesiones en el pasado."

**Implementación:**
```typescript
const fechaDate = new Date(fechaSolicitada);
const ahora = new Date();

if (fechaDate < ahora) {
  return { error: 'No puedes agendar sesiones en el pasado', status: 400 };
}
```

---

## 🏗️ ARQUITECTURA DE VALIDACIÓN

### Flujo de Validación Completo

```
┌─────────────────────────────────────────────────────────────┐
│ FRONTEND (app/dashboard/mentorias/page.tsx)                │
│                                                              │
│ 1. Usuario selecciona fecha + hora                         │
│ 2. Botón habilitado solo si ambos campos llenos            │
│ 3. onClick → solicitarMentoria()                           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼ POST /api/mentorias/solicitar
┌─────────────────────────────────────────────────────────────┐
│ BACKEND (app/api/mentorias/solicitar/route.ts)             │
│                                                              │
│ ✅ Validación 1: Campos requeridos                          │
│    if (!fechaSolicitada || !horaSolicitada)                │
│      → 400 Bad Request                                      │
│                                                              │
│ ✅ Validación 2: Fecha válida y futura                      │
│    if (fecha < ahora) → 400 Bad Request                    │
│                                                              │
│ ✅ Validación 3: Slot disponible en Mentor                  │
│    Query: Buscar conflictos en fechaSolicitada + hora      │
│    if (conflicto) → 409 Conflict                           │
│                                                              │
│ ✅ Validación 4: Estudiante disponible                      │
│    Query: Buscar si tiene otra sesión a esa hora           │
│    if (conflicto) → 409 Conflict                           │
│                                                              │
│ ✅ Validación 5: Crear reserva en DB                        │
│    → Constraint UNIQUE previene race conditions            │
└─────────────────────────────────────────────────────────────┘
                   │
                   ▼ SUCCESS
┌─────────────────────────────────────────────────────────────┐
│ RESPUESTA AL FRONTEND                                        │
│                                                              │
│ { success: true, solicitud: { ... } }                       │
│ → Mostrar animación de éxito                                │
│ → Redirigir a /dashboard/student/mis-sesiones              │
└─────────────────────────────────────────────────────────────┘
```

---

## 💻 IMPLEMENTACIÓN TÉCNICA

### Archivo 1: `/app/api/mentorias/solicitar/route.ts`

**Cambios Realizados:**

```typescript
// 🛡️ VALIDACIÓN 1: Campos requeridos
if (!perfilMentorId || !servicioId) {
  return NextResponse.json(
    { error: 'Datos incompletos: Debes seleccionar un servicio' },
    { status: 400 }
  );
}

// 🛡️ VALIDACIÓN 2: Fecha y Hora obligatorias
if (!fechaSolicitada || !horaSolicitada) {
  return NextResponse.json(
    { 
      error: 'Debes seleccionar una fecha y hora específica para tu sesión',
      code: 'MISSING_DATETIME'
    },
    { status: 400 }
  );
}

// Validar formato y que no sea pasada
const fechaDate = new Date(fechaSolicitada);
if (isNaN(fechaDate.getTime())) {
  return NextResponse.json({ error: 'Fecha inválida' }, { status: 400 });
}

const ahora = new Date();
if (fechaDate < ahora) {
  return NextResponse.json(
    { error: 'No puedes agendar sesiones en el pasado' },
    { status: 400 }
  );
}

// 🛡️ VALIDACIÓN 3: Anti-Double-Booking del Mentor
const conflictoMentor = await prisma.solicitudMentoria.findFirst({
  where: {
    perfilMentorId,
    fechaSolicitada: fechaDate,
    horaSolicitada,
    estado: { in: ['PENDIENTE', 'CONFIRMADA'] }
  }
});

if (conflictoMentor) {
  return NextResponse.json(
    { 
      error: 'Este horario ya no está disponible. Otro estudiante lo reservó primero.',
      code: 'MENTOR_SLOT_TAKEN',
      suggestion: 'Por favor selecciona otro horario'
    },
    { status: 409 }
  );
}

// 🛡️ VALIDACIÓN 4: Anti-Ubiquidad del Estudiante
const conflictoEstudiante = await prisma.solicitudMentoria.findFirst({
  where: {
    clienteId: session.user.id,
    fechaSolicitada: fechaDate,
    horaSolicitada,
    estado: { in: ['PENDIENTE', 'CONFIRMADA'] }
  },
  include: {
    PerfilMentor: {
      include: { Usuario: { select: { nombre: true } } }
    }
  }
});

if (conflictoEstudiante) {
  const mentorConflicto = conflictoEstudiante.PerfilMentor.Usuario.nombre;
  return NextResponse.json(
    { 
      error: `Ya tienes una sesión programada a esta hora con ${mentorConflicto}.`,
      code: 'STUDENT_TIME_CONFLICT',
      suggestion: 'Por favor elige otro horario o cancela tu sesión anterior'
    },
    { status: 409 }
  );
}
```

**Códigos de Error:**
- `MISSING_DATETIME` - Falta fecha u hora
- `MENTOR_SLOT_TAKEN` - Horario ya reservado por otro estudiante
- `STUDENT_TIME_CONFLICT` - Estudiante tiene otra sesión a esa hora

---

### Archivo 2: `/app/api/student/booking/slots/route.ts`

**Cambios Realizados:**

```typescript
// 2B. 🛡️ ANTI-CONFLICTO: Obtener SolicitudesMentoria confirmadas/pendientes
const existingMentorias = await prisma.solicitudMentoria.findMany({
  where: {
    perfilMentorId: Number(mentorId),
    fechaSolicitada: {
      gte: startOfDayDate,
      lt: addMinutes(startOfDayDate, 24 * 60)
    },
    estado: {
      in: ['PENDIENTE', 'CONFIRMADA'] // Bloqueamos desde que se solicita
    },
    horaSolicitada: { not: null } // Solo bloquear si tiene hora definida
  }
});

// Combinar horarios ocupados de ambas fuentes
const busyTimes = [
  ...existingBookings.map(b => format(b.scheduledAt, 'HH:mm')),
  ...existingMentorias.map(m => m.horaSolicitada).filter(Boolean)
];

console.log(`🚫 Horarios ocupados para ${dateStr} (${busyTimes.length} slots):`, busyTimes);
```

**Impacto:**
- Slots ocupados por SolicitudMentoria (mentorías) ahora se excluyen del selector
- Slots ocupados por CallBooking (disciplina) también se excluyen
- Ambos sistemas comparten lógica de disponibilidad

---

### Archivo 3: `/app/dashboard/mentorias/page.tsx`

**Cambios Realizados:**

#### A) Botón deshabilitado sin fecha/hora

```tsx
<button
  onClick={solicitarMentoria}
  disabled={procesando || !servicioSeleccionado || !fechaSolicitada || !horaSolicitada}
  className="..."
>
  {procesando ? 'Procesando...' : 'Pagar y Agendar'}
</button>

{/* Mensaje de ayuda */}
{servicioSeleccionado && (!fechaSolicitada || !horaSolicitada) && (
  <p className="text-amber-400 flex items-center gap-2">
    <AlertCircle size={16} />
    Selecciona fecha y hora para continuar
  </p>
)}
```

#### B) Manejo de errores mejorado

```typescript
const solicitarMentoria = async () => {
  // ... fetch ...
  const data = await res.json();

  if (data.success) {
    setShowSuccess(true);
    router.push('/dashboard/student/mis-sesiones');
  } else {
    // Manejar errores específicos
    if (data.code === 'MISSING_DATETIME') {
      alert('⚠️ Por favor selecciona una fecha y hora específica.');
    } else if (data.code === 'MENTOR_SLOT_TAKEN') {
      alert(`❌ ${data.error}\n\n💡 ${data.suggestion}`);
      setFechaSolicitada('');
      setHoraSolicitada('');
    } else if (data.code === 'STUDENT_TIME_CONFLICT') {
      alert(`⚠️ ${data.error}\n\n💡 ${data.suggestion}`);
    } else {
      alert('Error: ' + data.error);
    }
  }
};
```

---

## 🧪 CASOS DE PRUEBA

### Caso 1: Validación de Campos (Frontend)
**Escenario:** Usuario intenta agendar sin seleccionar hora

| Acción | Resultado Esperado |
|--------|-------------------|
| Usuario selecciona solo fecha | ❌ Botón "Pagar y Agendar" DESHABILITADO |
| Usuario selecciona solo hora | ❌ Botón "Pagar y Agendar" DESHABILITADO |
| Usuario selecciona ambos | ✅ Botón HABILITADO |

**Mensaje mostrado:**  
> ⚠️ Selecciona fecha y hora para continuar

---

### Caso 2: Validación de Campos (Backend)
**Escenario:** Bypass del frontend (Postman/curl)

```bash
# Request con fecha pero sin hora
curl -X POST /api/mentorias/solicitar \
  -H "Content-Type: application/json" \
  -d '{
    "perfilMentorId": 1,
    "servicioId": 2,
    "fechaSolicitada": "2025-12-20",
    "horaSolicitada": null
  }'

# Respuesta esperada
{
  "error": "Debes seleccionar una fecha y hora específica para tu sesión",
  "code": "MISSING_DATETIME"
}
# Status: 400 Bad Request
```

---

### Caso 3: Double-Booking del Mentor
**Escenario:** Dos estudiantes intentan reservar el mismo horario

**Timeline:**
1. **10:00:00** - Estudiante A solicita: Dr. Strange @ 2025-12-20 14:00
2. **10:00:05** - API crea SolicitudMentoria (estado: PENDIENTE)
3. **10:00:10** - Estudiante B solicita: Dr. Strange @ 2025-12-20 14:00
4. **10:00:12** - API detecta conflicto → **409 Conflict**

**Respuesta a Estudiante B:**
```json
{
  "error": "Este horario ya no está disponible. Otro estudiante lo reservó primero.",
  "code": "MENTOR_SLOT_TAKEN",
  "suggestion": "Por favor selecciona otro horario"
}
```

**UI Behavior:**
- Alert con mensaje de error
- Resetea campos de fecha/hora
- Usuario debe seleccionar nuevo horario

---

### Caso 4: Anti-Ubiquidad del Estudiante
**Escenario:** Estudiante intenta reservar dos sesiones simultáneas

**Timeline:**
1. **09:00** - Juan tiene sesión CONFIRMADA con Tony Stark @ 2025-12-20 15:00
2. **09:30** - Juan intenta reservar con Dr. Strange @ 2025-12-20 15:00
3. **API** - Detecta conflicto → **409 Conflict**

**Respuesta:**
```json
{
  "error": "Ya tienes una sesión programada a esta hora con Tony Senior Stark.",
  "code": "STUDENT_TIME_CONFLICT",
  "suggestion": "Por favor elige otro horario o cancela tu sesión anterior"
}
```

---

### Caso 5: Race Condition (Simultáneo)
**Escenario:** Dos estudiantes dan click al MISMO milisegundo

**Sin Constraint UNIQUE (Problema):**
```
T+0ms: Request A inicia
T+0ms: Request B inicia
T+50ms: Query A no encuentra conflicto ✅
T+52ms: Query B no encuentra conflicto ✅
T+100ms: INSERT A ejecuta
T+102ms: INSERT B ejecuta
❌ RESULTADO: Dos reservas en DB para el mismo horario
```

**Con Constraint UNIQUE (Solución):**
```
T+0ms: Request A inicia
T+0ms: Request B inicia
T+50ms: Query A no encuentra conflicto ✅
T+52ms: Query B no encuentra conflicto ✅
T+100ms: INSERT A ejecuta → SUCCESS
T+102ms: INSERT B ejecuta → ERROR 23505 (unique_violation)
✅ RESULTADO: Solo Request A guardada, B recibe error
```

**Handling en Backend:**
```typescript
try {
  await prisma.solicitudMentoria.create({ ... });
} catch (error) {
  if (error.code === 'P2002') { // Prisma Unique constraint violation
    return NextResponse.json({
      error: 'Este horario acaba de ser reservado por otro usuario',
      code: 'RACE_CONDITION_CONFLICT'
    }, { status: 409 });
  }
}
```

---

## ⚠️ MANEJO DE ERRORES

### Códigos HTTP

| Código | Significado | Cuándo Ocurre |
|--------|-------------|--------------|
| `200` | OK | Reserva creada exitosamente |
| `400` | Bad Request | Falta fecha/hora, formato inválido, fecha pasada |
| `401` | Unauthorized | Usuario no autenticado |
| `404` | Not Found | Servicio no existe o inactivo |
| `409` | Conflict | Horario ocupado, estudiante con conflicto |
| `500` | Server Error | Error de base de datos, error inesperado |

---

### Códigos de Error Personalizados

| Code | Descripción | Acción del Usuario |
|------|-------------|-------------------|
| `MISSING_DATETIME` | Falta fecha u hora | Seleccionar ambos campos |
| `MENTOR_SLOT_TAKEN` | Horario ya reservado por otro | Elegir otro horario |
| `STUDENT_TIME_CONFLICT` | Usuario tiene otra sesión | Elegir otro horario o cancelar anterior |
| `RACE_CONDITION_CONFLICT` | Reservado en el último segundo | Recargar página y elegir otro |

---

### Mensajes de Usuario (UX)

```typescript
// ✅ Éxito
"¡Solicitud Enviada! El mentor se pondrá en contacto contigo pronto"

// ⚠️ Validación de campos
"Por favor selecciona una fecha y hora específica para tu sesión"

// ❌ Horario ocupado
"Este horario ya no está disponible. Otro estudiante lo reservó primero.
💡 Por favor selecciona otro horario"

// ⚠️ Conflicto de estudiante
"Ya tienes una sesión programada a esta hora con Tony Senior Stark.
💡 Por favor elige otro horario o cancela tu sesión anterior"

// ❌ Fecha pasada
"No puedes agendar sesiones en el pasado"
```

---

## 🗄️ MIGRACIONES DE BASE DE DATOS

### Restricción UNIQUE Compuesta

**Archivo:** `prisma/migrations/ANTI_CONFLICTO_UNIQUE_CONSTRAINT.sql`

#### Índice 1: Prevenir Double-Booking del Mentor

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_mentor_datetime_active" 
ON "SolicitudMentoria" ("perfilMentorId", "fechaSolicitada", "horaSolicitada")
WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
  AND "horaSolicitada" IS NOT NULL;
```

**Propósito:** Un mentor NO puede tener dos sesiones activas al mismo tiempo

---

#### Índice 2: Prevenir Ubiquidad del Estudiante

```sql
CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_student_datetime_active" 
ON "SolicitudMentoria" ("clienteId", "fechaSolicitada", "horaSolicitada")
WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
  AND "horaSolicitada" IS NOT NULL;
```

**Propósito:** Un estudiante NO puede estar en dos lugares al mismo tiempo

---

#### Índice 3: Optimización de Performance

```sql
CREATE INDEX IF NOT EXISTS "idx_solicitud_mentor_fecha_estado" 
ON "SolicitudMentoria" ("perfilMentorId", "fechaSolicitada", "estado", "horaSolicitada");
```

**Propósito:** Acelerar queries de disponibilidad en `/api/student/booking/slots`

---

### Aplicación de Migración

```bash
# 1. Backup de base de datos
pg_dump -U username -d plataforma_frutos > backup_before_unique.sql

# 2. Verificar conflictos existentes (ejecutar sección 5 del archivo SQL)
psql -U username -d plataforma_frutos -f ANTI_CONFLICTO_UNIQUE_CONSTRAINT.sql

# 3. Si no hay conflictos, aplicar índices
# (El archivo SQL ya incluye todas las secciones)

# 4. Verificar aplicación
psql -U username -d plataforma_frutos -c "
  SELECT indexname, indexdef 
  FROM pg_indexes 
  WHERE tablename = 'SolicitudMentoria' 
    AND indexname LIKE 'idx_unique%';
"
```

---

## 📊 MÉTRICAS Y MONITOREO

### Queries de Monitoreo

#### Detectar Conflictos Existentes
```sql
-- Mentores con horarios duplicados
SELECT "perfilMentorId", "fechaSolicitada", "horaSolicitada", COUNT(*) as conflictos
FROM "SolicitudMentoria"
WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
  AND "horaSolicitada" IS NOT NULL
GROUP BY "perfilMentorId", "fechaSolicitada", "horaSolicitada"
HAVING COUNT(*) > 1;
```

#### Tasa de Errores 409 (Conflicts)
```sql
-- Crear tabla de logs si no existe
CREATE TABLE IF NOT EXISTS "ErrorLogs" (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50),
  endpoint VARCHAR(255),
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Query semanal de conflictos
SELECT 
  code,
  COUNT(*) as total,
  DATE_TRUNC('day', timestamp) as dia
FROM "ErrorLogs"
WHERE code IN ('MENTOR_SLOT_TAKEN', 'STUDENT_TIME_CONFLICT')
  AND timestamp >= NOW() - INTERVAL '7 days'
GROUP BY code, dia
ORDER BY dia DESC;
```

---

## ✅ CHECKLIST DE VERIFICACIÓN

### Validación de Implementación

- [x] **Frontend:** Botón deshabilitado sin fecha/hora
- [x] **Frontend:** Mensaje de ayuda visible cuando falta dato
- [x] **Frontend:** Manejo de errores con códigos específicos
- [x] **Backend:** Validación de campos obligatorios (400)
- [x] **Backend:** Validación de fechas pasadas (400)
- [x] **Backend:** Anti-double-booking mentor (409)
- [x] **Backend:** Anti-ubiquidad estudiante (409)
- [x] **API Slots:** Filtrado de SolicitudMentoria en horarios
- [x] **API Slots:** Combinación de CallBooking + SolicitudMentoria
- [x] **Migración SQL:** Índice UNIQUE mentor+datetime
- [x] **Migración SQL:** Índice UNIQUE estudiante+datetime
- [x] **Migración SQL:** Índice de performance
- [x] **Documentación:** Completa y actualizada

---

## 🚀 PRÓXIMOS PASOS

### Mejoras Futuras Recomendadas

1. **Sistema de Cola (Queue)**
   - Si horario se libera (cancelación), notificar a usuarios en lista de espera
   
2. **Caché de Disponibilidad**
   - Redis para evitar queries repetidas de slots disponibles
   
3. **Notificaciones Real-Time**
   - WebSocket para actualizar UI cuando slot es reservado por otro usuario
   
4. **Analytics Dashboard**
   - Métricas de horarios más solicitados
   - Tasa de conflictos por mentor
   - Horas pico de reservas

5. **Tests Automatizados**
   - Unit tests para cada validación
   - Integration tests para race conditions
   - E2E tests con Playwright simulando double-booking

---

## 📞 CONTACTO Y SOPORTE

**Desarrollador:** GitHub Copilot AI  
**Fecha:** 17 de Diciembre 2025  
**Versión:** 1.0.0  
**Estado:** ✅ Producción  

---

**FIN DE DOCUMENTACIÓN**
