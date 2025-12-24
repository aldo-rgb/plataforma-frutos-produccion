# 📋 Sistema de Gestión de Licencias en Visiones

## 🎯 Propósito

Este sistema permite a los directores escolares (SCHOOL_ADMIN) gestionar las licencias compradas desde el dashboard de licencias, asignándolas a participantes organizados en "Visiones" (grupos).

---

## 🔄 Flujo Completo del Sistema

### 1️⃣ Compra de Licencias
**Ubicación:** `/dashboard/school-admin/licencias`

El director compra un paquete de licencias:
- Selecciona cantidad (20, 50, 100, 200, 500, 1000)
- Elige método de pago (Stripe, PayPal, Mercado Pago, Transferencia)
- Al completar el pago, se crea/actualiza `SchoolCredit`:
  ```
  totalPurchased += cantidadComprada
  totalAllocated = 0 (inicialmente)
  ```

**Licencias disponibles = totalPurchased - totalAllocated**

---

### 2️⃣ Crear Visión
**Ubicación:** `/dashboard/school-admin/visiones`

El director crea una visión (grupo):
1. Click en "Nueva Visión"
2. Formulario:
   - **Nombre:** Ej: "Generación 2025-A"
   - **Descripción:** Ej: "Grupo de estudiantes semestre primavera"
   - **Máximo participantes:** Ej: 30 (opcional)
3. La visión se crea vinculada a su `organizationId`

**Campos en base de datos:**
```prisma
model Vision {
  id                Int    @id
  nombre            String
  descripcion       String?
  organizationId    Int    // Vinculada a la organización del director
  maxParticipantes  Int?   // Límite de participantes
  licensesAllocated Int    @default(0) // Cuántas licencias se han asignado
}
```

---

### 3️⃣ Agregar Participantes a la Visión
**Ubicación:** `/dashboard/school-admin/visiones/[id]` (página de detalle)

El director ve la lista de participantes y puede agregar más:
1. Click en "Agregar Participante"
2. Modal muestra todos los usuarios PARTICIPANTE de su organización
3. Buscar por nombre/email
4. Seleccionar usuario y click "Agregar"

**API:** `POST /api/school-admin/visiones/[id]/add-participante`
```json
{
  "participanteId": 123
}
```

Se crea registro en `VisionParticipante`:
```prisma
model VisionParticipante {
  id             Int      @id
  visionId       Int      // ID de la visión
  participanteId Int      // ID del usuario
  createdAt      DateTime
}
```

**Validaciones:**
- ✅ Verifica que la visión pertenece a la organización del director
- ✅ Verifica límite de participantes (`maxParticipantes`)
- ✅ Verifica que el participante no esté ya agregado

---

### 4️⃣ Asignar Licencia a Participante
**Ubicación:** `/dashboard/school-admin/visiones/[id]` (botón "Asignar Licencia")

Cuando un participante necesita activar su cuenta:
1. Director ve tabla con participantes sin licencia (marcados en rojo)
2. Click en "Asignar Licencia" junto al nombre del participante
3. Modal de confirmación muestra:
   - Nombre del participante
   - Licencias disponibles restantes
4. Click "Asignar Licencia"

**API:** `POST /api/school-admin/visiones/[id]/assign-license`
```json
{
  "participanteId": 123
}
```

**Proceso automático:**
1. **Genera código único** formato `FRU-XXXX-XXXX-XXXX`
   ```javascript
   // Ejemplo: FRU-A3K9-M2P7-Q5R8
   ```

2. **Actualiza el usuario:**
   ```javascript
   await prisma.usuario.update({
     where: { id: participanteId },
     data: {
       licenseCode: "FRU-A3K9-M2P7-Q5R8",
       tier: "PREMIUM",
       licenseValidUntil: new Date(+1 año)
     }
   })
   ```

3. **Decrementa licencias disponibles:**
   ```javascript
   await prisma.schoolCredit.update({
     where: { id: schoolCreditId },
     data: {
       totalAllocated: { increment: 1 }
     }
   })
   ```

4. **Incrementa contador de visión:**
   ```javascript
   await prisma.vision.update({
     where: { id: visionId },
     data: {
       licensesAllocated: { increment: 1 }
     }
   })
   ```

5. **Crea registro de auditoría:**
   ```javascript
   await prisma.licenseAssignment.create({
     data: {
       userId: participanteId,
       organizationId: directorOrgId,
       visionId: visionId,
       licenseCode: "FRU-A3K9-M2P7-Q5R8",
       assignedBy: directorId,
       assignedAt: new Date()
     }
   })
   ```

**Transacción atómica:** Todo se ejecuta en una transacción para evitar inconsistencias.

**Validaciones:**
- ✅ Verifica licencias disponibles > 0
- ✅ Verifica que el participante esté en la visión
- ✅ Verifica que el participante no tenga ya una licencia
- ✅ Genera código único (máximo 10 intentos)

---

## 📊 Estadísticas del Dashboard

### En `/dashboard/school-admin/visiones`
```
┌─────────────────────────────────────────────────────┐
│ Visiones Activas: 3                                │
│ Licencias Disponibles: 190                         │
│ Participantes Totales: 85                          │
└─────────────────────────────────────────────────────┘
```

### En `/dashboard/school-admin/visiones/[id]`
```
┌─────────────────────────────────────────────────────┐
│ Participantes Totales: 30                          │
│ Con Licencia: 25                                   │
│ Sin Licencia: 5                                    │
│ Licencias Disponibles: 190                        │
└─────────────────────────────────────────────────────┘
```

---

## 🗂️ Estructura de Base de Datos

### SchoolCredit
```
┌────────────────────────────────────────┐
│ id: 1                                  │
│ organizationId: 3                      │
│ totalPurchased: 220  ← Total comprado │
│ totalAllocated: 30   ← Total asignado │
│ ─────────────────────                 │
│ DISPONIBLES: 190     ← Diferencia     │
└────────────────────────────────────────┘
```

### Vision
```
┌────────────────────────────────────────┐
│ id: 5                                  │
│ nombre: "Generación 2025-A"            │
│ organizationId: 3                      │
│ maxParticipantes: 30                   │
│ licensesAllocated: 25 ← Asignadas     │
└────────────────────────────────────────┘
```

### VisionParticipante
```
┌────────────────────────────────────────┐
│ id: 101                                │
│ visionId: 5                            │
│ participanteId: 456                    │
│ createdAt: 2025-12-23                  │
└────────────────────────────────────────┘
```

### Usuario (Participante)
```
┌────────────────────────────────────────┐
│ id: 456                                │
│ nombre: "Juan Pérez"                   │
│ email: "juan@mail.com"                 │
│ organizationId: 3                      │
│ rol: PARTICIPANTE                      │
│ tier: PREMIUM        ← Cambia a PREMIUM│
│ licenseCode: "FRU-..." ← Código único │
│ licenseValidUntil: 2026-12-23         │
└────────────────────────────────────────┘
```

### LicenseAssignment (Auditoría)
```
┌────────────────────────────────────────┐
│ id: 789                                │
│ userId: 456         ← Quién recibe    │
│ organizationId: 3   ← De qué escuela  │
│ visionId: 5         ← En qué visión   │
│ licenseCode: "FRU-..." ← Qué código   │
│ assignedBy: 10      ← Quién asignó    │
│ assignedAt: 2025-12-23 ← Cuándo       │
└────────────────────────────────────────┘
```

---

## 🔍 Códigos de Licencia

### Formato
```
FRU-XXXX-XXXX-XXXX
```

### Características
- **Prefijo:** `FRU-` (Frutos)
- **Bloques:** 3 bloques de 4 caracteres
- **Caracteres:** `ABCDEFGHJKLMNPQRSTUVWXYZ23456789`
  - Excluye: I, O, 0, 1 (para evitar confusión)
- **Ejemplo:** `FRU-A3K9-M2P7-Q5R8`

### Generación
```javascript
function generateLicenseCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FRU-';
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 2) code += '-';
  }
  
  return code; // FRU-A3K9-M2P7-Q5R8
}
```

### Validación de Unicidad
El sistema intenta hasta 10 veces generar un código único antes de fallar.

---

## 🎮 Ejemplo Práctico

### Caso: Director asigna 30 licencias a su visión

**Estado inicial:**
```
SchoolCredit:
  totalPurchased: 220
  totalAllocated: 0
  disponibles: 220

Vision "Generación 2025-A":
  maxParticipantes: 30
  licensesAllocated: 0
  participantes: 30 agregados (sin licencia)
```

**Proceso:**
1. Director entra a `/dashboard/school-admin/visiones/5`
2. Ve tabla con 30 participantes sin licencia
3. Click "Asignar Licencia" en participante 1
4. Confirma → Se genera código `FRU-A3K9-M2P7-Q5R8`
5. Repite para los 30 participantes

**Estado final:**
```
SchoolCredit:
  totalPurchased: 220
  totalAllocated: 30  ← Incrementó
  disponibles: 190    ← Disminuyó

Vision "Generación 2025-A":
  maxParticipantes: 30
  licensesAllocated: 30  ← Incrementó
  participantes: 30 (todos con licencia)

30 usuarios ahora tienen:
  - tier: PREMIUM
  - licenseCode: FRU-XXXX-XXXX-XXXX
  - licenseValidUntil: 2026-12-23
```

---

## 🚨 Validaciones y Seguridad

### Verificaciones automáticas
- ✅ Director solo puede acceder a visiones de su organización
- ✅ No puede asignar más licencias de las disponibles
- ✅ No puede asignar licencia a usuario que ya tiene una
- ✅ Códigos de licencia son únicos globalmente
- ✅ Todas las operaciones en transacciones atómicas

### Mensajes de error
```javascript
// Sin licencias disponibles
"No hay licencias disponibles. Compra más licencias primero."

// Usuario ya tiene licencia
"El participante ya tiene una licencia asignada"

// Límite de participantes
"Se alcanzó el límite máximo de participantes"

// Participante ya está en visión
"El participante ya está en esta visión"
```

---

## 📁 Archivos del Sistema

### Frontend (React)
```
/app/dashboard/school-admin/
  ├── visiones/
  │   ├── page.tsx                 ← Lista de visiones
  │   └── [id]/
  │       └── page.tsx             ← Detalle de visión + asignación
```

### Backend (APIs)
```
/app/api/school-admin/
  ├── visiones/
  │   ├── route.ts                 ← GET lista de visiones
  │   ├── create/route.ts          ← POST crear visión
  │   └── [id]/
  │       ├── route.ts             ← GET detalle de visión
  │       ├── add-participante/route.ts    ← POST agregar participante
  │       ├── assign-license/route.ts      ← POST asignar licencia
  │       └── remove-participante/route.ts ← POST eliminar participante
  └── users/
      └── available/route.ts       ← GET usuarios disponibles
```

### Base de Datos
```
/prisma/schema.prisma
  ├── model SchoolCredit          ← Banco de licencias
  ├── model Vision                ← Grupos/Visiones
  ├── model VisionParticipante    ← Relación visión-usuario
  ├── model LicenseAssignment     ← Auditoría de asignaciones
  └── model Usuario               ← licenseCode, tier
```

---

## 🔄 Integración con Sistema de Pagos

### Al completar pago (checkout)
```javascript
// En /api/school-admin/licenses/checkout/route.ts
await prisma.schoolCredit.upsert({
  where: { organizationId: directorOrgId },
  update: {
    totalPurchased: { increment: cantidadComprada }
  },
  create: {
    organizationId: directorOrgId,
    totalPurchased: cantidadComprada,
    totalAllocated: 0
  }
})
```

### Al asignar licencia
```javascript
// En /api/school-admin/visiones/[id]/assign-license/route.ts
await prisma.schoolCredit.update({
  where: { id: schoolCreditId },
  data: {
    totalAllocated: { increment: 1 }
  }
})
```

**Resultado:** Las licencias compradas fluyen directamente al pool disponible para asignar en visiones.

---

## 🎨 UI/UX del Sistema

### Página de lista de visiones
```
╔═══════════════════════════════════════════════════════╗
║              📋 Gestión de Visiones                  ║
╠═══════════════════════════════════════════════════════╣
║                                                       ║
║  📊 Stats Cards:                                     ║
║  ┌──────────┬──────────┬──────────┬──────────┐     ║
║  │ Visiones │ Licencias│Participan│   220    │     ║
║  │ Activas  │Disponib. │   tes    │Disponib. │     ║
║  │    3     │   190    │    85    │          │     ║
║  └──────────┴──────────┴──────────┴──────────┘     ║
║                                                       ║
║  🔍 [Buscar visión...]         [+ Nueva Visión]    ║
║                                                       ║
║  📋 Visiones:                                        ║
║  ┌───────────────────────────────────────────┐     ║
║  │ Generación 2025-A                         │     ║
║  │ 30 participantes • 25 licencias • ...     │     ║
║  │                           [Ver Detalle →] │     ║
║  └───────────────────────────────────────────┘     ║
║                                                       ║
╚═══════════════════════════════════════════════════════╝
```

### Página de detalle de visión
```
╔═══════════════════════════════════════════════════════╗
║  ← Volver      Generación 2025-A    [+ Agregar]     ║
╠═══════════════════════════════════════════════════════╣
║  📊 Stats:                                           ║
║  ┌─────────┬─────────┬─────────┬─────────┐         ║
║  │   30    │   25    │    5    │   190   │         ║
║  │Particip.│Con Lic. │Sin Lic. │Disponib.│         ║
║  └─────────┴─────────┴─────────┴─────────┘         ║
║                                                       ║
║  👥 Participantes:                                   ║
║  ┌──────────────────────────────────────────────┐  ║
║  │ Nombre    │ Tier │ Estado  │ Código │ Acción│  ║
║  ├──────────────────────────────────────────────┤  ║
║  │Juan Pérez │PREM. │✅ Activa│FRU-... │🗑️    │  ║
║  │Ana López  │FREE  │❌ Sin L.│   -    │🔑 Asig│  ║
║  └──────────────────────────────────────────────┘  ║
╚═══════════════════════════════════════════════════════╝
```

---

## 🚀 Comenzar a Usar

### Para el Director:
1. **Compra licencias** en `/dashboard/school-admin/licencias`
2. **Crea visión** en `/dashboard/school-admin/visiones` → "Nueva Visión"
3. **Entra a la visión** haciendo click en "Ver Detalle"
4. **Agrega participantes** con el botón "Agregar Participante"
5. **Asigna licencias** con el botón verde "Asignar Licencia" 🔑

### Para el Participante:
- Una vez asignada la licencia:
  - `tier` cambia a `PREMIUM`
  - `licenseCode` aparece en su perfil
  - Puede acceder a todas las funciones premium
  - La licencia es válida por 1 año

---

## 📈 Reportes y Auditoría

### Tabla `LicenseAssignment`
Guarda registro completo de cada asignación:
```sql
SELECT 
  u.nombre AS participante,
  la.licenseCode AS codigo,
  v.nombre AS vision,
  la.assignedAt AS fecha,
  d.nombre AS asignado_por
FROM LicenseAssignment la
JOIN Usuario u ON la.userId = u.id
JOIN Vision v ON la.visionId = v.id
JOIN Usuario d ON la.assignedBy = d.id
WHERE la.organizationId = 3
ORDER BY la.assignedAt DESC;
```

---

## ✅ Ventajas del Sistema

1. **Control centralizado:** Director gestiona todo desde un solo lugar
2. **Auditoría completa:** Cada asignación queda registrada
3. **Códigos únicos:** Sistema anti-duplicados
4. **Transacciones atómicas:** No hay estados inconsistentes
5. **Validaciones robustas:** Previene errores comunes
6. **UI intuitiva:** Proceso claro y visual
7. **Escalable:** Funciona con 10 o 1000 participantes

---

## 🎯 Resumen Ejecutivo

**El director puede gestionar sus licencias en 3 simples pasos:**

1. **Compra** → Licencias van al pool disponible
2. **Organiza** → Crea visiones y agrega participantes
3. **Asigna** → Click en "Asignar Licencia" y listo ✅

**Resultado:** Participantes activos con acceso premium, todo rastreado y auditado.
