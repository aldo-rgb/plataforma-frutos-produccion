# 💎 Sistema Económico de Disciplina - Quantum Finance Engine

## 📋 Resumen Ejecutivo

Este documento describe el sistema completo de gestión económica para el Programa de Disciplina, implementando un modelo de "Pay-Per-Delivery" donde los mentores cobran solo por trabajo completado, y las escuelas recuperan automáticamente fondos no utilizados.

---

## 🎯 TICKET 1: Calculadora de Presupuesto y Configuración de Costos

### Objetivo
Que el Director de Escuela sepa **exactamente** cuánto costará el Programa de Disciplina ANTES de iniciarlo, con transparencia total sobre la inversión.

### Componentes Implementados

#### 1.1 Perfil del Mentor (Backend)
**Ubicación:** `prisma/schema.prisma` - modelo `PerfilMentor`

```prisma
model PerfilMentor {
  precioDisciplina Float @default(500.0)  // Tarifa por llamada de disciplina
  precioBase       Float @default(1000.0) // Tarifa para mentorías tradicionales
}
```

**Características:**
- ✅ Cada mentor tiene su tarifa individualizada
- ✅ Default configurable por nivel de mentor
- ✅ Permite tarifas diferenciadas por expertise

#### 1.2 Calculadora Frontend (Quantum Design)
**Ubicación:** `/app/dashboard/school-admin/visiones/asignacion/[id]/page.tsx`

**Interfaz de Usuario:**
```tsx
interface BudgetCalculation {
  totalStudents: number;         // Número de alumnos
  weeksPerStudent: number;        // Semanas del ciclo
  callsPerWeek: number;           // Llamadas semanales (fijo: 2)
  totalCallsPerStudent: number;   // Total llamadas por alumno
  mentorRate: number;             // Tarifa seleccionada
  costPerStudent: number;         // Costo por alumno
  grandTotal: number;             // Costo total del programa
  escrowRequired: number;         // Monto a depositar en bóveda
}
```

**Fórmula de Cálculo:**
```javascript
const weeksPerStudent = cicloInfo?.semanas || 16;
const callsPerWeek = 2;  // Fijo para programa de disciplina
const totalCallsPerStudent = weeksPerStudent * callsPerWeek;
const costPerStudent = totalCallsPerStudent * mentorRate;
const grandTotal = costPerStudent * numStudents;
```

**Ejemplo Real:**
- **Ciclo:** 16 semanas
- **Alumnos:** 50
- **Tarifa:** $500 MXN por llamada
- **Cálculo:**
  - Llamadas por alumno: 16 × 2 = **32 llamadas**
  - Costo por alumno: 32 × $500 = **$16,000 MXN**
  - **TOTAL A PAGAR:** 50 × $16,000 = **$800,000 MXN**

#### 1.3 UI/UX Quantum Dark Mode

**Paleta de Colores:**
```css
/* Deep Space Background */
--quantum-bg: #050B14;
--quantum-surface: #151B26;

/* Neon Accents */
--quantum-cyan: #00F0FF;      /* Primary tech color */
--quantum-purple: #7B2CBF;     /* AI/Magic actions */
--quantum-gold: #FFD700;       /* Rewards/Money */
--quantum-green: #00FF94;      /* Success/Credits */
--quantum-red: #FF2A6D;        /* Alerts/Danger */
--quantum-amber: #FF9F1C;      /* Warnings */
```

**Efectos Visuales:**
- ✨ **Glassmorphism**: Fondos con `backdrop-blur`
- 💫 **Neon Glow**: Sombras con colores brillantes (`shadow-[#00F0FF]/50`)
- 🌌 **Blur Orbs**: Círculos de gradiente difuminado para profundidad
- ⚡ **Hover Effects**: Transformaciones y brillos al pasar el mouse
- 🎭 **Gradientes**: Texto y fondos con degradados multicol or

---

## 🧾 TICKET 2: Motor de Pagos Semanales (Admin Panel)

### Objetivo
Pagar a los mentores **solo por lo que trabajaron**, con corte semanal automático y reportes de nómina.

### Base de Datos

#### 2.1 Modelo MentorPayout
```prisma
model MentorPayout {
  id              Int          @id @default(autoincrement())
  escrowId        Int          // Referencia a la bóveda de la visión
  mentorId        Int
  visionId        Int
  weekNumber      Int          // Semana del ciclo (1-16)
  callsCompleted  Int          // Llamadas completadas/pagables
  ratePerCall     Decimal      // Tarifa aplicada
  totalAmount     Decimal      // Total a pagar
  status          PayoutStatus // PENDING, GENERATED, PAID, FAILED, DISPUTED
  generatedAt     DateTime     @default(now())
  paidAt          DateTime?
  paymentMethod   String?      // 'STRIPE', 'BANK_TRANSFER'
  transactionRef  String?      // ID de transacción externa
}
```

#### 2.2 Modelo PayableCall (Llamadas Pagables)
```prisma
model PayableCall {
  id            Int      @id @default(autoincrement())
  payoutId      Int
  callBookingId Int
  mentorId      Int
  studentId     Int
  visionId      Int
  weekNumber    Int
  callDate      DateTime
  status        String   // 'COMPLETED', 'MISSED_BY_USER'
  rateApplied   Decimal
  createdAt     DateTime @default(now())
}
```

### Reglas de "Devengo" (Accrual)

#### Llamadas PAGABLES ✅
1. **`COMPLETED`**: La llamada se realizó exitosamente
2. **`MISSED_BY_USER`**: El mentor asistió, el alumno faltó
   - Justificación: El mentor dedicó su tiempo

#### Llamadas NO PAGABLES ❌
1. **`MISSED_BY_MENTOR`**: El mentor faltó
   - Penalización: No cobra, puede recibir strike
2. **`CANCELLED`**: Alumno dado de baja antes de la llamada
   - El dinero vuelve al escrow para reembolso

### Motor de Corte Semanal

**Ubicación:** `/app/api/admin/payouts/generate-weekly/route.ts` (A crear)

**Lógica:**
```typescript
async function generateWeeklyPayouts(visionId: number, weekNumber: number) {
  // 1. Obtener todas las llamadas de la semana
  const calls = await prisma.callBooking.findMany({
    where: {
      visionId,
      weekNumber,
      status: { in: ['COMPLETED', 'MISSED_BY_USER'] },
      programEnrollmentId: { not: null },
    },
    include: {
      Usuario_CallBooking_mentorIdToUsuario: {
        include: { PerfilMentor: true },
      },
    },
  });

  // 2. Agrupar por mentor
  const mentorGroups = groupBy(calls, 'mentorId');

  // 3. Generar payout por mentor
  for (const [mentorId, mentorCalls] of Object.entries(mentorGroups)) {
    const callsCompleted = mentorCalls.length;
    const ratePerCall = mentorCalls[0].Usuario.PerfilMentor.precioDisciplina;
    const totalAmount = callsCompleted * ratePerCall;

    const payout = await prisma.mentorPayout.create({
      data: {
        escrowId: vision.VisionEscrow.id,
        mentorId: parseInt(mentorId),
        visionId,
        weekNumber,
        callsCompleted,
        ratePerCall,
        totalAmount,
        status: 'GENERATED',
      },
    });

    // 4. Registrar llamadas individuales
    for (const call of mentorCalls) {
      await prisma.payableCall.create({
        data: {
          payoutId: payout.id,
          callBookingId: call.id,
          mentorId: call.mentorId,
          studentId: call.studentId,
          visionId,
          weekNumber,
          callDate: call.scheduledAt,
          status: call.status,
          rateApplied: ratePerCall,
        },
      });
    }
  }
}
```

### Panel de Nómina (Super Admin)

**Vista:** `/admin/payouts`

**Tabla de Ejemplo:**
```
┌─────────────┬───────────────┬────────┬──────────┬─────────┬────────────┐
│ Mentor      │ Semana        │ Llams  │ Tarifa   │ Total   │ Estado     │
├─────────────┼───────────────┼────────┼──────────┼─────────┼────────────┤
│ Juan Pérez  │ Sem 1 (Ene 5) │ 10     │ $500     │ $5,000  │ ✅ PAGADO  │
│ María López │ Sem 1 (Ene 5) │ 8      │ $750     │ $6,000  │ 📋 GENERADO│
│ Pedro Ruiz  │ Sem 1 (Ene 5) │ 12     │ $300     │ $3,600  │ ⏳ PENDIENTE│
└─────────────┴───────────────┴────────┴──────────┴─────────┴────────────┘
```

**Acciones:**
- 📊 **Exportar CSV**: Para dispersión bancaria masiva
- 💳 **Pagar con Stripe Connect**: Transferencia directa
- ✅ **Marcar como Pagado**: Registra pago manual

**Movimiento Contable:**
```typescript
// Cuando se marca como "PAGADO"
await prisma.$transaction([
  // 1. Actualizar status del payout
  prisma.mentorPayout.update({
    where: { id: payoutId },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      paymentMethod: 'STRIPE',
      transactionRef: stripeTransferId,
    },
  }),
  
  // 2. Descontar del Escrow
  prisma.visionEscrow.update({
    where: { visionId },
    data: {
      totalPaid: { increment: payout.totalAmount },
      remainingBalance: { decrement: payout.totalAmount },
    },
  }),
]);
```

---

## 🐷 TICKET 3: Lógica de Reembolso Automático ("Slippage Recovery")

### Objetivo
**Recuperar dinero no usado** cuando un alumno abandona, sin intervención manual.

### Escenario Típico

**Estado Inicial:**
- Director pagó: **$16,000 MXN** (32 llamadas × $500)
- Alumno "Pepito" completa: **5 semanas** = 10 llamadas
- **Abandona en Semana 6**

**Resultado:**
- Llamadas completadas: 10 × $500 = **$5,000 MXN** → Ya pagadas al mentor
- Llamadas canceladas: 22 × $500 = **$11,000 MXN** → **REEMBOLSABLES**

### Base de Datos

#### 3.1 Modelo VisionRefund
```prisma
model VisionRefund {
  id                Int          @id @default(autoincrement())
  visionId          Int
  escrowId          Int
  studentId         Int
  reason            RefundReason // STUDENT_DROPOUT, VISION_CANCELLED
  callsScheduled    Int          // Total programadas
  callsCompleted    Int          // Ya hechas
  callsCancelled    Int          // Canceladas (huérfanas)
  amountRefunded    Decimal      // Monto devuelto
  processedAt       DateTime     @default(now())
  droppedAt         DateTime?    // Fecha de baja
}

enum RefundReason {
  STUDENT_DROPOUT        // Alumno abandonó
  VISION_CANCELLED       // Visión cancelada
  ADMIN_ADJUSTMENT       // Ajuste administrativo
  MENTOR_UNAVAILABLE     // Mentor no disponible
}
```

### Trigger de Baja

**Ubicación:** `/app/api/coordinator/students/[id]/status/route.ts`

```typescript
// Cuando coordinador marca alumno como DROPPED
async function handleStudentDropout(studentId: number, visionId: number) {
  // 1. Obtener llamadas futuras
  const futureCalls = await prisma.callBooking.findMany({
    where: {
      studentId,
      visionId,
      scheduledAt: { gt: new Date() },
      status: 'PENDING',
    },
    include: {
      Usuario_CallBooking_mentorIdToUsuario: {
        include: { PerfilMentor: true },
      },
    },
  });

  // 2. Cancelar todas las llamadas futuras
  await prisma.callBooking.updateMany({
    where: {
      id: { in: futureCalls.map(c => c.id) },
    },
    data: {
      status: 'CANCELLED',
      attendanceStatus: 'STUDENT_DROPPED',
    },
  });

  // 3. Calcular reembolso
  const callsCancelled = futureCalls.length;
  const amountRefunded = futureCalls.reduce((sum, call) => {
    const rate = call.Usuario.PerfilMentor.precioDisciplina;
    return sum + rate;
  }, 0);

  // 4. Registrar reembolso
  await prisma.visionRefund.create({
    data: {
      visionId,
      escrowId: vision.VisionEscrow.id,
      studentId,
      reason: 'STUDENT_DROPOUT',
      callsScheduled: totalScheduled,
      callsCompleted: completedCount,
      callsCancelled,
      amountRefunded,
      droppedAt: new Date(),
    },
  });

  console.log(`💰 Reembolso procesado: $${amountRefunded} MXN`);
}
```

### Cierre de Visión (The Audit)

**Ejecutado en:** `vision.endDate` (Automático con Cron Job)

**Ubicación:** `/app/api/cron/vision-closure/route.ts`

```typescript
async function closeVision(visionId: number) {
  const escrow = await prisma.visionEscrow.findUnique({
    where: { visionId },
    include: {
      Vision: true,
      MentorPayout: { where: { status: 'PAID' } },
    },
  });

  // 1. Calcular totales
  const totalDeposited = escrow.totalDeposited;
  const totalPaid = escrow.MentorPayout.reduce((sum, p) => sum + p.totalAmount, 0);
  const remanente = totalDeposited - totalPaid;

  console.log(`
    📊 AUDITORÍA DE VISIÓN #${visionId}
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    💵 Depositado inicial: $${totalDeposited.toLocaleString()}
    💸 Pagado a mentores:  $${totalPaid.toLocaleString()}
    💰 Remanente:          $${remanente.toLocaleString()}
    ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  `);

  // 2. Si hay remanente, mover a billetera
  if (remanente > 0) {
    await moveToOrganizationWallet(
      escrow.Vision.organizationId,
      remanente,
      visionId
    );
  }

  // 3. Cerrar escrow
  await prisma.visionEscrow.update({
    where: { visionId },
    data: {
      status: 'CLOSED',
      closedAt: new Date(),
      remainingBalance: 0,
    },
  });

  // 4. Notificar al Director
  await sendVisionClosureEmail(escrow.Vision.organizationId, {
    visionName: escrow.Vision.nombre,
    totalRefunded: remanente,
  });
}
```

---

## 🏦 TICKET 4: Billetera de la Organización (Saldo a Favor)

### Objetivo
Que las escuelas tengan un **crédito acumulable** para usar en ciclos futuros, sin perder dinero.

### Base de Datos

#### 4.1 Modelo OrganizationWallet
```prisma
model OrganizationWallet {
  id                Int                   @id @default(autoincrement())
  organizationId    Int                   @unique
  balance           Decimal               @default(0)
  currency          String                @default("MXN")
  createdAt         DateTime              @default(now())
  updatedAt         DateTime              @updatedAt
  
  WalletTransaction WalletTransaction[]
}
```

#### 4.2 Modelo WalletTransaction (Ledger)
```prisma
model WalletTransaction {
  id              Int           @id @default(autoincrement())
  walletId        Int
  amount          Decimal
  type            WalletTxType  // CREDIT (entrada) o DEBIT (salida)
  source          String        // 'REFUND_DROPOUT', 'PAYMENT_CYCLE', etc.
  description     String
  visionId        Int?
  studentId       Int?
  createdAt       DateTime      @default(now())
}

enum WalletTxType {
  CREDIT  // Dinero entra
  DEBIT   // Dinero sale
}
```

### Historial de Transacciones

**Ejemplo Real:**
```typescript
[
  {
    type: 'CREDIT',
    amount: 11000,
    source: 'REFUND_DROPOUT',
    description: 'Reembolso: Alumno Pepito abandonó (22 llamadas no usadas)',
    visionId: 5,
    createdAt: '2025-02-10',
  },
  {
    type: 'CREDIT',
    amount: 28000,
    source: 'REFUND_VISION_CLOSE',
    description: 'Cierre Visión Primavera 2025: Llamadas no ejecutadas',
    visionId: 5,
    createdAt: '2025-04-20',
  },
  {
    type: 'DEBIT',
    amount: -15000,
    source: 'PAYMENT_CYCLE',
    description: 'Pago parcial Ciclo Otoño 2025 (usado saldo a favor)',
    visionId: 7,
    createdAt: '2025-08-15',
  },
]
```

**Balance Actual:** $39,000 - $15,000 = **$24,000 MXN** disponibles

### Uso del Saldo en Checkout

**Ubicación:** `/app/dashboard/school-admin/visiones/asignacion/[id]/page.tsx`

```tsx
// En la calculadora de presupuesto
const grandTotal = budget.grandTotal; // Ej: $800,000
const walletBalance = walletInfo.balance; // Ej: $24,000

const netPayment = useWalletBalance
  ? Math.max(0, grandTotal - walletBalance)
  : grandTotal;

// Resultado: $800,000 - $24,000 = $776,000 a pagar
```

**UI Display:**
```
┌──────────────────────────────────────────────────┐
│  COSTO TOTAL:          $800,000.00 MXN           │
│  - Saldo a Favor:       -$24,000.00 MXN          │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ │
│  💳 A PAGAR AHORA:     $776,000.00 MXN          │
└──────────────────────────────────────────────────┘
```

### API Endpoints

#### GET `/api/school-admin/wallet`
**Respuesta:**
```json
{
  "balance": 24000.00,
  "currency": "MXN",
  "availableForUse": 24000.00,
  "recentTransactions": [
    {
      "id": 123,
      "amount": 11000,
      "type": "CREDIT",
      "source": "REFUND_DROPOUT",
      "description": "Reembolso: Alumno Pepito...",
      "createdAt": "2025-02-10T10:00:00Z"
    }
  ],
  "updatedAt": "2025-04-20T15:30:00Z"
}
```

#### POST `/api/school-admin/wallet/add-funds`
**Payload:**
```json
{
  "amount": 50000,
  "description": "Fondos adicionales agregados por Admin",
  "source": "ADMIN_ADJUSTMENT"
}
```

---

## 📊 Resumen del Flujo Económico Completo

### 1️⃣ INICIO: Pago Adelantado (Escrow)
```
Director → Paga $100,000 → Entra a "Bóveda" (VisionEscrow)
```

### 2️⃣ SEMANA 1-16: Pagos Semanales
```
Cada Domingo 23:59:
  ┌─ Motor de Corte Semanal
  │  ├─ Cuenta llamadas COMPLETED + MISSED_BY_USER
  │  ├─ Calcula: llamadas × tarifa_mentor
  │  └─ Genera MentorPayout (status: GENERATED)
  │
  └─ Admin revisa y paga
     ├─ Exporta CSV o usa Stripe
     ├─ Marca como PAID
     └─ Escrow.totalPaid += monto
```

### 3️⃣ ABANDONO: Reembolso Instantáneo
```
Coordinador marca alumno como DROPPED
  ├─ Cancela llamadas futuras (status: CANCELLED)
  ├─ Calcula: llamadas_canceladas × tarifa
  ├─ Registra VisionRefund
  └─ Nota: Dinero AÚN en escrow, no sale
```

### 4️⃣ FIN: Cierre y Auditoría
```
vision.endDate alcanzado:
  ┌─ Auditoría Final
  │  ├─ Total Depositado: $100,000
  │  ├─ Total Pagado:     -$60,000
  │  └─ Remanente:         $40,000
  │
  ├─ Movimiento a Wallet
  │  └─ OrganizationWallet.balance += $40,000
  │
  ├─ Escrow.status = 'CLOSED'
  │
  └─ Notificación al Director
     "Recuperaste $40,000. Disponible para próximo ciclo."
```

### 5️⃣ SIGUIENTE CICLO: Uso de Saldo
```
Director inicia nuevo ciclo:
  ├─ Costo nuevo programa: $150,000
  ├─ Saldo a favor:        -$40,000
  └─ A pagar ahora:        $110,000 ✅
```

---

## 🎨 Guía de Diseño Quantum Dark Mode

### Principios Fundamentales

1. **El HUD, no una Página Web**
   - Los contadores están siempre visibles
   - Información crítica brilla en la oscuridad
   - Feedback visual instantáneo

2. **Jerarquía de Información**
   ```
   Colores Neón > Blanco > Gris Claro > Gris Oscuro > Fondo
   ```

3. **Profundidad con Luz**
   - Fondos oscuros receden
   - Elementos importantes tienen "glow"
   - Bordes sutiles definen límites

### Componentes Clave

#### 🎯 Botones de Acción (CTAs)
```tsx
// Botón Principal (Magic Action)
<button className="
  bg-gradient-to-r from-[#7B2CBF] to-[#9D4EDD]
  hover:from-[#9D4EDD] hover:to-[#7B2CBF]
  shadow-lg shadow-[#7B2CBF]/30
  hover:shadow-[#9D4EDD]/50
  transition-all transform hover:scale-105
  rounded-xl px-6 py-4
  text-white font-bold
">
  <Sparkles className="w-5 h-5 inline mr-2" />
  Procesar Pago
</button>
```

#### 📊 Cards de Información
```tsx
<div className="relative group">
  {/* Glow Background */}
  <div className="absolute inset-0 bg-gradient-to-r from-[#00F0FF]/10 to-transparent rounded-xl blur group-hover:blur-md transition-all" />
  
  {/* Content */}
  <div className="relative bg-[#151B26]/50 backdrop-blur border border-[#00F0FF]/30 rounded-xl p-4">
    <div className="flex items-center gap-3">
      <Calendar className="w-6 h-6 text-[#00F0FF]" />
      <div>
        <p className="text-xs text-slate-400 uppercase tracking-wider">Label</p>
        <p className="text-2xl font-bold text-white">Value</p>
      </div>
    </div>
  </div>
</div>
```

#### 💰 Displays de Dinero
```tsx
{/* Gradient Money Display */}
<span className="text-3xl font-bold bg-gradient-to-r from-[#00F0FF] to-[#7B2CBF] bg-clip-text text-transparent">
  $776,000.00 MXN
</span>
```

#### ⚠️ Alertas y Avisos
```tsx
{/* Info Banner */}
<div className="flex items-start gap-3 bg-[#00F0FF]/10 border border-[#00F0FF]/30 rounded-xl p-4">
  <Info className="w-5 h-5 text-[#00F0FF] flex-shrink-0" />
  <div className="text-sm text-slate-300">
    <strong className="text-[#00F0FF]">Título:</strong> Contenido...
  </div>
</div>
```

---

## 🚀 Próximos Pasos de Implementación

### Fase 1: Base de Datos ✅
- [x] Modelos de Prisma creados
- [ ] Migración ejecutada: `npx prisma db push`
- [ ] Verificar relaciones

### Fase 2: APIs Críticas
- [x] `/api/school-admin/wallet` - Billetera (GET)
- [ ] `/api/admin/payouts/generate-weekly` - Corte semanal
- [ ] `/api/coordinator/students/[id]/status` - Trigger de baja
- [ ] `/api/cron/vision-closure` - Cierre automático

### Fase 3: UI/UX
- [x] Calculadora de presupuesto
- [ ] Panel de nómina para Admin
- [ ] Dashboard de billetera para Director
- [ ] Historial de transacciones

### Fase 4: Automatización
- [ ] Cron job para corte semanal (cada domingo 23:59)
- [ ] Cron job para cierre de visiones (verificar diario)
- [ ] Emails de notificación
- [ ] Integración con Stripe Connect

---

## 📞 Soporte y Documentación

**Autor:** Quantum Finance Engine Team  
**Versión:** 1.0.0  
**Fecha:** Diciembre 2025  
**Licencia:** Proprietary - Plataforma Frutos

Para preguntas o issues:
- 📧 Email: dev@plataformafrutos.com
- 📚 Docs: /docs/quantum-finance
- 🐛 Issues: GitHub Issues

---

**🌟 "Los mentores cobran lo justo. Las escuelas recuperan lo no usado. Todos ganan."**
