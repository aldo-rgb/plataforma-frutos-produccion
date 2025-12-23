# SISTEMA DE CICLOS HÍBRIDOS - DOCUMENTACIÓN COMPLETA

## 🎯 Visión General

Transformación del modelo "100 días fijos" a **Ciclos Híbridos: Personal vs Grupal (Visiones)**

### Antes vs Después

| **ANTES** | **DESPUÉS** |
|-----------|-------------|
| Todos los usuarios: 100 días fijos | 🐺 **Usuarios SOLO**: 100 días personales |
| Generación desde fecha de aprobación | 🌟 **Usuarios VISIÓN**: Hasta fecha grupal |
| Sin control de extensión | ✅ Admin puede extender visiones dinámicamente |
| Sin control de deserción | ✅ Usuario puede desertar voluntariamente |
| Sin auditoría de cambios | ✅ Log completo de todas las acciones críticas |

---

## 📊 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│                    BASE DE DATOS                                │
└─────────────────────────────────────────────────────────────────┘
                              │
                ┌─────────────┴─────────────┐
                │                           │
         ┌──────▼──────┐           ┌───────▼────────┐
         │   Vision    │           │    Usuario     │
         │  (Grupos)   │◄──────────│   visionId     │
         └─────────────┘           └────────────────┘
                │                           │
                └────────────┬──────────────┘
                             │
                    ┌────────▼────────┐
                    │ ProgramEnrollment│
                    │  (Ciclo Actual)  │
                    └──────────────────┘
                             │
          ┌──────────────────┴──────────────────┐
          │                                     │
    ┌─────▼─────┐                        ┌─────▼──────┐
    │CartaFrutos│                        │   Tarea    │
    │  + Fechas │                        │ (Instancias│
    └───────────┘                        └────────────┘
```

---

## 🗄️ Estructura de Base de Datos

### Nueva Tabla: `Vision`
Representa grupos con ciclos compartidos.

```sql
CREATE TABLE "Vision" (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,          -- "Generación Alpha 2025"
    description TEXT,
    startDate TIMESTAMP(3) NOT NULL,
    endDate TIMESTAMP(3) NOT NULL,       -- Fecha fin configurable
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, PAUSED
    coordinatorId INTEGER,               -- Admin/Staff responsable
    createdAt TIMESTAMP(3),
    updatedAt TIMESTAMP(3)
);
```

**Ejemplo de Visión:**
```json
{
  "id": 1,
  "name": "Generación Alpha 2025",
  "startDate": "2025-01-01",
  "endDate": "2025-06-30",  // 181 días (extensible)
  "status": "ACTIVE"
}
```

---

### Nueva Tabla: `ProgramEnrollment`
Control del ciclo activo de cada usuario.

```sql
CREATE TABLE "ProgramEnrollment" (
    id SERIAL PRIMARY KEY,
    usuarioId INTEGER NOT NULL,
    cycleType VARCHAR(20) NOT NULL,      -- 'SOLO' o 'VISION'
    cycleStartDate TIMESTAMP(3) NOT NULL,
    cycleEndDate TIMESTAMP(3) NOT NULL,
    status VARCHAR(20) DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, DESERTER, DROPPED
    dropReason TEXT,                     -- Si fue dado de baja
    desertedAt TIMESTAMP(3),             -- Fecha de deserción
    completedAt TIMESTAMP(3),
    visionId INTEGER,                    -- NULL si es SOLO
    createdAt TIMESTAMP(3),
    updatedAt TIMESTAMP(3)
);
```

**Estados posibles:**
- `ACTIVE`: Ciclo en curso
- `COMPLETED`: Ciclo finalizado exitosamente
- `DESERTER`: Usuario abandonó voluntariamente
- `DROPPED`: Dado de baja por admin/staff

---

### Nueva Tabla: `AdminActionLog`
Auditoría de acciones críticas.

```sql
CREATE TABLE "AdminActionLog" (
    id SERIAL PRIMARY KEY,
    adminId INTEGER NOT NULL,
    targetUserId INTEGER,
    targetVisionId INTEGER,
    actionType VARCHAR(50) NOT NULL,     -- RESTART_CYCLE, DROP_USER, etc.
    details JSONB,                       -- Datos de la acción
    createdAt TIMESTAMP(3)
);
```

**Tipos de acciones:**
- `RESTART_CYCLE`: Reinicio total de ciclo
- `DROP_USER`: Baja forzada por admin
- `EXTEND_VISION`: Extensión de visión
- `EDIT_CARTA`: Edición de carta aprobada
- `USER_DESERT`: Deserción voluntaria

---

### Modificaciones a Tablas Existentes

**`Usuario`:**
```sql
ALTER TABLE Usuario ADD COLUMN visionId INTEGER;
-- NULL = Usuario independiente (100 días)
-- NOT NULL = Pertenece a grupo
```

**`CartaFrutos`:**
```sql
ALTER TABLE CartaFrutos ADD COLUMN cycleStartDate TIMESTAMP(3);
ALTER TABLE CartaFrutos ADD COLUMN cycleEndDate TIMESTAMP(3);
ALTER TABLE CartaFrutos ADD COLUMN tasksGenerated BOOLEAN DEFAULT FALSE;
ALTER TABLE CartaFrutos ADD COLUMN tasksGeneratedAt TIMESTAMP(3);
```

---

## 🧮 Lógica de Cálculo de Fechas

### Archivo: `/lib/dateCalculator.ts`

#### Función Principal: `calculateCycleDates(userId)`

**Reglas de Negocio:**

```typescript
if (usuario.visionId !== null) {
  // CASO: USUARIO EN VISIÓN (GRUPO)
  cycleType = 'VISION';
  endDate = vision.endDate;
  
  // Si entra tarde, solo genera días restantes
  if (hoy > vision.startDate) {
    diasRestantes = endDate - hoy;
    // Genera solo esos días
  }
  
} else {
  // CASO: USUARIO SOLO (INDEPENDIENTE)
  cycleType = 'SOLO';
  endDate = hoy + 100 días;
}
```

**Ejemplo 1 - Usuario Solo:**
```
Aprobación: 2025-01-15
Fin: 2025-04-25 (100 días después)
Tareas: ~100 instancias
```

**Ejemplo 2 - Usuario Visión (entra al inicio):**
```
Visión: "Alpha 2025"
Inicio Visión: 2025-01-01
Fin Visión: 2025-06-30
Aprobación usuario: 2025-01-05
Tareas: Genera desde 2025-01-05 hasta 2025-06-30 (~177 días)
```

**Ejemplo 3 - Usuario Visión (entra tarde):**
```
Visión: "Alpha 2025"
Fin Visión: 2025-06-30
Aprobación usuario: 2025-05-15
Tareas: Solo genera desde 2025-05-15 hasta 2025-06-30 (~46 días)
```

---

### Funciones Disponibles

```typescript
// Calcular fechas de ciclo
calculateCycleDates(userId: number): Promise<CycleDates>

// Validar si puede iniciar ciclo nuevo
canStartNewCycle(userId: number): Promise<{canStart: boolean, reason?: string}>

// Crear enrollment
createEnrollment(userId: number, cycleDates: CycleDates)

// Obtener última fecha con tareas
getLastTaskDate(userId: number): Promise<Date | null>

// Validar fecha de extensión
validateExtensionDate(currentEndDate: Date, newEndDate: Date)

// Estadísticas del ciclo
getCycleStats(userId: number)
```

---

## 🔄 Flujo de Generación de Tareas

### Archivo: `/lib/taskGenerator.ts`

**Actualización clave:**

```typescript
// ANTES:
const startDate = new Date();
const endDate = addDays(startDate, 100); // Siempre 100 días

// AHORA:
const cycleDates = await calculateCycleDates(userId);
const startDate = cycleDates.startDate;
const endDate = cycleDates.endDate; // Dinámico según tipo de ciclo
```

**Proceso completo:**

1. Obtener carta aprobada
2. **CALCULAR fechas dinámicas** (`calculateCycleDates`)
3. Aplanar todas las acciones de las 8 áreas
4. Loop desde `startDate` hasta `endDate`
5. Por cada día, verificar si la acción aplica (`shouldCreateTaskOnDate`)
6. Crear instancia de tarea si aplica
7. Batch insert con `createMany`
8. Actualizar carta con fechas del ciclo
9. Crear enrollment (`ProgramEnrollment`)

---

## 🎮 API Endpoints de Administración

### 1. POST `/api/admin/cycle/restart`
**Acción NUCLEAR**: Reinicia completamente el ciclo de un usuario.

**Request:**
```json
{
  "userId": 123,
  "reason": "Usuario solicitó empezar de cero"
}
```

**Acciones:**
- ❌ Elimina TODAS las tareas generadas
- ❌ Elimina el enrollment activo
- 🔄 Devuelve carta a estado `BORRADOR`
- 📝 Registra en `AdminActionLog`

**Response:**
```json
{
  "success": true,
  "message": "Ciclo reiniciado para Juan Pérez. La carta está ahora en estado BORRADOR.",
  "details": {
    "userName": "Juan Pérez",
    "action": "RESTART_CYCLE",
    "timestamp": "2025-12-18T12:00:00Z"
  }
}
```

---

### 2. POST `/api/admin/cycle/drop`
Da de baja a un usuario del ciclo (acción forzada por admin).

**Request:**
```json
{
  "userId": 123,
  "motivo": "Incumplimiento reiterado"
}
```

**Acciones:**
- Cambia enrollment.status a `DROPPED`
- Cancela todas las tareas pendientes
- Registra motivo en `dropReason`
- Notifica al usuario (TODO)

**Response:**
```json
{
  "success": true,
  "message": "Juan Pérez ha sido dado de baja del ciclo.",
  "details": {
    "userName": "Juan Pérez",
    "motivo": "Incumplimiento reiterado"
  }
}
```

---

### 3. POST `/api/admin/vision/extend`
Extiende la fecha de fin de una visión y genera tareas adicionales.

**Request:**
```json
{
  "visionId": 1,
  "newEndDate": "2025-09-30"
}
```

**Proceso:**
1. Valida nueva fecha (debe ser posterior a actual)
2. Obtiene todos los usuarios activos de la visión
3. Para cada usuario:
   - Busca última tarea generada
   - Genera tareas desde (última + 1 día) hasta nueva fecha
4. Actualiza `vision.endDate`
5. Actualiza todos los `programEnrollment.cycleEndDate`
6. Registra en log de auditoría

**Response:**
```json
{
  "success": true,
  "message": "Visión 'Alpha 2025' extendida exitosamente",
  "details": {
    "visionName": "Alpha 2025",
    "newEndDate": "2025-09-30",
    "additionalDays": 92,
    "usersAffected": 15,
    "totalTasksCreated": 1240,
    "results": [
      {
        "userId": 1,
        "userName": "Juan Pérez",
        "tasksCreated": 87,
        "success": true
      }
    ]
  }
}
```

---

### 4. GET `/api/admin/user/[id]`
Obtiene información completa de un usuario para el panel de admin.

**Response:**
```json
{
  "user": {
    "id": 1,
    "nombre": "Juan Pérez",
    "email": "juan@example.com",
    "rol": "USUARIO",
    "status": "ACTIVE"
  },
  "vision": {
    "id": 1,
    "name": "Alpha 2025",
    "startDate": "2025-01-01",
    "endDate": "2025-06-30",
    "status": "ACTIVE"
  },
  "enrollment": {
    "cycleType": "VISION",
    "cycleStartDate": "2025-01-05",
    "cycleEndDate": "2025-06-30",
    "status": "ACTIVE"
  },
  "carta": { ... },
  "stats": {
    "total": 177,
    "pending": 120,
    "completed": 57,
    "cancelled": 0
  }
}
```

---

## 🚪 API de Deserción (Usuario)

### POST `/api/user/desert`
Permite al usuario desertar voluntariamente.

**Request:**
```json
{
  "confirmacion": "DESERTAR"
}
```

**Validaciones:**
- Debe tener enrollment activo
- Debe escribir "DESERTAR" exactamente

**Acciones:**
- Cambia enrollment.status a `DESERTER`
- Registra `desertedAt`
- Cancela tareas pendientes
- Notifica mentor/admin

**Response:**
```json
{
  "success": true,
  "message": "Has desertado del ciclo actual. Tu progreso quedará congelado.",
  "details": {
    "userName": "Juan Pérez",
    "cycleType": "VISION",
    "visionName": "Alpha 2025",
    "desertedAt": "2025-12-18T12:00:00Z"
  }
}
```

---

### GET `/api/user/desert`
Verifica si el usuario puede desertar.

**Response:**
```json
{
  "canDesert": true,
  "enrollment": {
    "cycleType": "VISION",
    "cycleStartDate": "2025-01-05",
    "cycleEndDate": "2025-06-30",
    "visionName": "Alpha 2025"
  },
  "stats": {
    "total": 177,
    "completed": 57,
    "pending": 120
  },
  "warning": "Perderás acceso a 120 tareas pendientes y tu progreso quedará congelado."
}
```

---

## 🎨 Componentes de UI

### 1. `AdminUserControl.tsx`
Panel de control del administrador para gestionar un usuario.

**Props:**
```typescript
interface AdminUserControlProps {
  user: UserData;
  vision: VisionData | null;
  enrollment: EnrollmentData | null;
  carta: CartaData | null;
  stats: StatsData;
  onRefresh: () => void;
}
```

**Funcionalidades:**
- ✅ Badges de estado (ciclo, visión, carta)
- 📊 Barra de progreso de tareas
- 🔴 **Botón REINICIAR CICLO** (rojo, peligroso)
- ⚪ **Botón DAR DE BAJA** (gris)
- 🟣 **Botón EXTENDER VISIÓN** (púrpura, solo si en grupo)
- 🟡 **Modo Edición** (permite editar carta aprobada)

**Confirmaciones:**
- Reinicio: Requiere escribir "REINICIAR"
- Baja: Requiere motivo obligatorio
- Extensión: Valida formato de fecha

---

### 2. `DesertButton.tsx`
Botón de deserción para el perfil del usuario.

**Ubicación:** Sección "Configuración" del perfil

**Características:**
- Solo se muestra si hay enrollment activo
- Modal de confirmación disuasivo
- Requiere escribir "DESERTAR" para confirmar
- Muestra advertencias claras:
  - Tareas que perderá
  - Progreso que se congelará
  - Imposibilidad de reactivar

**Estados:**
- `loading`: Verificando si puede desertar
- `showModal`: Modal de confirmación abierto
- `deserting`: Procesando deserción

---

### 3. Página: `/dashboard/admin/ciclos`
Consola de comandante para administración de ciclos.

**Funcionalidades:**
- 🔍 Buscador por ID de usuario
- 📋 Vista completa de usuario encontrado
- 🎛️ Integra `AdminUserControl` component
- 📄 Vista previa de carta (8 áreas)
- 🔄 Botón de actualizar

**Layout:**
```
┌─────────────────────────────────────┐
│  🔍 Buscador de Usuario             │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  👤 Información del Usuario         │
│  ├─ Badges de estado                │
│  ├─ Barra de progreso               │
│  └─ Zona de Peligro (3 botones)    │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│  📋 Vista Previa de Carta           │
│  └─ 8 áreas con declaración/meta    │
└─────────────────────────────────────┘
```

---

## 🔐 Seguridad y Permisos

### Control de Acceso

**Endpoints de Admin** (`/api/admin/*`):
```typescript
// Verificar rol
const admin = await prisma.usuario.findUnique({ where: { id: adminId } });
if (!admin || !['ADMIN', 'STAFF'].includes(admin.rol)) {
  return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
}
```

**Roles permitidos:**
- `ADMIN`: Acceso completo
- `STAFF`: Acceso completo

**Roles NO permitidos:**
- `MENTOR`: No puede reiniciar/dar de baja (solo revisar)
- `USUARIO`: Sin acceso a panel de admin

---

### Auditoría Completa

Toda acción crítica se registra en `AdminActionLog`:

```typescript
await prisma.adminActionLog.create({
  data: {
    adminId: adminId,
    targetUserId: userId,
    targetVisionId: visionId,
    actionType: 'RESTART_CYCLE',
    details: {
      reason: 'Usuario solicitó reinicio',
      tasksDeleted: 177,
      userName: 'Juan Pérez',
      timestamp: new Date().toISOString()
    }
  }
});
```

**Consulta de logs:**
```sql
SELECT 
  al.*,
  u.nombre as admin_name,
  tu.nombre as target_name
FROM "AdminActionLog" al
LEFT JOIN "Usuario" u ON al."adminId" = u.id
LEFT JOIN "Usuario" tu ON al."targetUserId" = tu.id
ORDER BY al."createdAt" DESC;
```

---

## 📈 Casos de Uso Reales

### Caso 1: Usuario Independiente Inicia Programa

**Flujo:**
1. Usuario llena su Carta F.R.U.T.O.S.
2. Mentor aprueba carta
3. Sistema detecta: `usuario.visionId = NULL`
4. `calculateCycleDates()` retorna:
   ```json
   {
     "startDate": "2025-01-15",
     "endDate": "2025-04-25",
     "cycleType": "SOLO",
     "totalDays": 100
   }
   ```
5. Genera ~100 tareas (según frecuencias configuradas)
6. Crea enrollment:
   ```json
   {
     "cycleType": "SOLO",
     "cycleStartDate": "2025-01-15",
     "cycleEndDate": "2025-04-25",
     "status": "ACTIVE",
     "visionId": null
   }
   ```

---

### Caso 2: Usuario Entra a Visión (Al Inicio)

**Setup:**
- Visión "Alpha 2025": 2025-01-01 a 2025-06-30
- Usuario asignado a visión: `usuario.visionId = 1`
- Aprueba carta: 2025-01-05

**Flujo:**
1. Sistema detecta visión activa
2. `calculateCycleDates()` retorna:
   ```json
   {
     "startDate": "2025-01-05",
     "endDate": "2025-06-30",
     "cycleType": "VISION",
     "totalDays": 177,
     "visionId": 1,
     "visionName": "Alpha 2025"
   }
   ```
3. Genera ~177 días de tareas
4. Crea enrollment:
   ```json
   {
     "cycleType": "VISION",
     "cycleStartDate": "2025-01-05",
     "cycleEndDate": "2025-06-30",
     "status": "ACTIVE",
     "visionId": 1
   }
   ```

---

### Caso 3: Usuario Entra Tarde a Visión

**Setup:**
- Visión "Alpha 2025": 2025-01-01 a 2025-06-30
- Usuario entra: 2025-05-15 (quedan 46 días)

**Flujo:**
1. Sistema detecta visión activa
2. Calcula días restantes: `endDate - hoy = 46 días`
3. Genera solo 46 días de tareas
4. Log: `⚠️ Usuario entra tarde: Solo 46 días restantes`

---

### Caso 4: Admin Extiende Visión

**Situación:**
- Visión originalmente hasta 2025-06-30
- Admin decide extender hasta 2025-09-30 (+92 días)

**Flujo:**
1. Admin: POST `/api/admin/vision/extend`
2. Sistema valida nueva fecha
3. Para cada usuario activo en la visión:
   - Busca última tarea: 2025-06-30
   - Genera tareas desde 2025-07-01 hasta 2025-09-30
4. Actualiza `vision.endDate` y todos los `enrollment.cycleEndDate`
5. Log de auditoría:
   ```json
   {
     "actionType": "EXTEND_VISION",
     "details": {
       "visionName": "Alpha 2025",
       "additionalDays": 92,
       "usersAffected": 15,
       "totalTasksCreated": 1240
     }
   }
   ```

---

### Caso 5: Usuario Deserta

**Situación:**
- Usuario con 57 tareas completadas, 120 pendientes
- Decide abandonar el programa

**Flujo:**
1. Usuario: Ve botón "Desertar" en configuración
2. Click → Modal con advertencias
3. Escribe "DESERTAR" para confirmar
4. POST `/api/user/desert`
5. Sistema:
   - Cambia `enrollment.status` a `DESERTER`
   - Cancela 120 tareas pendientes
   - Registra `desertedAt: 2025-12-18`
   - Notifica mentor
6. Usuario pierde acceso al calendario

---

### Caso 6: Admin Reinicia Ciclo de Usuario

**Situación:**
- Usuario completó mal su carta
- Quiere empezar de cero

**Flujo:**
1. Admin: Busca usuario en `/dashboard/admin/ciclos`
2. Click "Reiniciar Ciclo" (botón rojo)
3. Confirmación: Escribe "REINICIAR"
4. POST `/api/admin/cycle/restart`
5. Sistema:
   - Borra 177 tareas generadas
   - Elimina enrollment activo
   - Carta: `APROBADA` → `BORRADOR`
6. Usuario puede editar y reenviar carta

---

## 🧪 Testing del Sistema

### Checklist de Pruebas

**1. Generación de Tareas:**
- [ ] Usuario Solo → 100 días
- [ ] Usuario Visión (inicio) → Días completos
- [ ] Usuario Visión (tarde) → Días restantes
- [ ] Verificar fechas en DB

**2. Extensión de Visión:**
- [ ] Extender visión activa
- [ ] Verificar tareas adicionales generadas
- [ ] Comprobar que no duplica tareas existentes
- [ ] Log de auditoría correcto

**3. Reinicio de Ciclo:**
- [ ] Confirma borrado total de tareas
- [ ] Carta vuelve a BORRADOR
- [ ] Enrollment eliminado
- [ ] Usuario puede reenviar carta

**4. Deserción:**
- [ ] Modal de confirmación aparece
- [ ] Validación de texto "DESERTAR"
- [ ] Tareas pendientes canceladas
- [ ] Status cambia a DESERTER

**5. Baja Forzada:**
- [ ] Admin puede dar de baja
- [ ] Motivo se registra
- [ ] Usuario pierde acceso

---

## 🚀 Despliegue y Migración

### 1. Aplicar Migración de Base de Datos

```bash
# Aplicar migración
psql -U postgres -d plataforma_frutos < prisma/migrations/20251218_ciclos_hibridos/migration.sql

# Verificar tablas creadas
psql -U postgres -d plataforma_frutos -c "\dt"

# Debería mostrar: Vision, ProgramEnrollment, AdminActionLog
```

---

### 2. Actualizar Esquema Prisma

Regenerar cliente de Prisma:

```bash
npx prisma generate
```

---

### 3. Verificar Endpoints

```bash
# Test: Obtener usuario
curl http://localhost:3003/api/admin/user/1

# Test: Verificar deserción
curl http://localhost:3003/api/user/desert
```

---

## 📋 Configuración Inicial

### Crear Primera Visión

```sql
INSERT INTO "Vision" (name, description, "startDate", "endDate", status, "createdAt", "updatedAt")
VALUES (
  'Generación Alpha 2025',
  'Primera cohorte del programa de transformación',
  '2025-01-01',
  '2025-06-30',
  'ACTIVE',
  NOW(),
  NOW()
);
```

### Asignar Usuarios a Visión

```sql
-- Asignar 10 usuarios a la visión
UPDATE "Usuario"
SET "visionId" = 1
WHERE id IN (1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
```

---

## 🔧 Troubleshooting

### Problema: "Usuario no tiene mentor asignado"
**Solución:**
```sql
UPDATE "Usuario" SET "mentorId" = 2 WHERE id = 123;
```

### Problema: "Tareas no se generan"
**Debug:**
1. Verificar enrollment existe:
   ```sql
   SELECT * FROM "ProgramEnrollment" WHERE "usuarioId" = 123 AND status = 'ACTIVE';
   ```
2. Verificar carta aprobada:
   ```sql
   SELECT estado FROM "CartaFrutos" WHERE "usuarioId" = 123;
   ```

### Problema: "Extensión de visión no genera tareas"
**Debug:**
```sql
-- Ver última tarea generada
SELECT MAX("dueDate") FROM "Tarea" WHERE "usuarioId" = 123;

-- Comparar con cycleEndDate
SELECT "cycleEndDate" FROM "ProgramEnrollment" WHERE "usuarioId" = 123;
```

---

## 📊 Queries Útiles para Admins

### Ver Todos los Ciclos Activos

```sql
SELECT 
  u.id,
  u.nombre,
  pe."cycleType",
  pe."cycleStartDate",
  pe."cycleEndDate",
  v.name as vision_name,
  COUNT(t.id) as total_tasks,
  SUM(CASE WHEN t.status = 'COMPLETADA' THEN 1 ELSE 0 END) as completed_tasks
FROM "Usuario" u
LEFT JOIN "ProgramEnrollment" pe ON u.id = pe."usuarioId" AND pe.status = 'ACTIVE'
LEFT JOIN "Vision" v ON pe."visionId" = v.id
LEFT JOIN "Tarea" t ON u.id = t."usuarioId"
GROUP BY u.id, u.nombre, pe."cycleType", pe."cycleStartDate", pe."cycleEndDate", v.name
ORDER BY u.nombre;
```

### Ver Desertores

```sql
SELECT 
  u.nombre,
  u.email,
  pe."desertedAt",
  pe."dropReason",
  v.name as vision_name
FROM "ProgramEnrollment" pe
JOIN "Usuario" u ON pe."usuarioId" = u.id
LEFT JOIN "Vision" v ON pe."visionId" = v.id
WHERE pe.status = 'DESERTER'
ORDER BY pe."desertedAt" DESC;
```

### Auditoría de Acciones

```sql
SELECT 
  al."createdAt",
  al."actionType",
  u.nombre as admin_name,
  tu.nombre as target_user_name,
  al.details->>'reason' as reason
FROM "AdminActionLog" al
LEFT JOIN "Usuario" u ON al."adminId" = u.id
LEFT JOIN "Usuario" tu ON al."targetUserId" = tu.id
ORDER BY al."createdAt" DESC
LIMIT 50;
```

---

## 🎓 Mejores Prácticas

1. **Siempre confirmar acciones críticas**
   - Reinicio: Pedir escribir "REINICIAR"
   - Deserción: Pedir escribir "DESERTAR"
   - Baja: Requerir motivo obligatorio

2. **Log de auditoría obligatorio**
   - Toda acción crítica debe registrarse
   - Incluir detalles en campo `details` (JSONB)

3. **Validaciones antes de acciones**
   - Verificar enrollment activo
   - Verificar carta aprobada
   - Validar fechas en extensiones

4. **Notificaciones (TODO)**
   - Notificar usuario al desertar
   - Notificar mentor al dar de baja
   - Notificar grupo al extender visión

---

## 🔮 Roadmap Futuro

- [ ] Dashboard de visiones (lista de grupos activos)
- [ ] Crear visión desde UI (no solo SQL)
- [ ] Asignar usuarios masivamente a visión
- [ ] Reportes de deserción (estadísticas)
- [ ] Reactivar ciclo (deshacer deserción)
- [ ] Exportar log de auditoría a Excel
- [ ] Notificaciones automáticas completas
- [ ] Panel de métricas de visión (progreso grupal)

---

**Última actualización**: 18 de diciembre de 2025  
**Versión**: 2.0.0 - Ciclos Híbridos  
**Estado**: ✅ Sistema completo implementado
