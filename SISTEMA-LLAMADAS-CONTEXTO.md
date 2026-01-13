# Sistema de Llamadas - Plataforma Frutos

## Resumen de Tipos de Llamadas

Existen **3 tipos de llamadas** en la plataforma, cada una con un propósito y responsable diferente:

---

## 1. 📞 Llamadas de Seguimiento (Disciplina) - MENTOR

**Responsable:** Mentor  
**Dirigida a:** Participantes asignados al mentor  
**Propósito:** Seguimiento de disciplina y accountability durante el entrenamiento

### ⚠️ SISTEMA YA IMPLEMENTADO - NO TOCAR

Este sistema ya existe y funciona. Usa los siguientes modelos:

- **`CallAvailability`** - Horarios de disponibilidad del mentor
  - `type: DISCIPLINE` para llamadas de disciplina
  - `dayOfWeek`, `startTime`, `endTime`
  - Relacionado con `Usuario` (mentor)

- **`CallBooking`** - Reservas de llamadas
  - `mentorId`, `studentId`
  - `scheduledAt`, `duration`
  - `status`: PENDING, CONFIRMED, COMPLETED, etc.
  - `type: DISCIPLINE`

### Archivos relacionados (NO MODIFICAR):
- `/api/mentor/...` - APIs de mentor
- `CallAvailability` model
- `CallBooking` model
- Sistema de selección de mentor

---

## 2. 📱 Llamadas de Staff (Game Changer) - DURANTE ENTRENAMIENTO

**Responsable:** Game Changer  
**Dirigida a:** Participantes de su Átomo (SmallGroup)  
**Propósito:** Seguimiento diario durante el entrenamiento

### Características:
- ✅ Frecuencia: Diaria (durante los días de entrenamiento)
- ✅ **Horario FIJO: 7:00 AM - 9:30 AM** (no configurable)
- ✅ Slots de 10 minutos
- ✅ **NO requiere que el GC configure disponibilidad**

### Información que se registra:
- ✅ ¿Se realizó la llamada? (Sí/No)
- ✅ Calificación de potencial (1-5 estrellas) - "Posibilidad de avanzar"
- ✅ Comentarios obligatorios (mínimo 50 palabras)
- ✅ Número de intentos del día
- ✅ Estado: Completado / Pendiente de reintento

### Estado actual:
- ✅ Widget SquadManagerWidget implementado
- ✅ API /api/gc-calls/quick-log funcionando
- ✅ API /api/gc-calls/available-times - horarios fijos
- ✅ API /api/gc-calls/assign-schedule - asignación automática
- ✅ Modelo GCCallAttempt en base de datos
- ✅ Indicadores visuales de estado (verde=completado, amarillo=reintento)

### Nota técnica:
Se crea automáticamente un `GCAvailability` de sistema (7:00-9:30) para mantener
la integridad del schema, pero el GC NO necesita configurarlo manualmente.

---

## 3. 📅 Llamadas de Staff (Game Changer) - POST-ENTRENAMIENTO

**Responsable:** Game Changer  
**Dirigida a:** Participantes de su Átomo (SmallGroup)  
**Propósito:** Seguimiento después del entrenamiento  
**Ubicación:** /dashboard/game-changer/calls

### Características:
- [ ] Frecuencia: _Por definir_
- [ ] **Horario CONFIGURABLE por el GC** (usa GCAvailability)
- [ ] Duración: _Por definir_
- [ ] Cuándo inicia: _Por definir (¿al terminar el entrenamiento?)_

### ⚠️ ESTE SISTEMA USA GCAvailability CONFIGURABLE
La alerta "Configura tu disponibilidad" es para ESTE tipo de llamadas,
NO para las llamadas de staff durante entrenamiento (que son fijas).

### Información a registrar:
- [ ] _Por definir_

### Estado actual:
- ⏳ Pendiente de implementar

---

## Preguntas para Definir

### Llamadas de Seguimiento (Mentor):
1. ¿Con qué frecuencia debe llamar el mentor?
2. ¿Qué información debe registrar?
3. ¿Hay calificación o solo notas?
4. ¿Existe un horario definido o es flexible?

### Llamadas Post-Entrenamiento (GC):
1. ¿Cuándo inician estas llamadas? (¿inmediatamente después del entrenamiento?)
2. ¿Con qué frecuencia? (¿semanal, quincenal, mensual?)
3. ¿Por cuánto tiempo? (¿3 meses, 6 meses, indefinido?)
4. ¿Qué información se debe registrar?
5. ¿Es el mismo formulario que las llamadas durante el entrenamiento o diferente?

---

## Estructura de Datos Actual

### Modelos de MENTOR (NO TOCAR):
- `CallAvailability` - Horarios de disponibilidad del mentor (DISCIPLINE)
- `CallBooking` - Reservas de llamadas mentor-estudiante

### Modelos de GAME CHANGER (nuevos):
- `GCCallAttempt` - Registro de intentos de llamada GC durante entrenamiento
- `GCCallSlot` - Horarios de llamadas agendadas por GC
- `GCAvailability` - Disponibilidad del Game Changer
- `GCCallLog` - Logs de llamadas (para post-entrenamiento)

### Modelos que podrían necesitarse:
- Posiblemente modelo para llamadas post-entrenamiento (o usar GCCallLog)

---

## Flujo de Usuario

### Game Changer - Durante Entrenamiento:
1. Ve lista de participantes en SquadManagerWidget
2. Ve estado de llamadas del día (✓ verde, ↻ amarillo, sin estado)
3. Presiona "Registrar" para registrar llamada
4. Llena formulario: Sí/No, Rating, Comentarios (50+ palabras)
5. Guarda y el estado se actualiza

### Game Changer - Post-Entrenamiento:
_Por definir_

### Mentor - Seguimiento:
_Por definir_

---

## Notas Adicionales

_Espacio para agregar contexto adicional según la conversación_
