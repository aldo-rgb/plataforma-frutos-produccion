# 💰 Sistema de Comisiones - Commission Ledger

## 📋 Resumen Ejecutivo

Sistema completo de gestión de pagos a mentores con registro inmutable de comisiones. Cada servicio completado genera una entrada en el **Commission Ledger** que congela el precio y la comisión en el momento de la transacción.

**Ubicación:** `/admin/pagos`

---

## 🗄️ Arquitectura de Datos

### Tabla: `CommissionLedger`

Registro inmutable de cada comisión generada.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `id` | String (CUID) | Identificador único |
| `mentorId` | Int | Mentor que recibe el pago |
| `sourceType` | Enum | Tipo: MENTORSHIP_SESSION, DISCIPLINE_CALL, PACKAGE_SESSION |
| `sourceId` | Int | ID de la sesión/llamada |
| `studentId` | Int | Cliente que pagó |
| `studentName` | String | Nombre del cliente (snapshot) |
| `totalAmount` | Decimal | Precio total pagado por cliente |
| `platformFee` | Decimal | Comisión de plataforma (monto) |
| `platformPercent` | Int | % congelado al momento |
| `payableAmount` | Decimal | Monto a pagar al mentor |
| `status` | Enum | PENDING, PAID, CANCELLED, DISPUTED, REFUNDED |
| `serviceName` | String | Descripción del servicio |
| `scheduledAt` | DateTime | Fecha original del servicio |
| `completedAt` | DateTime | Fecha de completado |
| `paidAt` | DateTime? | Fecha de pago real |
| `payoutBatchId` | String? | ID del lote de pago |
| `paymentMethod` | String? | stripe, paypal, transfer |
| `paymentReference` | String? | Referencia bancaria |

### Enums

```typescript
enum CommissionSource {
  MENTORSHIP_SESSION  // Sesión 1:1 de mentoría
  DISCIPLINE_CALL     // Llamada de disciplina (15 min)
  PACKAGE_SESSION     // Sesión dentro de paquete de 18
}

enum CommissionStatus {
  PENDING    // Por pagar
  PAID       // Pagado al mentor
  CANCELLED  // Cancelado
  DISPUTED   // En disputa
  REFUNDED   // Reembolsado
}
```

---

## ⚙️ Flujo Automático

### TRIGGER: Al Completar Sesión

**Archivo:** `/app/api/mentor/complete-session/route.ts`

```typescript
import { onMentorshipSessionCompleted, onDisciplineCallCompleted } from '@/lib/commissionCalculator';

// Después de marcar sesión como COMPLETED
if (result.booking.type === 'MENTORSHIP' && result.paymentReleased) {
  onMentorshipSessionCompleted(
    result.booking.id,
    session.user.id,
    result.booking.studentId,
    Number(result.booking.Transaction?.totalAmount),
    result.booking.scheduledAt
  );
}
```

### Servicio de Cálculo

**Archivo:** `/lib/commissionCalculator.ts`

**Funciones principales:**

1. **`calculateCommission(totalAmount, platformPercent)`**
   - Calcula reparto: platformFee vs payableAmount

2. **`createLedgerEntry(params)`**
   - Crea registro inmutable en CommissionLedger
   - Congela precio y comisión

3. **`getMentorCommissionRate(mentorId)`**
   - Obtiene % de comisión desde PerfilMentor
   - Default: 30%

4. **`onMentorshipSessionCompleted()`**
   - TRIGGER para sesiones de mentoría
   - Registra automáticamente en ledger

5. **`onDisciplineCallCompleted()`**
   - TRIGGER para llamadas de disciplina
   - Usa precio fijo: $90 MXN

6. **`markCommissionsAsPaid(ledgerIds, batchId, method)`**
   - Marca múltiples comisiones como PAID
   - Actualiza `paidAt` y `payoutBatchId`

7. **`generatePayoutReport(ledgerIds)`**
   - Genera CSV para banco
   - Formato: nombre, email, monto, referencia

---

## 🎛️ Panel de Administración

### Ubicación: `/dashboard/admin/pagos`

### KPI Cards (4 indicadores principales)

1. **Total Generado** (Azul)
   - Suma de `totalAmount` de todas las transacciones
   - Contador de transacciones

2. **Revenue Quantum** (Verde)
   - Suma de `platformFee` (tu ganancia)
   - "Tu ganancia"

3. **🔴 Nómina Pendiente** (Naranja)
   - Suma de `payableAmount` con status PENDING
   - **Este es el número crítico**

4. **Seleccionado** (Púrpura)
   - Total de comisiones seleccionadas
   - Para pago masivo

### Filtros Avanzados

```typescript
- Estado: PENDING | PAID | ALL
- Tipo de Servicio: Mentoría 1:1 | Llamadas Disciplina | Todos
- Mentor: Dropdown de mentores únicos
- Fecha Desde: Date picker
```

### Tabla de Detalle

**Columnas:**
- ☑️ Checkbox (selección múltiple)
- 📅 Fecha (DD/MMM/YYYY HH:MM)
- 👤 Mentor (Avatar + Nombre + ID)
- 📋 Concepto (Icono + Servicio + Cliente)
- 💵 Precio Venta (Total + % comisión)
- 💚 Comisión Mentor (Monto resaltado + %)
- 🏷️ Estado (Badge: Pendiente/Pagado/Cancelado)

### Acciones Masivas

Cuando se seleccionan registros:

1. **Exportar CSV** (Azul)
   - Genera archivo para banco
   - Formato: nombre, cuenta, monto, referencia

2. **Procesar Pago** (Verde)
   - Abre modal de confirmación
   - Marca como PAID en lote

---

## 🔌 API Endpoints

### 1. GET `/api/admin/commissions`

**Descripción:** Obtiene ledger con filtros

**Query Params:**
```typescript
{
  status?: 'PENDING' | 'PAID' | 'ALL',
  mentorId?: number,
  sourceType?: 'MENTORSHIP_SESSION' | 'DISCIPLINE_CALL' | 'ALL',
  from?: string (date),
  to?: string (date)
}
```

**Response:**
```json
{
  "success": true,
  "entries": [
    {
      "id": "cm123abc",
      "mentorId": 5,
      "mentorName": "Roberto Martínez",
      "sourceType": "MENTORSHIP_SESSION",
      "studentName": "Juan Pérez",
      "totalAmount": 1000,
      "platformFee": 150,
      "platformPercent": 15,
      "payableAmount": 850,
      "status": "PENDING",
      "serviceName": "Sesión de Mentoría 1:1",
      "completedAt": "2025-01-02T10:00:00Z"
    }
  ],
  "summary": {
    "totalSales": 15000,
    "platformRevenue": 2250,
    "mentorPayable": 12750,
    "entriesCount": 15
  }
}
```

---

### 2. POST `/api/admin/commissions/process-payout`

**Descripción:** Marca comisiones como pagadas

**Body:**
```json
{
  "ledgerIds": ["cm123abc", "cm456def"],
  "paymentMethod": "transfer",
  "paymentReference": "SPEI-2025010201234"
}
```

**Response:**
```json
{
  "success": true,
  "count": 2,
  "batchId": "PAYOUT-xyz789",
  "message": "2 comisiones marcadas como pagadas"
}
```

---

### 3. GET `/api/admin/commissions/export`

**Descripción:** Exporta CSV para banco

**Query Params:**
```
?ids=cm123abc&ids=cm456def
```

**Response:** Archivo CSV
```csv
mentorId,mentorName,mentorEmail,amount,currency,reference,concept,date
5,Roberto Martínez,roberto@mail.com,850.00,MXN,PAYOUT-cm123abc,Sesión de Mentoría 1:1,2025-01-02
```

---

## 💸 Flujo de "Cierre de Caja" (Payout)

### Opción A: Manual (Transferencia Bancaria)

1. Admin filtra: **"Pendientes" + "Semana Pasada"**
2. Selecciona comisiones (checkbox)
3. Botón: **"Procesar Pago ($15,400)"**
4. Sistema genera CSV con:
   - Nombre Mentor
   - Email / Datos bancarios
   - Monto a transferir
   - Referencia única
5. Admin descarga CSV
6. Admin procesa transferencias en banco
7. Admin confirma en modal: **"¿Realizaste las transferencias?"**
8. Sistema cambia status a **PAID**
9. Guarda `paidAt`, `payoutBatchId`, `paymentReference`

### Opción B: Automática (Stripe Connect)

Si implementas Stripe Connect:

```typescript
// En process-payout/route.ts
for (const ledgerId of ledgerIds) {
  const ledger = await prisma.commissionLedger.findUnique({ 
    where: { id: ledgerId },
    include: { Mentor: { include: { PerfilMentor: true } } }
  });

  if (ledger.Mentor.PerfilMentor?.stripeAccountId) {
    // Transferir automáticamente
    await stripe.transfers.create({
      amount: Math.round(Number(ledger.payableAmount) * 100),
      currency: 'mxn',
      destination: ledger.Mentor.PerfilMentor.stripeAccountId,
      transfer_group: payoutBatchId
    });
  }
}
```

---

## 📊 Reglas de Negocio

### Mentorías (Precios Variables)

- Sistema respeta precio del momento de la reserva
- Snapshot guardado en `Transaction.totalAmount`
- Comisión congelada en `platformPercent`

**Ejemplo:**
```
Mentor cobra: $1,000 MXN
Comisión mentor: 85%
Plataforma: 15%

Ledger entry:
- totalAmount: 1000
- platformFee: 150
- platformPercent: 15
- payableAmount: 850
```

### Llamadas de Disciplina (Precio Fijo)

- Precio fijo: **$90 MXN** por llamada
- Duración: 15 minutos
- Comisión según acuerdo del mentor

**Ejemplo:**
```
Precio: $90 MXN
Comisión mentor: 70%
Plataforma: 30%

Ledger entry:
- totalAmount: 90
- platformFee: 27
- platformPercent: 30
- payableAmount: 63
```

### Ausencias

**Si alumno falta (`MISSED_BY_USER`):**
- ✅ SE PAGA al mentor
- Razón: Apartó su tiempo

**Si mentor falta (`MISSED_BY_MENTOR`):**
- ❌ NO se genera ledger entry
- Razón: No cumplió su compromiso

---

## 🚀 Integración en Complete Session

### Archivo: `/app/api/mentor/complete-session/route.ts`

**ANTES:**
```typescript
// Solo marcaba sesión como COMPLETED
// Liberaba Transaction status → RELEASED
```

**AHORA:**
```typescript
// 3a. Registrar en Commission Ledger
if (result.booking.type === 'MENTORSHIP' && result.paymentReleased) {
  onMentorshipSessionCompleted(
    result.booking.id,
    session.user.id,
    result.booking.studentId,
    Number(result.booking.Transaction?.totalAmount),
    result.booking.scheduledAt
  ).catch((error) => {
    console.error('❌ Error registrando en Commission Ledger:', error);
  });
} else if (result.booking.type === 'DISCIPLINE') {
  onDisciplineCallCompleted(
    result.booking.id,
    session.user.id,
    result.booking.studentId,
    90, // Precio fijo
    result.booking.scheduledAt
  ).catch((error) => {
    console.error('❌ Error registrando llamada en Commission Ledger:', error);
  });
}
```

---

## 📈 Ventajas del Sistema

### 1. Inmutabilidad
- Cada entrada congela precio y comisión
- No hay problemas si mentor cambia sus tarifas después
- Audit trail completo

### 2. Transparencia
- Admin ve exactamente cuánto debe a cada mentor
- Mentor puede ver su historial (futuro feature)
- Contabilidad clara

### 3. Flexibilidad
- Comisiones personalizadas por mentor
- Distintos tipos de servicios
- Estados múltiples (PENDING, PAID, DISPUTED)

### 4. Escalabilidad
- Soporta miles de transacciones
- Filtros eficientes con índices
- Pago masivo en lotes

### 5. Compliance
- Registro de cada transacción
- Referencias bancarias únicas
- Fecha de pago real (`paidAt`)

---

## 🧪 Testing

### Escenario 1: Mentoría 1:1 Completada

```typescript
// 1. Crear booking
const booking = await prisma.callBooking.create({
  data: {
    mentorId: 5,
    studentId: 10,
    scheduledAt: new Date(),
    type: 'MENTORSHIP',
    status: 'CONFIRMED'
  }
});

// 2. Crear transaction
const transaction = await prisma.transaction.create({
  data: {
    bookingId: booking.id,
    totalAmount: 1000,
    platformShare: 150,
    mentorEarnings: 850,
    status: 'HELD'
  }
});

// 3. Completar sesión (POST /api/mentor/complete-session)
// Debe crear automáticamente CommissionLedger entry

// 4. Verificar
const ledger = await prisma.commissionLedger.findFirst({
  where: {
    sourceType: 'MENTORSHIP_SESSION',
    sourceId: booking.id
  }
});

expect(ledger).toBeTruthy();
expect(ledger.totalAmount).toBe(1000);
expect(ledger.platformFee).toBe(150);
expect(ledger.payableAmount).toBe(850);
expect(ledger.status).toBe('PENDING');
```

### Escenario 2: Pago Masivo

```typescript
// 1. Obtener comisiones pendientes
const pending = await prisma.commissionLedger.findMany({
  where: { status: 'PENDING', mentorId: 5 }
});

// 2. Procesar pago (POST /api/admin/commissions/process-payout)
const response = await fetch('/api/admin/commissions/process-payout', {
  method: 'POST',
  body: JSON.stringify({
    ledgerIds: pending.map(p => p.id),
    paymentMethod: 'transfer',
    paymentReference: 'SPEI-123456'
  })
});

// 3. Verificar
const updated = await prisma.commissionLedger.findMany({
  where: { id: { in: pending.map(p => p.id) } }
});

updated.forEach(entry => {
  expect(entry.status).toBe('PAID');
  expect(entry.paidAt).toBeTruthy();
  expect(entry.payoutBatchId).toContain('PAYOUT-');
});
```

---

## 🔐 Seguridad

### Autenticación
- Solo `ADMIN` puede acceder a `/api/admin/commissions`
- Solo `MENTOR` o `LIDER` puede completar sesiones

### Validaciones
- No se puede pagar dos veces (status PENDING → PAID)
- No se puede completar sesión antes de fecha programada
- Sesión debe pertenecer al mentor autenticado

### Audit Trail
- Cada cambio de status registrado
- Timestamp de completado y pagado
- Referencia de pago bancario

---

## 📝 Notas de Migración

Si ya tienes transacciones históricas:

```sql
-- Crear entradas retroactivas desde Transaction table
INSERT INTO "CommissionLedger" (
  id,
  "mentorId",
  "sourceType",
  "sourceId",
  "studentId",
  "studentName",
  "totalAmount",
  "platformFee",
  "platformPercent",
  "payableAmount",
  status,
  "serviceName",
  "scheduledAt",
  "completedAt",
  "paidAt"
)
SELECT
  gen_random_uuid()::text,
  cb."mentorId",
  'MENTORSHIP_SESSION'::"CommissionSource",
  cb.id,
  cb."studentId",
  u.nombre,
  t."totalAmount",
  t."platformShare",
  30, -- Asume 30% default
  t."mentorEarnings",
  CASE 
    WHEN t.status = 'RELEASED' THEN 'PAID'::"CommissionStatus"
    ELSE 'PENDING'::"CommissionStatus"
  END,
  'Sesión de Mentoría 1:1 (Migración)',
  cb."scheduledAt",
  cb."completedAt",
  t."releasedAt"
FROM "CallBooking" cb
INNER JOIN "Transaction" t ON t."bookingId" = cb.id
INNER JOIN "Usuario" u ON u.id = cb."studentId"
WHERE cb.status = 'COMPLETED' AND cb.type = 'MENTORSHIP';
```

---

## 🎯 Roadmap Futuro

### Fase 1: ✅ COMPLETADO
- [x] Tabla CommissionLedger
- [x] Servicio calculador
- [x] Integración con complete-session
- [x] Panel admin básico
- [x] Filtros y resumen
- [x] Pago masivo manual
- [x] Exportar CSV

### Fase 2: 🚧 En Progreso
- [ ] Portal del Mentor (ver sus comisiones)
- [ ] Notificaciones de pago
- [ ] Gráficas de revenue
- [ ] Reporte mensual automático

### Fase 3: 🔮 Futuro
- [ ] Stripe Connect automático
- [ ] PayPal Payouts
- [ ] Facturación automática
- [ ] Reconciliación bancaria
- [ ] Tax reporting (1099, etc.)

---

## 📞 Contacto y Soporte

**Desarrollador:** Sistema Quantum FRUTOS  
**Fecha:** 2 de enero de 2026  
**Versión:** 1.0.0

---

**Status:** ✅ Sistema completo y operativo
