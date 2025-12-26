# 📅 Sistema de Gestión de Fechas: Visiones y Licencias

## Descripción General

El sistema de fechas de visiones está **directamente vinculado** con la expiración de licencias. La fecha final (`endDate`) de una visión determina cuándo expiran TODAS las licencias asociadas a esa visión.

## 🔗 Arquitectura del Sistema

### Tablas Involucradas

1. **Vision**
   - `startDate` (DateTime): Fecha de inicio de la visión
   - `endDate` (DateTime): Fecha de fin - **CRÍTICA para expiración de licencias**
   - `nombre` (String): Nombre de la visión (usado en autoAssignVision)

2. **License**
   - `expiresAt` (DateTime): Fecha de expiración de la licencia
   - `autoAssignVision` (String): Nombre de la visión asociada
   - `organizationId` (Int): Organización propietaria

3. **LicenseAssignment**
   - `visionId` (Int): ID de la visión
   - `licenseCode` (String): Código de licencia asignado
   - `userId` (Int): Usuario que recibe la licencia
   - `isActive` (Boolean): Estado de la asignación

### Relaciones Clave

```prisma
License {
  LicenseAssignment[] @relation("LicenseToAssignments")
}

LicenseAssignment {
  License @relation("LicenseToAssignments", fields: [licenseCode], references: [code])
  Vision  @relation(fields: [visionId], references: [id])
}
```

## 🎯 Flujos Principales

### 1. Creación de Licencias con Visión

**Archivo**: `/app/api/admin/organizations/[id]/licenses/route.ts`

Cuando se crean licencias con `autoAssignVision`:

```typescript
// Si hay autoAssignVision, obtener la fecha de fin de la visión
if (autoAssignVision) {
  const vision = await prisma.vision.findFirst({
    where: {
      nombre: autoAssignVision,
      organizationId,
      isActive: true,
    },
    select: { endDate: true },
  });

  if (vision?.endDate) {
    expirationDate = new Date(vision.endDate);
    // Las licencias heredan la fecha de expiración de la visión
  }
}
```

**Resultado**: Las licencias se crean con `expiresAt = Vision.endDate`

### 2. Extensión de Fecha de Visión

**Archivo**: `/app/api/school-admin/visiones/[id]/extend-date/route.ts`

Cuando un director extiende la fecha de una visión, el sistema:

#### Paso 1: Actualizar Vision.endDate
```typescript
prisma.vision.update({
  where: { id: visionId },
  data: { endDate: newEnd }
})
```

#### Paso 2: Actualizar Licencias por autoAssignVision
Actualiza todas las licencias que tienen el nombre de la visión en `autoAssignVision`:

```typescript
prisma.license.updateMany({
  where: {
    autoAssignVision: vision.nombre,
    organizationId: vision.organizationId,
    isActive: true
  },
  data: {
    expiresAt: newEnd
  }
})
```

#### Paso 3: Actualizar Licencias por LicenseAssignment
Actualiza licencias asignadas manualmente a través de `LicenseAssignment`:

```typescript
prisma.$executeRaw`
  UPDATE "License"
  SET "expiresAt" = ${newEnd}
  WHERE "code" IN (
    SELECT DISTINCT "licenseCode"
    FROM "LicenseAssignment"
    WHERE "visionId" = ${visionId}
      AND "isActive" = true
  )
`
```

#### Paso 4: Extender ProgramEnrollment
Actualiza el enrollment de cada participante:

```typescript
await prisma.programEnrollment.update({
  where: { id: enrollment.id },
  data: {
    cycleEndDate: newEnd,
    totalWeeks: totalWeeks
  }
});
```

**Resultado**: 
- ✅ Visión extendida
- ✅ Licencias con `autoAssignVision` actualizadas
- ✅ Licencias asignadas manualmente actualizadas
- ✅ Enrollments de participantes extendidos
- ✅ Llamadas de disciplina reagendadas (si es posible)

### 3. Canjeo de Licencia

**Archivo**: `/app/api/redeem-license/route.ts`

Cuando un usuario canjea una licencia:

```typescript
// Verificar expiración
if (license.expiresAt && license.expiresAt < new Date()) {
  return NextResponse.json({ error: 'Código expirado' }, { status: 400 });
}

// Activar licencia
await prisma.usuario.update({
  where: { id: usuario.id },
  data: {
    tier: license.tierAssigned,
    subscriptionStatus: 'ACTIVE_BY_LICENSE',
    licenseCode: license.code,
    ...(license.autoAssignVision && { vision: license.autoAssignVision })
  }
});
```

**Validaciones**:
- ❌ Si `expiresAt < now()` → Código expirado
- ❌ Si `usedCount >= maxUses` → Código agotado
- ❌ Si `!isActive` → Código desactivado

## 📋 Casos de Uso

### Caso 1: Director Crea Visión con Fechas

1. Director crea visión "Quanter V2"
2. Establece `startDate: 2025-01-01` y `endDate: 2025-06-30`
3. Admin genera 50 licencias con `autoAssignVision: "Quanter V2"`
4. **Resultado**: Las 50 licencias tienen `expiresAt: 2025-06-30`

### Caso 2: Director Extiende Fecha de Visión

1. Visión "Quanter V2" termina el `2025-06-30`
2. Director decide extender hasta `2025-07-30` (30 días más)
3. Sistema ejecuta:
   - Actualiza `Vision.endDate → 2025-07-30`
   - Actualiza todas las licencias relacionadas `expiresAt → 2025-07-30`
   - Extiende `ProgramEnrollment.cycleEndDate` de todos los participantes
   - Agenda llamadas adicionales automáticamente (si es posible)
4. **Resultado**: Todos los participantes tienen 4 semanas adicionales

### Caso 3: Usuario Intenta Canjear Licencia Expirada

1. Licencia tiene `expiresAt: 2025-06-30`
2. Usuario intenta canjear el `2025-07-15`
3. **Resultado**: Error "Código expirado"

## 🔧 Validaciones Importantes

### Al Extender Fecha

```typescript
// No puede ser menor a la fecha actual
if (newEnd <= now) {
  return error('La nueva fecha debe ser mayor a la fecha actual');
}

// Máximo 30 días de extensión desde la fecha original
const maxExtensionDate = new Date(originalEndDate);
maxExtensionDate.setDate(maxExtensionDate.getDate() + 30);

if (newEnd > maxExtensionDate) {
  return error('La extensión no puede ser mayor a 30 días');
}
```

### Al Crear Visión

```typescript
// Fechas son REQUERIDAS
if (!startDate || !endDate) {
  return error('Fechas de inicio y fin son obligatorias');
}

// End date debe ser después de start date
if (new Date(endDate) <= new Date(startDate)) {
  return error('La fecha de fin debe ser posterior a la de inicio');
}
```

## 📊 Impacto en Base de Datos

### Tablas Afectadas por Extensión de Fecha

1. **Vision** → `endDate` actualizada
2. **License** → `expiresAt` actualizada (ambos métodos: autoAssignVision y LicenseAssignment)
3. **ProgramEnrollment** → `cycleEndDate` y `totalWeeks` actualizados
4. **CallBooking** → Nuevas llamadas de disciplina creadas
5. **Notification** → Notificaciones enviadas a usuarios que necesitan reagendar

## 🚨 Puntos Críticos

1. **Vision.endDate es la fuente de verdad**: Todo depende de esta fecha
2. **Dos métodos de asociación**: 
   - `License.autoAssignVision` (por nombre)
   - `LicenseAssignment.visionId` (por ID)
3. **Ambos deben actualizarse**: El endpoint de extensión debe actualizar licencias de AMBOS métodos
4. **Sincronización automática**: Al crear licencias con autoAssignVision, heredan la fecha de la visión

## 🛠️ Endpoints Clave

| Endpoint | Método | Función |
|----------|--------|---------|
| `/api/school-admin/visiones/create` | POST | Crear visión con fechas |
| `/api/school-admin/visiones/[id]/extend-date` | POST | Extender fecha y actualizar licencias |
| `/api/admin/organizations/[id]/licenses` | POST | Crear licencias (hereda fecha de visión) |
| `/api/redeem-license` | POST | Canjear licencia (valida expiración) |

## 📝 Migración de Prisma Necesaria

```bash
npx prisma migrate dev --name add_license_assignment_relation
```

Esta migración agrega la relación bidireccional entre `License` y `LicenseAssignment` para facilitar las actualizaciones en cascada.

## ✅ Testing

### Verificar que las fechas se guardan correctamente:

```javascript
// Crear visión
const vision = await prisma.vision.create({
  data: {
    nombre: "Test Vision",
    startDate: new Date("2025-01-01"),
    endDate: new Date("2025-06-30"),
    // ... otros campos
  }
});

console.log("Start:", vision.startDate);
console.log("End:", vision.endDate);
```

### Verificar que las licencias heredan la fecha:

```javascript
// Crear licencias con autoAssignVision
const licenses = await createLicenses({
  autoAssignVision: "Test Vision",
  // ... otros parámetros
});

// Verificar expiresAt
const license = await prisma.license.findFirst({
  where: { autoAssignVision: "Test Vision" }
});

console.log("License expires:", license.expiresAt);
// Debe ser igual a vision.endDate
```

### Verificar extensión de fecha:

```javascript
// Extender visión
await extendVisionDate(visionId, newDate);

// Verificar que todas las licencias se actualizaron
const licenses = await prisma.license.findMany({
  where: { autoAssignVision: "Test Vision" }
});

licenses.forEach(lic => {
  console.log("Updated expiry:", lic.expiresAt);
  // Todas deben tener la nueva fecha
});
```

## 🎯 Resumen

El sistema de fechas de visiones y licencias es **crítico** para el funcionamiento de la plataforma. La fecha de fin de una visión (`Vision.endDate`) determina:

1. ✅ Cuándo expiran las licencias asociadas
2. ✅ Cuándo termina el programa de los participantes
3. ✅ Hasta cuándo pueden reagendar llamadas
4. ✅ Cuándo deben completar sus tareas

**Regla de Oro**: Siempre que se modifica `Vision.endDate`, se DEBEN actualizar todas las licencias asociadas, tanto por `autoAssignVision` como por `LicenseAssignment`.
