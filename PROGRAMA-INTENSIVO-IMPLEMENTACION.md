# Sistema de Programa Intensivo 17 Semanas - Guía de Implementación

## ✅ COMPLETADO

### 1. Base de Datos
- ✅ Modelo `ProgramEnrollment` creado en schema.prisma
- ✅ Campos agregados a `CallBooking`: `programEnrollmentId`, `attendanceStatus`, `weekNumber`
- ✅ Relaciones configuradas entre Usuario, ProgramEnrollment y CallBooking
- ✅ Cliente de Prisma generado

## 📋 PENDIENTE DE IMPLEMENTACIÓN

### 2. API - Reserva del Programa (POST /api/program/enroll)

**Archivo**: `app/api/program/enroll/route.ts`

**Funcionalidad**:
```typescript
// Recibe:
{
  mentorId: number,
  slot1: { dayOfWeek: number, time: string }, // ej: { dayOfWeek: 1, time: "09:00" }
  slot2: { dayOfWeek: number, time: string }, // ej: { dayOfWeek: 4, time: "16:00" }
  totalWeeks: number // default 17
}

// Proceso:
1. Validar que los días sean diferentes
2. Crear ProgramEnrollment
3. Generar 34 CallBookings (2 por semana x 17 semanas)
4. Asignar weekNumber (1-17) a cada par de sesiones
5. Vincular todos los bookings al programEnrollmentId

// Responde:
{
  success: true,
  enrollmentId: number,
  bookingsCreated: number,
  nextSession: { date, time }
}
```

**Algoritmo de Generación**:
```typescript
const startDate = new Date();
const bookings = [];

for (let week = 0; week < totalWeeks; week++) {
  // Calcular fechas para ambos slots
  const slot1Date = getNextDayOfWeek(startDate, slot1.dayOfWeek, week);
  const slot2Date = getNextDayOfWeek(startDate, slot2.dayOfWeek, week);
  
  bookings.push({
    mentorId,
    studentId,
    scheduledAt: new Date(`${slot1Date}T${slot1.time}`),
    weekNumber: week + 1,
    programEnrollmentId: enrollment.id,
    type: 'DISCIPLINE',
    status: 'PENDING',
    attendanceStatus: 'PENDING'
  });
  
  bookings.push({
    mentorId,
    studentId,
    scheduledAt: new Date(`${slot2Date}T${slot2.time}`),
    weekNumber: week + 1,
    programEnrollmentId: enrollment.id,
    type: 'DISCIPLINE',
    status: 'PENDING',
    attendanceStatus: 'PENDING'
  });
}

await prisma.callBooking.createMany({ data: bookings });
```

### 3. API - Marcar Asistencia (PUT /api/program/attendance)

**Archivo**: `app/api/program/attendance/route.ts`

**Funcionalidad**:
```typescript
// Recibe:
{
  bookingId: number,
  attendanceStatus: 'PRESENT' | 'ABSENT'
}

// Proceso:
1. Actualizar CallBooking.attendanceStatus
2. Si attendanceStatus === 'ABSENT':
   - Incrementar ProgramEnrollment.missedCallsCount
   - Si missedCallsCount >= maxMissedAllowed:
     * Cambiar ProgramEnrollment.status a 'SUSPENDED'
     * Cancelar todos los CallBookings futuros del mismo programEnrollmentId
     * Enviar notificación al usuario

// Responde:
{
  success: true,
  suspended: boolean,
  missedCallsCount: number,
  maxMissedAllowed: number
}
```

### 4. API - Estado del Programa (GET /api/program/status)

**Archivo**: `app/api/program/status/route.ts`

**Funcionalidad**:
```typescript
// Consulta el enrollment activo del usuario
const enrollment = await prisma.programEnrollment.findFirst({
  where: {
    userId: session.user.id,
    status: 'ACTIVE'
  },
  include: {
    CallBookings: {
      where: { scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: 'asc' },
      take: 1
    }
  }
});

// Calcula estadísticas
const completed = await prisma.callBooking.count({
  where: {
    programEnrollmentId: enrollment.id,
    attendanceStatus: 'PRESENT'
  }
});

const total = enrollment.totalWeeks * 2;
const remaining = total - completed;

// Responde:
{
  status: enrollment.status,
  currentWeek: Math.ceil(completed / 2),
  totalWeeks: enrollment.totalWeeks,
  missedCalls: enrollment.missedCallsCount,
  maxMissedAllowed: enrollment.maxMissedAllowed,
  livesRemaining: enrollment.maxMissedAllowed - enrollment.missedCallsCount,
  nextSession: enrollment.CallBookings[0],
  progress: (completed / total) * 100
}
```

### 5. API - Reactivar Usuario (POST /api/program/reactivate)

**Archivo**: `app/api/program/reactivate/route.ts`

**Solo para MENTOR o ADMIN**

```typescript
// Recibe:
{
  enrollmentId: number,
  addExtraLife: boolean // default true
}

// Proceso:
1. Cambiar ProgramEnrollment.status a 'ACTIVE'
2. Si addExtraLife: maxMissedAllowed++
3. Redirigir al usuario a re-seleccionar horarios

// Responde:
{
  success: true,
  livesRemaining: number
}
```

### 6. Componente - Selector Dual de Horarios

**Archivo**: `app/dashboard/program/enroll/page.tsx`

**Interfaz**:
```tsx
Estado:
- slot1: { dayOfWeek: number | null, time: string | null }
- slot2: { dayOfWeek: number | null, time: string | null }
- step: 1 | 2 // Paso actual

Validación:
- Paso 1: Usuario selecciona primer día y hora
  * Deshabilitar el resto de horas de ese mismo día
  * Avanzar a Paso 2
  
- Paso 2: Usuario selecciona segundo día y hora
  * Debe ser un día diferente a slot1.dayOfWeek
  * Habilitar botón "Confirmar Programa"
  
Al confirmar:
- POST a /api/program/enroll
- Mostrar modal de éxito con resumen
- Redirigir a dashboard
```

**Diseño sugerido**:
- Mostrar semana completa (Lun-Dom) con grid de horarios 5:00-8:00 AM
- Indicador visual: "Paso 1 de 2: Elige tu primer horario"
- Color diferente para slot1 (azul) y slot2 (verde)
- Preview: "Semana típica: Lunes 9:00 + Jueves 16:00"

### 7. Widget - Dashboard del Estudiante

**Archivo**: `components/dashboard/ProgramStatusWidget.tsx`

**Elementos visuales**:

```tsx
1. Tarjeta de Progreso:
   - "Semana 4 de 17"
   - Barra de progreso (23% completado)
   
2. Contador de Vidas:
   - 🟢🟢🟢 (0 faltas) - "¡Perfecto!"
   - 🟢🟢🔴 (1 falta) - "Una oportunidad usada"
   - 🟢🔴🔴 (2 faltas) - "⚠️ En Riesgo"
   - 🔴🔴🔴 (3 faltas) - "🚫 SUSPENDIDO"
   
3. Próxima Llamada:
   - Si faltan > 24h: "Próxima: Lunes 22 dic a las 9:00"
   - Si faltan < 24h: Cronómetro regresivo con colores:
     * Verde (>12h)
     * Naranja (6-12h)
     * Rojo (<6h)
     
Código ejemplo:
const hoursUntil = (nextSession.scheduledAt - Date.now()) / 3600000;
const color = hoursUntil > 12 ? 'green' : hoursUntil > 6 ? 'orange' : 'red';
```

### 8. Modal - Suspensión

**Archivo**: `components/dashboard/SuspensionModal.tsx`

**Trigger**: Cuando el usuario entre al dashboard y tenga status='SUSPENDED'

**Contenido**:
- Icono de bloqueo 🔒
- "Has sido suspendido del programa"
- Razón: "3 inasistencias"
- Botón: "Solicitar Reactivación al Mentor"
  * Envía notificación al mentor
  * Deshabilita acceso temporal a ciertas funciones

### 9. Panel del Mentor - Marcar Asistencia

**Archivo**: `app/dashboard/mentor/attendance/page.tsx`

**Funcionalidad**:
- Lista de sesiones de hoy y pasadas recientes
- Para cada sesión:
  * Nombre del estudiante
  * Hora programada
  * Botones: [✓ Presente] [✗ Ausente]
  * Indicador de semana (#4 de 17)
  * Vidas restantes del estudiante
  
Al marcar "Ausente":
- Mostrar advertencia si es la 3ra falta
- Confirmar acción
- POST a /api/program/attendance

### 10. Panel del Mentor - Reactivaciones

**Archivo**: `app/dashboard/mentor/reactivations/page.tsx`

**Lista de estudiantes suspendidos**:
```tsx
Cada tarjeta muestra:
- Nombre del estudiante
- Semana en la que se suspendió
- Número de faltas (3)
- Botón "Reactivar y dar vida extra"
  * POST a /api/program/reactivate
  * Redirigir al estudiante a re-seleccionar horarios
```

## 📊 TESTING SUGERIDO

1. **Flujo Completo**:
   - Estudiante se inscribe seleccionando 2 horarios
   - Sistema genera 34 sesiones
   - Mentor marca asistencia (presente)
   - Mentor marca ausencia (3 veces)
   - Sistema suspende automáticamente
   - Mentor reactiva al estudiante
   - Estudiante selecciona nuevos horarios

2. **Casos Edge**:
   - Intentar seleccionar el mismo día dos veces (debe fallar)
   - Verificar que las 34 sesiones se distribuyan correctamente
   - Comprobar que al suspender se cancelan sesiones futuras
   - Validar que el contador regresivo funcione correctamente

## 🎨 MEJORAS DE UX OPCIONALES

1. **Notificaciones Push** cuando faltan 2 horas para la llamada
2. **Email de recordatorio** 24h antes
3. **Historial de asistencia** con calendario visual
4. **Estadísticas del programa**: tasa de asistencia, racha actual
5. **Badges**: "Asistencia perfecta", "Sin faltas en 5 semanas"

## ⚠️ CONSIDERACIONES IMPORTANTES

1. **Zona Horaria**: Usar el mismo fix que aplicamos (`new Date(year, month-1, day)`)
2. **Validación de Conflictos**: Verificar que los slots elegidos estén disponibles
3. **Transacciones**: Usar prisma.$transaction para garantizar consistencia
4. **Logs**: Registrar cada cambio en attendance y suspensiones
5. **Rollback**: Permitir al admin deshacer suspensiones erróneas

---

**Estado Actual**: ✅ Base de datos lista
**Siguiente Paso**: Implementar API `/api/program/enroll`

**Prioridad**:
1. API de enroll (alta)
2. Widget de status en dashboard (alta)
3. API de attendance (media)
4. Panel de mentor (media)
5. Funciones de reactivación (baja)
