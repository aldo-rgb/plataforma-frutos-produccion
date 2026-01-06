# Sistema de Comisiones para Coordinadores

Este documento describe el sistema completo de comisiones implementado para coordinadores de la plataforma Frutos.

## 📋 Tabla de Contenidos

1. [Descripción General](#descripción-general)
2. [Modelos de Base de Datos](#modelos-de-base-de-datos)
3. [APIs Disponibles](#apis-disponibles)
4. [Motor de Cálculo Automático](#motor-de-cálculo-automático)
5. [Flujo de Trabajo](#flujo-de-trabajo)
6. [Ejemplos de Uso](#ejemplos-de-uso)

---

## 📖 Descripción General

El sistema de comisiones permite:

- **Configurar tarifas personalizadas** por Visión (Básico, Avanzado, PL)
- **Generar comisiones automáticamente** cuando ocurren eventos específicos
- **Gestionar estados** de comisiones (Pendiente → Autorizada → Pagada)
- **Generar reportes semanales** de nómina para dispersión bancaria

### Roles Involucrados

- **COORDINATOR_BASIC**: Gana comisión por alumnos sentados en Básico
- **COORDINATOR_ADVANCED**: Gana comisión por alumnos que cruzan a Avanzado  
- **COORDINATOR_PL**: Gana comisión por inicios, invitados y graduaciones en PL
- **Admin/Director**: Configura tarifas, autoriza y dispersa pagos

---

## 🗄️ Modelos de Base de Datos

### 1. `VisionEnrollment`
Registra inscripciones de alumnos en Visiones.

```prisma
model VisionEnrollment {
  id                Int       @id @default(autoincrement())
  userId            Int       // Alumno inscrito
  visionId          Int       // Visión
  level             VisionLevel // BASIC, ADVANCED, PL
  coordinatorId     Int       // Coordinador responsable
  enrollmentStatus  String    // ENROLLED, COMPLETED, DROPPED, GRADUATED
  attendanceStatus  String?   // ATTENDED_BASIC, ATTENDED_ADVANCED
  paymentStatus     String?   // PAID_FULL, PAID_PARTIAL, PENDING
  invitedBy         Int?      // Usuario que invitó (para PL)
  enrolledAt        DateTime
  completedAt       DateTime?
  graduatedAt       DateTime?
}
```

### 2. `CoordinatorCommissionConfig`
Configuración de tarifas por Visión.

```prisma
model CoordinatorCommissionConfig {
  id                  Int       @id
  visionId            Int       @unique
  organizationId      Int
  basicSeatedRate     Decimal   @default(300.00)  // Tarifa Básico
  advanceSeatedRate   Decimal   @default(500.00)  // Tarifa Avanzado
  plStartRate         Decimal   @default(400.00)  // Tarifa Inicio PL
  plGuestRate         Decimal   @default(400.00)  // Tarifa Invitado PL
  plGradRate          Decimal   @default(400.00)  // Tarifa Graduación PL
  isActive            Boolean   @default(true)
  createdBy           Int
}
```

### 3. `CoordinatorCommission`
Log de comisiones generadas.

```prisma
model CoordinatorCommission {
  id                    Int       @id
  coordinatorId         Int       // Quién cobra
  coordinatorRole       String    // COORDINATOR_BASIC/ADVANCED/PL
  triggerEvent          String    // BASIC_SEATED, ADVANCE_SEATED, etc.
  relatedUserId         Int       // Alumno que generó la comisión
  amount                Decimal   // Monto
  status                String    // PENDING_REVIEW, AUTHORIZED, PAID, CANCELLED
  payoutScheduledDate   DateTime? // Miércoles programado
  payoutCompletedDate   DateTime? // Fecha real de pago
  visionId              Int
  organizationId        Int
  notes                 String?
  verifiedBy            Int?      // Admin que autorizó
}
```

### 4. `WeeklyPayoutSummary`
Resumen semanal para nómina.

```prisma
model WeeklyPayoutSummary {
  id                  Int       @id
  weekStartDate       Date      // Lunes
  weekEndDate         Date      // Domingo
  payoutDate          Date      // Miércoles siguiente
  organizationId      Int
  visionId            Int?
  totalAmount         Decimal   // Total a pagar
  totalCommissions    Int       // Cantidad de comisiones
  coordinatorsCount   Int       // Cantidad de coordinadores
  status              String    // DRAFT, APPROVED, PAID
  summaryData         Json      // Desglose detallado
  generatedBy         Int
  approvedBy          Int?
}
```

---

## 🔌 APIs Disponibles

### Configuración de Tarifas

#### `GET /api/coordinator-commissions/config?visionId={id}`
Obtiene la configuración de comisiones de una visión.

**Response:**
```json
{
  "success": true,
  "config": {
    "id": 1,
    "visionId": 5,
    "basicSeatedRate": "300.00",
    "advanceSeatedRate": "500.00",
    "plStartRate": "400.00",
    "plGuestRate": "400.00",
    "plGradRate": "400.00"
  }
}
```

#### `PUT /api/coordinator-commissions/config`
Actualiza las tarifas (solo admin/director).

**Body:**
```json
{
  "visionId": 5,
  "basicSeatedRate": 350,
  "advanceSeatedRate": 550,
  "plStartRate": 450
}
```

---

### Gestión de Comisiones

#### `GET /api/coordinator-commissions?coordinatorId={id}&status={status}`
Lista comisiones de un coordinador.

**Query Params:**
- `coordinatorId` (opcional): ID del coordinador
- `visionId` (opcional): Filtrar por visión
- `status` (opcional): PENDING_REVIEW, AUTHORIZED, PAID
- `limit` (opcional): Cantidad de resultados (default: 50)

**Response:**
```json
{
  "success": true,
  "commissions": [...],
  "summary": {
    "total": 45,
    "totalAmount": 18000,
    "pending": 10,
    "authorized": 30,
    "paid": 5,
    "byEvent": {
      "BASIC_SEATED": 20,
      "PL_GUEST_PAID": 25
    }
  }
}
```

#### `POST /api/coordinator-commissions`
Crea una comisión manual (solo admin/director).

**Body:**
```json
{
  "coordinatorId": 42,
  "coordinatorRole": "COORDINATOR_PL",
  "amount": 400,
  "visionId": 5,
  "relatedUserId": 100,
  "notes": "Ajuste por evento especial"
}
```

#### `PUT /api/coordinator-commissions/{id}`
Actualiza el estado de una comisión.

**Body:**
```json
{
  "status": "AUTHORIZED",
  "payoutScheduledDate": "2026-01-15",
  "notes": "Aprobado para pago"
}
```

---

### Reportes de Nómina

#### `POST /api/coordinator-commissions/weekly-payout`
Genera resumen semanal de nómina.

**Body:**
```json
{
  "weekStartDate": "2026-01-06",
  "weekEndDate": "2026-01-12",
  "organizationId": 1,
  "visionId": 5
}
```

**Response:**
```json
{
  "success": true,
  "summary": {
    "id": 10,
    "weekStartDate": "2026-01-06",
    "weekEndDate": "2026-01-12",
    "payoutDate": "2026-01-15",
    "totalAmount": "19000.00",
    "totalCommissions": 48,
    "coordinatorsCount": 3,
    "status": "DRAFT"
  },
  "details": {
    "coordinators": [
      {
        "coordinator": {
          "id": 42,
          "nombre": "Juan Pérez",
          "email": "juan@example.com"
        },
        "totalAmount": 16000,
        "totalCommissions": 40,
        "breakdown": {
          "PL_GUEST_PAID": { "count": 40, "amount": 16000 }
        }
      }
    ]
  }
}
```

#### `GET /api/coordinator-commissions/weekly-payout?organizationId={id}`
Lista resumenes semanales.

#### `PUT /api/coordinator-commissions/weekly-payout/{id}`
Aprueba o marca como pagado un resumen.

**Body:**
```json
{
  "status": "APPROVED"
}
```

Cuando se marca como `"PAID"`, automáticamente actualiza todas las comisiones del periodo a estado PAID.

---

## ⚙️ Motor de Cálculo Automático

El archivo `/lib/commission-engine.ts` contiene las reglas de negocio.

### Reglas Implementadas

#### 1️⃣ **BASIC_SEATED** - Alumno Sentado en Básico

**Trigger:** Cuando se marca asistencia Y el alumno pagó completo

**Candados:**
- `attendanceStatus` = `'ATTENDED_BASIC'`
- `paymentStatus` = `'PAID_FULL'`

**Comisión:** $300 (configurable) para el Coordinador Básico

**Uso:**
```typescript
import { triggerBasicSeatedCommission } from '@/lib/commission-engine';

await triggerBasicSeatedCommission({
  coordinatorId: 42,
  relatedUserId: 100,
  visionId: 5,
  organizationId: 1,
  coordinatorRole: 'COORDINATOR_BASIC'
});
```

---

#### 2️⃣ **ADVANCE_SEATED** - Alumno en Avanzado

**Trigger:** Alumno que completó Básico asiste a Avanzado

**Candados:**
- Completó Básico (`enrollmentStatus` = `'COMPLETED'`)
- `attendanceStatus` = `'ATTENDED_ADVANCED'`
- `paymentStatus` = `'PAID_FULL'`

**Comisión:** $500 (configurable) para el Coordinador Avanzado

---

#### 3️⃣ **PL_START** - Inicio de PL (Tribu Propia)

**Trigger:** Alumno se inscribe en PL

**Candados:**
- `paymentStatus` = `'PAID_FULL'`
- `invitedBy` = `null` (no fue invitado, es su propia tribu)

**Comisión:** $400 (configurable) para el Coordinador PL

---

#### 4️⃣ **PL_GUEST_PAID** - Invitado de PL Pagó ⭐

**Trigger:** Un invitado paga su Básico al 100%

**Lógica:**
1. Luis fue invitado por Pedro (`invitedBy` = Pedro)
2. Pedro está en PL con Coordinador Juan
3. Cuando Luis paga → Juan recibe $400

**Candados:**
- El invitado tiene `paymentStatus` = `'PAID_FULL'`
- Existe `invitedBy` (no es null)
- El invitador está inscrito en PL

**Comisión:** $400 (configurable) para el Coordinador PL del invitador

**Uso:**
```typescript
import { triggerPLGuestPaidCommission } from '@/lib/commission-engine';

// Llamar cuando un invitado pague
await triggerPLGuestPaidCommission(guestUserId, visionId);
```

---

#### 5️⃣ **PL_GRADUATION** - Graduación de PL

**Trigger:** Al finalizar Fin de Semana 4

**Candados:**
- `enrollmentStatus` = `'GRADUATED'`
- NO es `'DROPPED'` (desertor)

**Comisión:** $400 (configurable) para el Coordinador PL

---

## 🔄 Flujo de Trabajo

### Para el Coordinador

1. **Eventos automáticos generan comisiones** (estado: `PENDING_REVIEW`)
2. **Coordinador puede ver su dashboard** con comisiones pendientes
3. **Miércoles:** Recibe notificación de comisiones autorizadas
4. **Recibe pago** según calendario del director

### Para el Admin/Director

1. **Configura tarifas** por visión (una sola vez o cuando cambien)
2. **Revisa comisiones** en estado `PENDING_REVIEW`
3. **Autoriza comisiones** válidas → estado `AUTHORIZED`
4. **Cada semana (lunes):** Genera reporte semanal
5. **Aprueba reporte** → estado `APPROVED`
6. **Miércoles:** Dispersa pagos y marca como `PAID`

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Configurar Tarifas

```typescript
// Admin configura tarifas personalizadas para Visión 5
await fetch('/api/coordinator-commissions/config', {
  method: 'PUT',
  body: JSON.stringify({
    visionId: 5,
    basicSeatedRate: 350,      // $350 por alumno básico
    advanceSeatedRate: 600,    // $600 por alumno avanzado
    plGuestRate: 500           // $500 por invitado PL
  })
});
```

### Ejemplo 2: Marcar Asistencia (Trigger Automático)

```typescript
// En tu código de asistencia
await prisma.visionEnrollment.update({
  where: { id: enrollmentId },
  data: {
    attendanceStatus: 'ATTENDED_BASIC',
    paymentStatus: 'PAID_FULL'
  }
});

// Disparar comisión automáticamente
import { triggerBasicSeatedCommission } from '@/lib/commission-engine';

await triggerBasicSeatedCommission({
  coordinatorId: enrollment.coordinatorId,
  relatedUserId: enrollment.userId,
  visionId: enrollment.visionId,
  organizationId: enrollment.organizationId,
  coordinatorRole: 'COORDINATOR_BASIC'
});
```

### Ejemplo 3: Generar Nómina Semanal

```typescript
// Cada lunes, generar reporte
const response = await fetch('/api/coordinator-commissions/weekly-payout', {
  method: 'POST',
  body: JSON.stringify({
    weekStartDate: '2026-01-06',
    weekEndDate: '2026-01-12',
    organizationId: 1
  })
});

// El sistema calculará automáticamente:
// - Total a pagar
// - Desglose por coordinador
// - Fecha de pago (miércoles siguiente)
```

### Ejemplo 4: Aprobar y Pagar

```typescript
// Aprobar reporte
await fetch('/api/coordinator-commissions/weekly-payout/10', {
  method: 'PUT',
  body: JSON.stringify({ status: 'APPROVED' })
});

// Después de dispersar en el banco
await fetch('/api/coordinator-commissions/weekly-payout/10', {
  method: 'PUT',
  body: JSON.stringify({ status: 'PAID' })
});
// Esto marcará automáticamente todas las comisiones como PAID
```

---

## 🎯 Próximos Pasos

1. **Crear Dashboards** para cada rol de coordinador
2. **Implementar notificaciones** (email/push) de comisiones
3. **Agregar exportación** a PDF/Excel del reporte de nómina
4. **Integrar con sistema de pagos** (dispersión automática)

---

## 📞 Soporte

Para más información o dudas sobre el sistema de comisiones, contactar al equipo de desarrollo.
