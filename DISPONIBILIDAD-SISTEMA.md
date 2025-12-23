# 📅 Sistema de Disponibilidad de Mentores - Arquitectura de 3 Capas

## 🎯 Visión General

El nuevo sistema de disponibilidad implementa una **arquitectura de 3 capas** que cruza información para calcular los slots realmente disponibles:

1. **Capa Base (Rutina)**: Horario habitual semanal
2. **Capa Excepciones (Bloqueos)**: Vacaciones y días no laborales
3. **Capa Ocupación (Reservas)**: Sesiones ya confirmadas

---

## 🗄️ Estructura de Base de Datos

### Tabla 1: `DisponibilidadSemanal` (Rutina)

```sql
CREATE TABLE DisponibilidadSemanal (
  id SERIAL PRIMARY KEY,
  perfilMentorId INT,
  diaSemana INT,        -- 0=Domingo, 1=Lunes, 2=Martes, etc.
  horaInicio VARCHAR,   -- "09:00"
  horaFin VARCHAR,      -- "17:00"
  activo BOOLEAN,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**Propósito**: Define el horario habitual del mentor (ej: "Trabajo de Lunes a Viernes de 9 a 5").

---

### Tabla 2: `ExcepcionDisponibilidad` (Vacaciones/Bloqueos)

```sql
CREATE TABLE ExcepcionDisponibilidad (
  id SERIAL PRIMARY KEY,
  perfilMentorId INT,
  fechaInicio TIMESTAMP,  -- Inicio del bloqueo
  fechaFin TIMESTAMP,     -- Fin del bloqueo
  motivo VARCHAR,         -- "Vacaciones", "Conferencia", etc.
  descripcion TEXT,
  createdAt TIMESTAMP,
  updatedAt TIMESTAMP
);
```

**Propósito**: Bloquea fechas específicas (ej: "Del 24 al 31 de Diciembre no trabajo").

---

### Tabla 3: `SolicitudMentoria` (Ya existente)

**Propósito**: Reservas confirmadas que ocupan slots específicos.

---

## 🔌 Endpoints de API

### 1. Disponibilidad Semanal

#### GET `/api/mentor/disponibilidad/semanal`
Obtiene todos los bloques de horario habitual del mentor.

**Respuesta**:
```json
{
  "success": true,
  "disponibilidad": [
    {
      "id": 1,
      "diaSemana": 1,
      "horaInicio": "09:00",
      "horaFin": "12:00"
    },
    {
      "id": 2,
      "diaSemana": 1,
      "horaInicio": "14:00",
      "horaFin": "17:00"
    }
  ]
}
```

#### POST `/api/mentor/disponibilidad/semanal`
Crea un nuevo bloque de disponibilidad.

**Request**:
```json
{
  "diaSemana": 1,
  "horaInicio": "09:00",
  "horaFin": "17:00"
}
```

**Validaciones**:
- ✅ No permite solapamientos
- ✅ Verifica formato de horas

#### DELETE `/api/mentor/disponibilidad/semanal?id=123`
Elimina un bloque de horario.

**⚠️ ESTRATEGIA A: Bloqueo Preventivo**
- Si hay sesiones confirmadas en ese horario → **Error 409**
- El mentor debe cancelar/reprogramar sesiones primero
- Previene "citas huérfanas"

**Respuesta con conflicto**:
```json
{
  "error": "No puedes eliminar este horario porque tienes 2 sesión(es) confirmada(s)",
  "conflictos": [
    {
      "id": 45,
      "estudiante": "Ana Pérez",
      "fecha": "2025-12-20T10:00:00.000Z"
    }
  ]
}
```

---

### 2. Excepciones (Vacaciones/Bloqueos)

#### GET `/api/mentor/disponibilidad/excepciones`
Obtiene todos los bloqueos de fechas.

**Respuesta**:
```json
{
  "success": true,
  "excepciones": [
    {
      "id": 1,
      "fechaInicio": "2025-12-24T00:00:00.000Z",
      "fechaFin": "2025-12-31T23:59:59.999Z",
      "motivo": "Vacaciones",
      "descripcion": "Viaje familiar"
    }
  ]
}
```

#### POST `/api/mentor/disponibilidad/excepciones`
Crea un nuevo bloqueo de fechas.

**Request**:
```json
{
  "fechaInicio": "2025-12-24",
  "fechaFin": "2025-12-31",
  "motivo": "Vacaciones",
  "descripcion": "Viaje familiar"
}
```

**⚠️ Manejo de Conflictos**:

1. **Primera llamada** (sin `cancelarSesiones`):
   - Si hay sesiones confirmadas → Retorna **409** con lista de conflictos
   - Requiere confirmación del usuario

2. **Segunda llamada** (con `cancelarSesiones: true`):
   - Cancela automáticamente las sesiones afectadas
   - Notifica a los estudiantes (TODO: implementar emails)

**Respuesta con conflicto**:
```json
{
  "error": "Hay 3 sesión(es) confirmada(s) en este periodo",
  "requireConfirmation": true,
  "sesionesAfectadas": [
    {
      "id": 45,
      "estudiante": "Juan Pérez",
      "fecha": "2025-12-25T10:00:00.000Z"
    }
  ]
}
```

#### DELETE `/api/mentor/disponibilidad/excepciones?id=123`
Elimina un bloqueo de fechas (sin validaciones).

---

### 3. Cálculo de Slots Disponibles

#### GET `/api/mentor/disponibilidad/slots?mentorId=123&mes=2025-12`
Calcula los slots disponibles cruzando las 3 capas.

**Algoritmo**:
1. Genera slots basados en `DisponibilidadSemanal`
2. **RESTA** fechas bloqueadas en `ExcepcionDisponibilidad`
3. **RESTA** horarios ocupados en `SolicitudMentoria`
4. **RESTA** fechas pasadas

**Respuesta**:
```json
{
  "success": true,
  "slots": [
    {
      "fecha": "2025-12-20T09:00:00.000Z",
      "disponible": true,
      "hora": "09:00"
    },
    {
      "fecha": "2025-12-20T10:00:00.000Z",
      "disponible": true,
      "hora": "10:00"
    }
  ],
  "total": 120,
  "rango": {
    "inicio": "2025-12-01T00:00:00.000Z",
    "fin": "2025-12-31T23:59:59.999Z"
  }
}
```

---

## 🎨 Interfaz de Usuario

### Ruta: `/dashboard/mentor/disponibilidad`

**Pestaña 1: Horario Habitual**
- Configuración semanal (Lunes a Domingo)
- Agregar múltiples bloques por día
- Validación de solapamientos
- Advertencia si hay conflictos al eliminar

**Pestaña 2: Días Bloqueados**
- Date picker de rango
- Motivos predefinidos: Vacaciones, Conferencia, Personal, Médico, Otro
- Confirmación si hay sesiones afectadas
- Lista de bloqueos activos

---

## 🔒 Reglas de Negocio

### Estrategia A: Bloqueo Preventivo (Horario Habitual)

**Escenario**: Mentor intenta borrar "Lunes de 10:00 a 12:00"

**Validación**:
```sql
SELECT * FROM SolicitudMentoria 
WHERE perfilMentorId = X 
AND estado = 'CONFIRMADA' 
AND fechaHora >= NOW()
AND [cae en el horario a eliminar]
```

**Resultado**:
- ✅ Si no hay conflictos → Elimina el bloque
- ❌ Si hay conflictos → Error 409 con lista de sesiones

**Ventaja**: Responsabilidad del mentor, no hay "citas huérfanas"

---

### Estrategia B: Cancelación Automática (Vacaciones)

**Escenario**: Mentor bloquea del 15 al 20 de Diciembre

**Flujo**:
1. Sistema detecta 2 sesiones confirmadas en ese rango
2. Modal pregunta: "¿Deseas cancelar estas sesiones?"
3. Si confirma:
   - Cambia estado a `CANCELADA`
   - Guarda motivo: "Cancelada automáticamente: Vacaciones"
   - Envía emails a estudiantes (TODO)

**Ventaja**: Rápido para el mentor, automático
**Desventaja**: Puede molestar a los estudiantes (usar solo para excepciones puntuales)

---

## 📊 Flujo Completo de Ejemplo

### Configuración del Mentor:

1. **Horario Base**:
   - Lunes: 09:00 - 17:00
   - Martes: 09:00 - 17:00
   - Miércoles: 09:00 - 12:00

2. **Excepción**:
   - 25 de Diciembre: Bloqueado (Navidad)

3. **Reservas Confirmadas**:
   - Lunes 23 Dic, 10:00 - Ana Pérez
   - Martes 24 Dic, 14:00 - Juan López

### Cálculo de Slots para Semana del 23-25 Dic:

```
Lunes 23:
  09:00 ✅ Disponible
  10:00 ❌ Reservado (Ana Pérez)
  11:00 ✅ Disponible
  ...
  
Martes 24:
  09:00 ✅ Disponible
  ...
  14:00 ❌ Reservado (Juan López)
  15:00 ✅ Disponible
  
Miércoles 25:
  ❌ ❌ ❌ TODO EL DÍA BLOQUEADO (Navidad)
```

---

## 🚀 Cómo Integrar

### En el Sidebar del Mentor:
```tsx
{
  label: 'Disponibilidad',
  path: '/dashboard/mentor/disponibilidad',
  icon: Calendar
}
```

### En el Sistema de Reservas (Estudiante):
```tsx
// Reemplazar llamada actual por:
const res = await fetch(`/api/mentor/disponibilidad/slots?mentorId=${mentorId}&mes=${mes}`);
const { slots } = await res.json();

// Renderizar solo slots disponibles
{slots.map(slot => (
  <SlotButton fecha={slot.fecha} hora={slot.hora} />
))}
```

---

## ✅ Checklist de Implementación

- [x] Crear tablas en Prisma Schema
- [x] Migración de base de datos (`prisma db push`)
- [x] Endpoint: GET/POST/DELETE `/disponibilidad/semanal`
- [x] Endpoint: GET/POST/DELETE `/disponibilidad/excepciones`
- [x] Endpoint: GET `/disponibilidad/slots` (con algoritmo de 3 capas)
- [x] Interfaz UI: Pestaña "Horario Habitual"
- [x] Interfaz UI: Pestaña "Días Bloqueados"
- [x] Validación de conflictos (Estrategia A)
- [x] Modal de confirmación para cancelaciones
- [ ] Agregar link en Sidebar del mentor
- [ ] Integrar en sistema de reservas del estudiante
- [ ] Implementar envío de emails de notificación
- [ ] Testing end-to-end

---

## 📝 Notas de Migración

### Campos Antiguos (PerfilMentor):
- `horarioInicio`: String
- `horarioFin`: String  
- `diasDisponibles`: Int[]

**Status**: Se mantienen por compatibilidad, pero el nuevo sistema usa las tablas dedicadas.

**Migración**: Los mentores deberán configurar su disponibilidad en el nuevo panel.

---

## 🐛 Troubleshooting

### Problema: Slots no aparecen
**Causa**: Mentor no ha configurado disponibilidad semanal
**Solución**: Verificar que existan registros en `DisponibilidadSemanal`

### Problema: Error al eliminar horario
**Causa**: Sesiones confirmadas en ese horario
**Solución**: Reprogramar o cancelar sesiones manualmente primero

### Problema: Slots duplicados
**Causa**: Solapamiento en bloques de disponibilidad
**Solución**: Revisar y eliminar bloques solapados

---

## 📧 TODOs Pendientes

1. **Emails de Notificación**:
   - Enviar email cuando se cancela sesión por vacaciones
   - Plantilla: "Tu mentor canceló la sesión del [fecha] por [motivo]"

2. **Migración de Datos**:
   - Script para migrar `horarioInicio/horarioFin` → `DisponibilidadSemanal`
   - Script para migrar `diasDisponibles` → bloques semanales

3. **Optimizaciones**:
   - Cache de slots calculados (Redis)
   - Índices en fechas para queries rápidas

4. **Features Futuras**:
   - Bloqueos recurrentes (ej: "Todos los domingos")
   - Horarios excepcionales positivos (disponibilidad fuera de rutina)
   - Sistema de buffer entre sesiones (15 min de descanso)

---

## 🎉 Beneficios del Nuevo Sistema

✅ **Para Mentores**:
- Control total sobre disponibilidad
- Fácil gestión de vacaciones
- Prevención de conflictos de agenda

✅ **Para Estudiantes**:
- Slots siempre precisos
- No más reservas en fechas bloqueadas
- Mejor experiencia de usuario

✅ **Para la Plataforma**:
- Lógica centralizada y escalable
- Menos errores de doble reserva
- Trazabilidad completa de cambios
