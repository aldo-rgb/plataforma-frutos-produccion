# 🌅 Sistema de Disciplina - Club 5 AM

Sistema completo de accountability para llamadas matutinas con gestión de asistencias y sistema de 3 strikes automático.

## 📋 Arquitectura Implementada

### Modelos de Base de Datos

1. **DisciplineSchedule** - Ventana de disponibilidad del mentor
   - `allowedDays`: Array de días permitidos (0=Dom, 1=Lun, ..., 6=Sáb)
   - `startTime` / `endTime`: Ventana horaria (ej: 05:00 - 08:00)
   - `isActive`: Estado de la configuración

2. **DisciplineSubscription** - Compromiso del alumno (120 días)
   - `day1` / `time1`: Primer día y hora de llamada
   - `day2` / `time2`: Segundo día y hora de llamada
   - `missedCallsCount`: Contador de faltas (max 3)
   - `status`: ACTIVE | GRADUATED | DROPPED

3. **CallLog** - Registro post-evento de cada llamada
   - `status`: ATTENDED | MISSED | CANCELLED
   - `callDate`: Fecha de la llamada
   - Sistema automático de 3 strikes

### APIs Implementadas

#### 1. `/api/mentor/discipline-schedule` (GET/POST/DELETE)
Configuración de la ventana de disponibilidad del mentor.

```typescript
// POST: Configurar horario
{
  "allowedDays": [1, 2, 3, 4, 5], // Lun-Vie
  "startTime": "05:00",
  "endTime": "08:00"
}
```

#### 2. `/api/mentor/discipline-subscriptions` (GET)
Obtener todas las suscripciones activas de los alumnos del mentor.

```typescript
// GET: /api/mentor/discipline-subscriptions?mentorId=1
{
  "subscriptions": [
    {
      "student": { "id": 2, "nombre": "Aldo 1", ... },
      "day1": 1, "time1": "05:15",
      "missedCallsCount": 0
    }
  ]
}
```

#### 3. `/api/student/discipline-subscription` (GET/POST/DELETE)
Gestión de la suscripción del alumno.

```typescript
// POST: Crear compromiso
{
  "mentorId": 1,
  "day1": 1, "time1": "05:15",
  "day2": 4, "time2": "05:15"
}

// GET: Obtiene suscripción + calcula próxima llamada
{
  "subscription": { ... },
  "nextCall": {
    "date": "2025-12-16T05:15:00.000Z",
    "dayOfWeek": 1,
    "time": "05:15",
    "isToday": false
  }
}
```

#### 4. `/api/call-logs` (GET/POST)
Registro de asistencias y obtención de historial.

```typescript
// POST: Registrar asistencia
{
  "studentId": 2,
  "status": "ATTENDED", // o "MISSED" o "CANCELLED"
  "notes": "Puntual y enérgico"
}

// Response con sistema de 3 strikes:
{
  "success": true,
  "callLog": { ... },
  "suspended": true, // Si alcanzó 3 faltas
  "message": "Asistencia registrada. El estudiante ha sido suspendido..."
}

// GET: Historial con filtros
/api/call-logs?mentorId=1&date=2025-12-15
```

### Componentes Frontend

#### `DailyAttendanceList.tsx`
Checklist mañanero del mentor con:
- ✅ Lista de turnos del día (slots de 15 minutos)
- ✅ Botones ✅ Asistió / ❌ Faltó
- ✅ Sistema de vidas visual (❤️❤️❤️)
- ✅ Estadísticas en tiempo real
- ✅ Alertas de alumnos en riesgo (2 vidas o menos)
- ✅ Integración completa con APIs

## 🚀 Testing del Sistema

### 1. Poblar con Datos de Prueba

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/seed-discipline-system.ts
```

Esto crea:
- 1 mentor: `mentor.club5am@frutos.com` (password: `password123`)
- 3 alumnos con diferentes estados:
  - **Aldo 1**: 3 vidas ❤️❤️❤️ (Lun 05:15, Jue 05:15)
  - **Ana Sofía**: 2 vidas ❤️❤️💔 (Mar 05:30, Vie 05:30)
  - **Pedro K.**: 1 vida ❤️💔💔 (Lun 06:00, Mié 06:00) **EN RIESGO**

### 2. Probar el Dashboard del Mentor

1. **Login** en `http://localhost:3000/login`
   - Email: `mentor.club5am@frutos.com`
   - Password: `password123`

2. **Navegar** a `/dashboard/mentor`

3. **Ir al tab "Club 5 AM"**
   - Verás el checklist con los 3 alumnos
   - Cada slot de 15 minutos entre 05:00 y 08:00

4. **Registrar Asistencias**
   - Click en ✅ para marcar asistencia
   - Click en ❌ para marcar falta (¡resta 1 vida!)
   - Si un alumno llega a 3 faltas → suspensión automática

### 3. Probar el Dashboard del Alumno

1. **Login** con cualquier alumno
   - `aldo1.club5am@frutos.com` / `password123`
   - `ana.sofia@frutos.com` / `password123`
   - `pedro.k@frutos.com` / `password123`

2. **Navegar** a `/dashboard/student`

3. **Ver Widget "Rutina de Acero"**
   - Próxima llamada calculada en tiempo real
   - Vidas restantes
   - Contador de días hasta graduación
   - Estadísticas de asistencia

## 🎯 Flujos Principales

### Flujo 1: Mentor Configura Horarios
1. Mentor va a `/dashboard/mentor/horarios`
2. Elige días permitidos (Lun-Vie)
3. Define ventana (05:00 - 08:00)
4. Sistema crea `DisciplineSchedule`

### Flujo 2: Alumno Crea Compromiso (Wizard)
1. Alumno va a `/dashboard/student/discipline-setup`
2. **Paso 1**: Ve ventana del mentor
3. **Paso 2**: Elige 2 días (ej: Lunes y Jueves)
4. **Paso 3**: Elige hora fija para cada día
5. **Paso 4**: Confirmación
6. Sistema valida conflictos y crea `DisciplineSubscription`

### Flujo 3: Mentor Registra Asistencia
1. Mentor entra cada mañana a `/dashboard/mentor`
2. Ve tab "Club 5 AM"
3. Ve lista de alumnos que tocan hoy
4. Click en ✅ o ❌ para cada alumno
5. Sistema:
   - Crea `CallLog`
   - Incrementa `missedCallsCount` si falta
   - **Suspende automáticamente** si llega a 3 faltas

### Flujo 4: Sistema de 3 Strikes Automático
```typescript
if (status === 'MISSED') {
  missedCallsCount++; // Incrementar contador
  
  if (missedCallsCount >= 3) {
    status = 'DROPPED'; // Suspensión automática
    endDate = NOW;      // Terminar suscripción
  }
}
```

## 📊 Características Clave

### ✅ Implementado

- [x] Modelos de BD (DisciplineSchedule, DisciplineSubscription, CallLog)
- [x] API de configuración de mentor (`/api/mentor/discipline-schedule`)
- [x] API de suscripciones del mentor (`/api/mentor/discipline-subscriptions`)
- [x] API de suscripción del alumno (`/api/student/discipline-subscription`)
- [x] API de logs de llamadas (`/api/call-logs`)
- [x] Componente `DailyAttendanceList.tsx` con UI completa
- [x] Sistema de 3 strikes automático
- [x] Validación de conflictos de horario
- [x] Cálculo en tiempo real de próxima llamada
- [x] Sistema de vidas visual (❤️❤️❤️)
- [x] Integración en dashboard del mentor
- [x] Script de seeding con datos de prueba

### ⏳ Pendiente

- [ ] Página de configuración del mentor (`/dashboard/mentor/horarios`)
- [ ] Wizard del alumno para crear compromiso (`/dashboard/student/discipline-setup`)
- [ ] Componente `StudentDisciplineDashboard` integrado
- [ ] Notificaciones automáticas (email/push) para recordatorios
- [ ] Estadísticas avanzadas (gráficas de tendencias)
- [ ] Exportación de reportes

## 🔧 Mantenimiento

### Regenerar Cliente Prisma
```bash
npx prisma generate
```

### Sincronizar Base de Datos
```bash
npx prisma db push
```

### Ver Datos en Prisma Studio
```bash
npx prisma studio
```

## 🎨 Diseño del Componente

### DailyAttendanceList.tsx

**Header:**
- Fecha de hoy con formato "lunes 15 de diciembre"
- Ventana horaria (05:00 - 08:00 AM)
- Botón de recarga
- Estadísticas rápidas: Pendientes, Asistieron, Faltaron

**Lista de Turnos:**
- Slots cada 15 minutos
- Hora a la izquierda (formato HH:MM)
- Nombre del alumno con vidas (❤️❤️❤️)
- Botones grandes ✅ / ❌ si está pendiente
- Badge verde/rojo si ya está registrado
- Espacios libres en gris

**Sidebar:**
- Consejo del día
- Estadísticas de la semana
- Alerta de alumnos en riesgo (≤2 vidas)

## 🚨 Validaciones Importantes

1. **Conflicto de Horarios**: No dos alumnos en mismo día/hora con mismo mentor
2. **Ventana Permitida**: Alumno solo puede elegir dentro de la ventana del mentor
3. **Exactamente 2 Días**: El compromiso requiere 2 días fijos por semana
4. **Sistema de 3 Strikes**: Suspensión automática e irreversible

## 📝 Notas Técnicas

- **Cálculo de Próxima Llamada**: Se hace en el backend (GET subscription)
- **Optimistic UI**: Los cambios se reflejan inmediatamente sin esperar respuesta
- **date-fns**: Librería para manipulación de fechas
- **Prisma Relations**: 5 nuevas relaciones en modelo Usuario
- **PostgreSQL**: Índices en (mentorId, day1, time1) y (mentorId, day2, time2)

## 🎉 Ventajas vs Sistema Anterior

| Característica | Sistema Anterior | Sistema Actual |
|----------------|------------------|----------------|
| Registros por alumno | 34 (2/semana x 17) | 1 (suscripción maestra) |
| Queries para próxima llamada | Pesada (buscar en 34) | Cálculo en tiempo real |
| Escalabilidad | O(n) lineal | O(1) constante |
| Sistema de strikes | Manual | Automático |
| Validación de conflictos | ❌ No | ✅ Sí |

---

**Última actualización**: Diciembre 2025
**Autor**: Equipo Plataforma Frutos
**Versión**: 1.0.0
