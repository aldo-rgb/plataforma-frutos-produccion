# Sistema Carta F.R.U.T.O.S. - Documentación Completa

## 🎯 Visión General

El sistema **Carta F.R.U.T.O.S.** es el corazón de la plataforma. Permite a los usuarios definir su identidad, metas y acciones en 8 áreas de vida, con revisión granular del mentor y generación automática de tareas para 63 días.

---

## 📊 Flujo Completo del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                         USUARIO                                 │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
       ┌──────────────────────────────────────┐
       │   1. WIZARD DE CAPTURA (3 PASOS)    │
       │   /dashboard/carta/wizard            │
       │                                      │
       │   Paso 1: Declaraciones "Yo Soy"    │
       │   Paso 2: Metas SMART                │
       │   Paso 3: Acciones + Frecuencia      │
       └──────────────────────────────────────┘
                              │
                              ▼
                   [Auto-save cada 2 seg]
                              │
                              ▼
       ┌──────────────────────────────────────┐
       │   2. SUBMIT PARA REVISIÓN            │
       │   POST /api/carta/submit             │
       │                                      │
       │   Estado: BORRADOR → PENDIENTE       │
       │   📧 Notifica a mentor/admin         │
       └──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      MENTOR/ADMIN                               │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
       ┌──────────────────────────────────────┐
       │   3. REVISIÓN GRANULAR               │
       │   Componente: CartaReviewMentor      │
       │                                      │
       │   Por cada campo (16 totales):       │
       │   ✅ Aprobar                         │
       │   ✏️  Editar directamente            │
       │   ❌ Rechazar (con feedback)         │
       └──────────────────────────────────────┘
                              │
                              ▼
       ┌──────────────────────────────────────┐
       │   4. GUARDAR REVISIÓN                │
       │   POST /api/carta/review             │
       │                                      │
       │   → Si todo ✅: Estado = APROBADA    │
       │   → Si hay ❌: Estado = CAMBIOS      │
       │   📧 Notifica usuario                │
       └──────────────────────────────────────┘
                              │
                              ├─── Si CAMBIOS SOLICITADOS
                              │         │
                              │         ▼
                              │  ┌────────────────────────┐
                              │  │  5. VISTA CORRECCIONES │
                              │  │  /carta/corrections    │
                              │  │                        │
                              │  │  🔴 Campos rechazados  │
                              │  │  🟢 Campos aprobados   │
                              │  │  [Reenviar Revisión]   │
                              │  └────────────────────────┘
                              │         │
                              │         └─► (Vuelve a paso 2)
                              │
                              └─── Si APROBADA
                                    │
                                    ▼
       ┌──────────────────────────────────────┐
       │   6. APROBACIÓN FINAL                │
       │   POST /api/carta/approve            │
       │                                      │
       │   🚀 EXPLOSIÓN DE TAREAS             │
       │   generateTasksForLetter()           │
       │                                      │
       │   Crea ~100 instancias de tareas     │
       │   según frecuencia configurada       │
       │   📧 Notifica usuario (APROBADA)     │
       └──────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    USUARIO (63 DÍAS)                           │
│                                                                 │
│  ✅ Tareas aparecen en calendario                               │
│  📸 Sube evidencias fotográficas                                │
│  📊 Trackea progreso en tiempo real                             │
│  🏆 Completa transformación                                     │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Archivos

### **Frontend (Componentes)**
```
/components/dashboard/
  ├── CartaWizard.tsx              ✅ Wizard 3 pasos (Usuario)
  ├── ConfiguradorAccion.tsx       ✅ Selector frecuencia (Usuario)
  └── CartaReviewMentor.tsx        ✅ Panel revisión (Mentor)

/app/dashboard/carta/
  ├── wizard/page.tsx              ✅ Página wizard
  └── corrections/page.tsx         ✅ Vista correcciones
```

### **Backend (API)**
```
/app/api/carta/
  ├── submit/route.ts              ✅ Enviar para revisión
  ├── review/route.ts              ✅ Revisar con feedback
  ├── approve/route.ts             ✅ Aprobar + generar tareas
  ├── my-carta/route.ts            ✅ Get/Update carta usuario
  └── [id]/stats/route.ts          ✅ Estadísticas tareas

/lib/
  ├── taskGenerator.ts             ✅ Motor generación tareas
  └── notifications.ts             ✅ Sistema notificaciones
```

### **Database**
```
/prisma/migrations/
  └── nueva_carta_frutos_sistema/
      └── migration.sql            ✅ Schema granular
```

---

## 🎨 Componentes Clave

### **1. CartaWizard.tsx** (Usuario)
**Ubicación**: `/components/dashboard/CartaWizard.tsx`

**Funcionalidad**:
- 3 pasos con navegación interactiva
- Auto-save cada 2 segundos
- Validación: mínimo 6 de 8 áreas completas
- Manejo de estados: BORRADOR, PENDIENTE, CAMBIOS_SOLICITADOS, APROBADA
- Feedback visual del mentor integrado

**Pasos**:
1. **Declaraciones de Identidad**: 8 textareas "Yo soy..."
2. **Metas SMART**: 8 textareas con criterios específicos
3. **Plan de Acción**: Integración con `ConfiguradorAccion`

**Estados visuales**:
- 🔴 Rojo = Campo rechazado (editable)
- 🟢 Verde = Campo aprobado (bloqueado)
- ⚪ Gris = Campo pendiente (editable)

---

### **2. ConfiguradorAccion.tsx** (Educativo)
**Ubicación**: `/components/dashboard/ConfiguradorAccion.tsx`

**Funcionalidad**:
- Selector de frecuencia: DIARIA, SEMANAL, QUINCENAL, MENSUAL
- Modal de advertencia para DIARIA (100 evidencias)
- Picker interactivo de días (SEMANAL)
- Contador en tiempo real de tareas totales
- Panel de resumen con emojis

**Cálculo de tareas**:
```typescript
DIARIA: 63 días × 7 días = ~63 tareas
SEMANAL: 63 días × días seleccionados / 7 = variable
QUINCENAL: 63 días / 14 = ~4 tareas
MENSUAL: 63 días / 30 = ~2 tareas
```

---

### **3. CartaReviewMentor.tsx** (Mentor)
**Ubicación**: `/components/dashboard/CartaReviewMentor.tsx`

**Funcionalidad**:
- Barra de progreso general
- Review por área (8 áreas × 2 campos = 16 campos)
- Acciones por campo:
  - ✅ **Aprobar**: Marca como aprobado y bloquea
  - ✏️ **Editar**: Edita inline y auto-aprueba
  - ❌ **Rechazar**: Solicita feedback obligatorio
- Botón inteligente final:
  - "Aprobar Toda la Carta" (si todo ✅)
  - "Enviar Feedback" (si hay ❌)
  - "Guardar Progreso" (si hay PENDING)

**Props**:
```typescript
interface AreaReview {
  areaType: string;
  identity: string;
  meta: string;
  identityStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  metaStatus: 'PENDING' | 'APPROVED' | 'REJECTED';
  identityFeedback?: string;
  metaFeedback?: string;
}
```

---

### **4. Vista de Correcciones** (Usuario)
**Ubicación**: `/app/dashboard/carta/corrections/page.tsx`

**Funcionalidad**:
- Solo se muestra si estado = CAMBIOS_SOLICITADOS
- Parsea feedback del mentor
- Muestra campos con colores:
  - 🔴 Rechazados (editables)
  - 🟢 Aprobados (bloqueados con candado)
- Botones:
  - "Guardar Cambios"
  - "Reenviar para Revisión"

---

## 🔌 API Endpoints

### **POST /api/carta/submit**
**Propósito**: Usuario envía carta para revisión

**Request**:
```json
{
  "cartaId": 123
}
```

**Response**:
```json
{
  "success": true,
  "carta": { ... },
  "message": "Carta enviada a tu mentor para revisión"
}
```

**Acciones**:
1. Verifica si usuario tiene mentor asignado
2. Actualiza estado: BORRADOR → PENDIENTE_MENTOR/PENDIENTE_ADMIN
3. Registra `submittedAt`
4. **Notifica mentor/admin** 📧

---

### **POST /api/carta/review**
**Propósito**: Mentor revisa con feedback granular

**Request**:
```json
{
  "cartaId": 123,
  "reviews": [
    {
      "areaType": "FINANZAS",
      "identityStatus": "APPROVED",
      "metaStatus": "REJECTED",
      "metaFeedback": "Tu meta no es medible. Agrega cifras específicas.",
      "meta": "Ahorrar $10,000 en 3 meses" // Si editó
    },
    { ... }
  ]
}
```

**Response**:
```json
{
  "success": true,
  "carta": { ... },
  "message": "Revisión enviada. Usuario notificado."
}
```

**Acciones**:
1. Itera reviews por área
2. Actualiza campos si mentor editó directamente
3. Determina estado final:
   - Todo ✅ → APROBADA
   - Algún ❌ → CAMBIOS_SOLICITADOS
   - Resto → PENDIENTE_MENTOR
4. Compila feedback en `carta.feedbackMentor`
5. **Notifica usuario si hay cambios** 📧

---

### **POST /api/carta/approve**
**Propósito**: Aprobación final y generación de tareas

**Request**:
```json
{
  "cartaId": 123
}
```

**Response**:
```json
{
  "success": true,
  "message": "Carta aprobada. Se generaron 87 tareas.",
  "tasksCreated": 87,
  "carta": { ... }
}
```

**Acciones**:
1. Valida que carta esté completa: `validateCartaForGeneration()`
2. Actualiza estado: APROBADA
3. Registra `approvedAt`, `autorizadoMentor`, `autorizadoPorId`
4. **🚀 EXPLOSIÓN**: `generateTasksForLetter(cartaId)`
5. **Notifica usuario (APROBADA)** 📧

---

### **GET /api/carta/my-carta**
**Propósito**: Obtener carta del usuario (auto-crea si no existe)

**Response**:
```json
{
  "carta": {
    "id": 123,
    "estado": "BORRADOR",
    "finanzasDeclaracion": "Yo soy...",
    "Meta": [ ... ],
    ...
  },
  "isNew": false
}
```

---

### **PUT /api/carta/my-carta**
**Propósito**: Actualizar carta (auto-save)

**Request**:
```json
{
  "finanzasDeclaracion": "Yo soy abundancia...",
  "finanzasMeta": "Ahorrar $10,000..."
}
```

**Validaciones**:
- No permite edición si estado = APROBADA

---

### **GET /api/carta/[id]/stats**
**Propósito**: Estadísticas de tareas generadas

**Response**:
```json
{
  "totalTasks": 87,
  "tasksByArea": {
    "FINANZAS": 15,
    "RELACIONES": 12,
    ...
  },
  "tasksByFrequency": {
    "DAILY": 70,
    "WEEKLY": 10,
    ...
  },
  "pendingTasks": 87,
  "completedTasks": 0
}
```

---

## ⚙️ Motor de Generación de Tareas

**Ubicación**: `/lib/taskGenerator.ts`

### **Función Principal**: `generateTasksForLetter(cartaId)`

**Algoritmo**:
```typescript
1. Obtener carta con todas las Metas y Acciones
2. Verificar que no existan tareas ya generadas (prevent duplicates)
3. Flatten: Extraer todas las acciones de las 8 áreas
4. Loop 63 días:
   for (date = startDate; date <= endDate; date++) {
     for (action of actions) {
       if (shouldCreateTaskOnDate(action, date)) {
         tasksToCreate.push({ usuarioId, accionId, dueDate: date, ... });
       }
     }
   }
5. Batch insert: prisma.tarea.createMany({ data: tasksToCreate })
6. Actualizar carta.approvedAt
7. Retornar { success: true, tasksCreated: N }
```

---

### **Función**: `shouldCreateTaskOnDate(action, date)`

**Lógica de frecuencias**:

```typescript
switch (action.frequency) {
  case 'DAILY':
    return true; // Todos los días
    
  case 'WEEKLY':
    const dayOfWeek = getDay(date); // 0=Sun, 6=Sat
    return action.assignedDays.includes(dayOfWeek);
    // Ejemplo: [1, 3, 5] = Lunes, Miércoles, Viernes
    
  case 'BIWEEKLY':
    const weekNumber = getWeek(date);
    return weekNumber % 2 === 1 && action.assignedDays.includes(getDay(date));
    // Semanas impares + día específico
    
  case 'MONTHLY':
    const dayOfMonth = getDate(date);
    return action.specificDayOfMonth 
      ? dayOfMonth === action.specificDayOfMonth 
      : isLastDayOfMonth(date);
    // Día específico (ej: 15) o último día del mes
}
```

**Resultado**: Cada acción genera entre 3 y 100 instancias de tarea.

---

### **Función**: `getTaskStats(cartaId)`

Retorna estadísticas agregadas:
- Total de tareas
- Tareas por área (8 áreas)
- Tareas por frecuencia
- Pendientes vs completadas

---

## 📧 Sistema de Notificaciones

**Ubicación**: `/lib/notifications.ts`

### **Estado Actual**: Estructura lista, pendiente configuración de servicios

**Funciones implementadas**:
1. `notifyCartaSubmitted(userId, mentorId?)`
2. `notifyChangesRequested(userId, feedbackSummary)`
3. `notifyCartaApproved(userId, tasksCreated)`

**Canales**:
- 📧 **Email**: Templates HTML listos
- 🔔 **Push**: Estructura para OneSignal/Firebase
- 📱 **In-App**: Función para tabla de notificaciones

---

### **Configuración Pendiente**

**Para Email** (recomendado: Resend):
```typescript
// Instalar: npm install resend
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'F.R.U.T.O.S. <noreply@frutos.com>',
  to: [to],
  subject: subject,
  html: htmlContent,
});
```

**Para Push** (recomendado: OneSignal):
```typescript
// Instalar: npm install onesignal-node
const notification = {
  app_id: process.env.ONESIGNAL_APP_ID,
  include_external_user_ids: [userId.toString()],
  headings: { en: title },
  contents: { en: body }
};

await fetch('https://onesignal.com/api/v1/notifications', {
  method: 'POST',
  headers: { 'Authorization': `Basic ${process.env.ONESIGNAL_API_KEY}` },
  body: JSON.stringify(notification)
});
```

---

## 🗄️ Base de Datos (Schema)

**Tabla principal**: `CartaFrutos`

**Nuevos campos añadidos**:
```prisma
estado                    String?   // BORRADOR, PENDIENTE_MENTOR, etc.
submittedAt               DateTime?
changesRequestedAt        DateTime?
approvedAt                DateTime?
autorizadoMentor          Boolean   @default(false)
autorizadoPorId           Int?
feedbackMentor            String?   @db.Text
```

**Tabla nueva**: `AreaFeedback`
```prisma
model AreaFeedback {
  id              Int      @id @default(autoincrement())
  cartaId         Int
  areaType        String   // FINANZAS, RELACIONES, etc.
  fieldName       String   // "identity" | "meta"
  status          String   // APPROVED, REJECTED, PENDING
  feedback        String?  @db.Text
  reviewedBy      Int?
  reviewedAt      DateTime?
  
  carta           CartaFrutos @relation(...)
  reviewer        Usuario?    @relation(...)
}
```

---

## ✅ Checklist de Implementación

### **COMPLETADO** ✅
- [x] Database migration (schema granular)
- [x] Componente CartaWizard (3 pasos)
- [x] Componente ConfiguradorAccion (frecuencias)
- [x] Componente CartaReviewMentor (revisión)
- [x] Vista de Correcciones (usuario)
- [x] API: Submit carta
- [x] API: Review con feedback
- [x] API: Approve + generación
- [x] API: Get/Update my-carta
- [x] API: Task stats
- [x] Motor taskGenerator
- [x] Sistema notifications (estructura)
- [x] Integración notificaciones en APIs

### **PENDIENTE** ⏳
- [ ] Configurar servicio de email (Resend/SendGrid)
- [ ] Configurar push notifications (OneSignal/Firebase)
- [ ] Crear panel mentor (lista cartas pendientes)
- [ ] Integrar wizard en sidebar
- [ ] Testing end-to-end del flujo completo
- [ ] Resolver issue de calendar dots (original)

---

## 🚀 Testing del Sistema

### **Flujo de prueba recomendado**:

1. **Usuario crea carta**:
   ```
   Navegar a: /dashboard/carta/wizard
   - Llenar 6+ áreas en paso 1 y 2
   - Configurar 1 acción por área en paso 3
   - Click "Enviar para Revisión"
   - Verificar: Estado = PENDIENTE_MENTOR
   ```

2. **Mentor revisa**:
   ```
   Navegar a: /dashboard/mentor (pendiente crear)
   - Abrir carta del usuario
   - Aprobar algunos campos (✅)
   - Rechazar otros (❌) con feedback
   - Click "Enviar Feedback"
   - Verificar: Estado = CAMBIOS_SOLICITADOS
   ```

3. **Usuario corrige**:
   ```
   Navegar a: /dashboard/carta/corrections
   - Ver campos en rojo con feedback
   - Editar campos rechazados
   - Click "Reenviar para Revisión"
   - Verificar: Estado = PENDIENTE_MENTOR
   ```

4. **Mentor aprueba**:
   ```
   - Revisar cambios
   - Aprobar todos los campos
   - Click "Aprobar Toda la Carta"
   - POST /api/carta/approve
   - Verificar: Estado = APROBADA
   - Verificar: Tareas generadas en DB
   ```

5. **Usuario completa tareas**:
   ```
   Navegar a: /dashboard
   - Ver calendario con tareas
   - Click en día con tareas
   - Subir evidencia fotográfica
   - Marcar como completada
   ```

---

## 📊 Métricas del Sistema

**Tareas esperadas por frecuencia**:
- **DIARIA**: ~63 tareas (todas los días)
- **SEMANAL (3 días)**: ~43 tareas (3/7 × 100)
- **QUINCENAL**: ~7 tareas (cada 14 días)
- **MENSUAL**: ~3 tareas (cada 30 días)

**Total estimado por carta**: **50-150 tareas** dependiendo configuración

---

## 🎓 Notas para el Mentor

### **Mejores prácticas de revisión**:

1. **Declaraciones de Identidad**:
   - Debe estar en presente ("Yo soy", no "Yo seré")
   - Específica y poderosa
   - Conectada con el área correspondiente

2. **Metas SMART**:
   - ✅ **S**pecific: Claridad absoluta
   - ✅ **M**easurable: Con números/indicadores
   - ✅ **A**chievable: Realista en 63 días
   - ✅ **R**elevant: Conectada con identidad
   - ✅ **T**ime-bound: Plazo definido

3. **Feedback efectivo**:
   - ❌ Malo: "No está bien"
   - ✅ Bueno: "Tu meta no es medible. Agrega: '¿Cuánto?' o '¿Cuántos?' para hacerla específica."

---

## 🔗 Integraciones Futuras

- [ ] Dashboard analytics (progreso de tareas)
- [ ] Gamificación (puntos, badges)
- [ ] Ranking por área
- [ ] Comparativa con otros usuarios
- [ ] Reporte PDF de la carta
- [ ] Exportar progreso a calendar (Google/Apple)
- [ ] Recordatorios automáticos de tareas pendientes
- [ ] Chat con mentor integrado

---

## 🐛 Debugging

**Logs clave a revisar**:
```bash
# Generación de tareas
🚀 Iniciando generación automática de tareas para Carta #123
📧 87 tareas generadas exitosamente

# Notificaciones
📧 [EMAIL] To: user@example.com
🔔 [PUSH] UserId: 456

# Revisión
📧 Notificación: Carta #123 requiere cambios - Usuario #456
```

**Errores comunes**:
- "Carta ya tiene tareas generadas" → Verificar que no se llame `approve` dos veces
- "Usuario no tiene mentor asignado" → Estado = PENDIENTE_ADMIN
- "No se puede editar carta aprobada" → Validación en PUT /my-carta

---

## 📞 Soporte

Para dudas sobre implementación:
1. Revisar esta documentación
2. Verificar logs en consola del servidor
3. Inspeccionar estado de la carta en DB: `SELECT * FROM CartaFrutos WHERE id = X`
4. Verificar tareas generadas: `SELECT COUNT(*) FROM Tarea WHERE usuarioId = Y`

---

**Última actualización**: Diciembre 2024  
**Versión del sistema**: 1.0.0  
**Estado**: ✅ Core completo, pendiente testing y configuración de notificaciones
