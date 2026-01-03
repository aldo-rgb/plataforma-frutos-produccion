# 🚀 Quantum Finance Engine - API Documentation

## Overview
Sistema completo de gestión financiera para el Programa de Disciplina. Implementa escrow, pagos semanales automatizados, reembolsos automáticos y billetera organizacional.

---

## 📍 Endpoints Implementados

### 1. 💳 Payment Processing & Escrow

#### **POST** `/api/school-admin/visiones/[id]/checkout`
Procesa el pago inicial y crea el escrow de la visión.

**Auth:** `SCHOOL_ADMIN`

**Request Body:**
```json
{
  "useWalletBalance": true,
  "paymentMethod": "MANUAL"
}
```

**Response:**
```json
{
  "success": true,
  "escrow": {
    "id": 1,
    "visionId": 5,
    "totalDeposited": 800000,
    "remainingBalance": 800000,
    "status": "ACTIVE"
  },
  "payment": {
    "totalCost": 800000,
    "walletDeduction": 24000,
    "netPayment": 776000,
    "paymentMethod": "MANUAL"
  },
  "message": "Escrow creado exitosamente"
}
```

---

### 2. 💰 Weekly Payout Generation

#### **POST** `/api/admin/payouts/generate-weekly`
Genera pagos semanales para mentores basados en llamadas completadas.

**Auth:** `ADMIN` | `SUPERADMIN`

**Request Body:**
```json
{
  "weekNumber": 3,
  "visionId": 5  // Opcional, si no se envía procesa todas las visiones
}
```

**Response:**
```json
{
  "success": true,
  "weekNumber": 3,
  "payoutsGenerated": 5,
  "details": [
    {
      "visionId": 5,
      "visionNombre": "Visión Q1 2025",
      "mentorId": 8,
      "weekNumber": 3,
      "callsCompleted": 24,
      "totalAmount": 12000,
      "payoutId": 42
    }
  ],
  "message": "5 pagos generados exitosamente"
}
```

#### **GET** `/api/admin/payouts/generate-weekly?status=GENERATED&visionId=5`
Obtiene lista de payouts generados.

**Query Params:**
- `status`: PENDING | GENERATED | PAID | FAILED
- `visionId`: ID de la visión (opcional)
- `weekNumber`: Número de semana (opcional)

**Response:**
```json
{
  "success": true,
  "total": 12,
  "payouts": [
    {
      "id": 42,
      "mentorId": 8,
      "visionId": 5,
      "weekNumber": 3,
      "callsCompleted": 24,
      "totalAmount": 12000,
      "status": "GENERATED",
      "Usuario": {
        "nombre": "Juan Pérez",
        "email": "juan@mentor.com"
      },
      "VisionEscrow": {
        "Vision": {
          "nombre": "Visión Q1 2025"
        }
      }
    }
  ]
}
```

---

### 3. ✅ Mark Payout as Paid

#### **POST** `/api/admin/payouts/[id]/mark-paid`
Marca un payout como pagado.

**Auth:** `ADMIN` | `SUPERADMIN`

**Request Body:**
```json
{
  "paymentMethod": "BANK_TRANSFER",
  "transactionRef": "TXN-2025-001234"
}
```

**Response:**
```json
{
  "success": true,
  "payout": {
    "id": 42,
    "status": "PAID",
    "paidAt": "2025-01-15T10:30:00.000Z",
    "paymentMethod": "BANK_TRANSFER",
    "transactionRef": "TXN-2025-001234"
  },
  "message": "Pago marcado como completado"
}
```

---

### 4. 🐷 Student Dropout Handler

#### **POST** `/api/coordinator/students/[id]/dropout`
Procesa la baja de un estudiante y genera reembolso automático.

**Auth:** `COORDINADOR` | `ADMIN` | `SUPERADMIN`

**Request Body:**
```json
{
  "reason": "STUDENT_DROPOUT"
}
```

**Response:**
```json
{
  "success": true,
  "studentId": 25,
  "studentNombre": "María García",
  "enrollmentsProcessed": 1,
  "totalRefunded": 64000,
  "details": [
    {
      "visionId": 5,
      "visionNombre": "Visión Q1 2025",
      "enrollmentId": 102,
      "callsCancelled": 16,
      "amountRefunded": 64000,
      "refundId": 7,
      "walletNewBalance": 88000
    }
  ],
  "message": "Baja procesada exitosamente"
}
```

**Razones disponibles:**
- `STUDENT_DROPOUT` - Alumno abandonó
- `VISION_CANCELLED` - Visión cancelada
- `ADMIN_ADJUSTMENT` - Ajuste administrativo
- `MENTOR_UNAVAILABLE` - Mentor no disponible

---

### 5. 🔒 Vision Closure (Cron Job)

#### **POST** `/api/cron/vision-closure`
Cierra visiones finalizadas y procesa remanentes al wallet.

**Auth:** API Key via header `x-api-key`

**Headers:**
```
x-api-key: YOUR_CRON_SECRET
```

**Response:**
```json
{
  "success": true,
  "visionsProcessed": 3,
  "totalRefunded": 125000,
  "details": [
    {
      "visionId": 5,
      "visionNombre": "Visión Q1 2025",
      "organizationId": 2,
      "organizationName": "Universidad XYZ",
      "totalDeposited": 800000,
      "totalPaid": 675000,
      "remanente": 125000,
      "walletCredited": true,
      "closedAt": "2025-01-30T23:59:00.000Z"
    }
  ],
  "message": "3 visiones cerradas exitosamente"
}
```

#### **GET** `/api/cron/vision-closure`
Ver visiones pendientes de cierre.

**Response:**
```json
{
  "success": true,
  "pendingClosure": 2,
  "visions": [
    {
      "visionId": 5,
      "nombre": "Visión Q1 2025",
      "organizacion": "Universidad XYZ",
      "fechaFin": "2025-01-15T00:00:00.000Z",
      "diasVencida": 15,
      "enrollmentsActivos": 3,
      "escrow": {
        "totalDeposited": 800000,
        "totalPaid": 675000,
        "remainingBalance": 125000
      }
    }
  ]
}
```

---

### 6. 📊 Admin Dashboard Stats

#### **GET** `/api/admin/payouts/stats`
Estadísticas generales del sistema financiero.

**Auth:** `ADMIN` | `SUPERADMIN`

**Response:**
```json
{
  "success": true,
  "stats": {
    "payouts": {
      "total": 150,
      "pending": 12,
      "paid": 138
    },
    "amounts": {
      "totalPaid": 2500000,
      "totalPending": 156000
    },
    "escrows": {
      "active": 8,
      "closed": 3
    },
    "refunds": {
      "count": 5,
      "totalAmount": 320000
    }
  },
  "topMentors": [
    {
      "mentorId": 8,
      "mentorNombre": "Juan Pérez",
      "totalEarned": 450000,
      "payoutsCount": 24
    }
  ],
  "weeklyPayouts": [
    {
      "weekNumber": 4,
      "totalAmount": 180000,
      "payoutsCount": 8
    }
  ]
}
```

---

### 7. 💰 Mentor Earnings

#### **GET** `/api/mentor/earnings?status=PAID`
Permite al mentor ver sus pagos y ganancias.

**Auth:** `MENTOR`

**Query Params:**
- `status`: PENDING | GENERATED | PAID (opcional)

**Response:**
```json
{
  "success": true,
  "stats": {
    "totalEarnings": 450000,
    "pendingEarnings": 12000,
    "totalCalls": 180,
    "totalPayouts": 24
  },
  "payouts": [
    {
      "id": 42,
      "visionId": 5,
      "visionNombre": "Visión Q1 2025",
      "weekNumber": 3,
      "callsCompleted": 24,
      "ratePerCall": 500,
      "totalAmount": 12000,
      "status": "PAID",
      "generatedAt": "2025-01-20T23:59:00.000Z",
      "paidAt": "2025-01-22T10:30:00.000Z",
      "paymentMethod": "BANK_TRANSFER"
    }
  ]
}
```

---

### 8. 🏦 Organization Wallet (Ya existente)

#### **GET** `/api/school-admin/wallet`
Obtiene balance de wallet organizacional.

**Auth:** `SCHOOL_ADMIN`

**Response:**
```json
{
  "balance": 88000,
  "currency": "MXN",
  "availableForUse": 88000,
  "recentTransactions": [
    {
      "id": 15,
      "amount": 64000,
      "type": "CREDIT",
      "source": "REFUND_DROPOUT",
      "description": "Reembolso por baja de María García",
      "createdAt": "2025-01-25T14:30:00.000Z"
    }
  ],
  "updatedAt": "2025-01-25T14:30:00.000Z"
}
```

#### **POST** `/api/school-admin/wallet`
Añade fondos manualmente a la wallet.

**Request Body:**
```json
{
  "amount": 50000,
  "description": "Ajuste manual",
  "source": "ADMIN_ADJUSTMENT"
}
```

---

## 🔄 Flujo Completo del Sistema

### **Fase 1: Setup Inicial**
1. Director accede a `/dashboard/school-admin/visiones/asignacion/[id]`
2. Usa la **Calculadora de Presupuesto** Quantum
3. Selecciona número de estudiantes y tarifa de mentor
4. Sistema calcula costo total y muestra saldo de wallet
5. Director confirma y hace checkout

**API Call:**
```bash
POST /api/school-admin/visiones/5/checkout
{
  "useWalletBalance": true,
  "paymentMethod": "MANUAL"
}
```

### **Fase 2: Ciclo Semanal**
1. **Domingo 23:59** - Cron ejecuta generación de payouts
2. Sistema identifica todas las llamadas `COMPLETED` y `MISSED_BY_USER` de la semana
3. Agrupa por mentor y calcula montos
4. Crea registros `MentorPayout` con status `GENERATED`
5. Debita del escrow

**Cron Job:**
```bash
curl -X POST https://tu-dominio.com/api/admin/payouts/generate-weekly \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekNumber": 3}'
```

### **Fase 3: Pago a Mentores**
1. Admin accede al panel de payouts
2. Revisa lista de pagos `GENERATED`
3. Exporta CSV o procesa transferencias
4. Marca cada payout como `PAID`

**API Call:**
```bash
POST /api/admin/payouts/42/mark-paid
{
  "paymentMethod": "BANK_TRANSFER",
  "transactionRef": "TXN-2025-001234"
}
```

### **Fase 4: Manejo de Bajas**
1. Coordinador detecta que un alumno abandonó
2. Marca alumno como `DROPPED`
3. Sistema automáticamente:
   - Cancela llamadas futuras
   - Calcula reembolso (llamadas no realizadas × tarifa)
   - Acredita wallet de la organización
   - Actualiza escrow

**API Call:**
```bash
POST /api/coordinator/students/25/dropout
{
  "reason": "STUDENT_DROPOUT"
}
```

### **Fase 5: Cierre de Visión**
1. **Daily Cron** revisa visiones con `fechaFin < now()`
2. Para cada visión:
   - Calcula remanente: `totalDeposited - totalPaid`
   - Acredita remanente a wallet organizacional
   - Marca escrow como `CLOSED`
3. Director recibe email con resumen de cierre

**Cron Job:**
```bash
curl -X POST https://tu-dominio.com/api/cron/vision-closure \
  -H "x-api-key: YOUR_CRON_SECRET"
```

---

## 🛡️ Seguridad

### Headers Requeridos
- **Authentication:** NextAuth session cookie
- **Cron Jobs:** Header `x-api-key` con valor de `process.env.CRON_SECRET`

### Roles de Acceso
| Endpoint | SCHOOL_ADMIN | COORDINADOR | MENTOR | ADMIN | SUPERADMIN |
|----------|:------------:|:-----------:|:------:|:-----:|:----------:|
| Checkout | ✅ | ❌ | ❌ | ✅ | ✅ |
| Generate Payouts | ❌ | ❌ | ❌ | ✅ | ✅ |
| Mark Paid | ❌ | ❌ | ❌ | ✅ | ✅ |
| Student Dropout | ❌ | ✅ | ❌ | ✅ | ✅ |
| Mentor Earnings | ❌ | ❌ | ✅ | ✅ | ✅ |
| Wallet (org) | ✅ | ❌ | ❌ | ✅ | ✅ |
| Stats | ❌ | ❌ | ❌ | ✅ | ✅ |

---

## 🔧 Configuración de Cron Jobs

### Vercel Cron (recomendado para producción)

Agregar a `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/admin/payouts/generate-weekly",
      "schedule": "59 23 * * 0"
    },
    {
      "path": "/api/cron/vision-closure",
      "schedule": "0 0 * * *"
    }
  ]
}
```

### Linux Crontab

```bash
# Generar payouts - Domingos 23:59
59 23 * * 0 curl -X POST https://tu-dominio.com/api/admin/payouts/generate-weekly \
  -H "Authorization: Bearer TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekNumber": 3}'

# Cerrar visiones - Diario 00:00
0 0 * * * curl -X POST https://tu-dominio.com/api/cron/vision-closure \
  -H "x-api-key: YOUR_CRON_SECRET"
```

---

## 📧 Notificaciones Pendientes (TODO)

- ✅ Payment confirmation email (director)
- ✅ Weekly payout notification (mentor)
- ✅ Student dropout alert (coordinador + director)
- ✅ Vision closure summary (director)
- ✅ Payment completed confirmation (mentor)

---

## 🧪 Testing

### Manual Testing Scripts

```bash
# 1. Crear escrow
curl -X POST http://localhost:3000/api/school-admin/visiones/5/checkout \
  -H "Cookie: next-auth.session-token=YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"useWalletBalance": true}'

# 2. Generar payouts semana 1
curl -X POST http://localhost:3000/api/admin/payouts/generate-weekly \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"weekNumber": 1, "visionId": 5}'

# 3. Ver payouts generados
curl http://localhost:3000/api/admin/payouts/generate-weekly?status=GENERATED

# 4. Marcar como pagado
curl -X POST http://localhost:3000/api/admin/payouts/42/mark-paid \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"paymentMethod": "BANK_TRANSFER", "transactionRef": "TEST-001"}'

# 5. Simular baja de estudiante
curl -X POST http://localhost:3000/api/coordinator/students/25/dropout \
  -H "Cookie: next-auth.session-token=YOUR_COORD_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "STUDENT_DROPOUT"}'

# 6. Ver visiones pendientes de cierre
curl http://localhost:3000/api/cron/vision-closure

# 7. Ver stats del sistema
curl http://localhost:3000/api/admin/payouts/stats \
  -H "Cookie: next-auth.session-token=YOUR_ADMIN_TOKEN"
```

---

## 📝 Variables de Entorno

```bash
# .env
DATABASE_URL="postgresql://..."
NEXTAUTH_SECRET="..."
CRON_SECRET="your-secure-cron-secret-key"
STRIPE_SECRET_KEY="sk_test_..." # Cuando implementes Stripe
STRIPE_WEBHOOK_SECRET="whsec_..." # Cuando implementes Stripe
```

---

## 🚀 Próximos Pasos

1. **Integración Stripe:**
   - Connect para pagos directos a mentores
   - Payment Intents para checkout
   - Webhooks para confirmación automática

2. **Email Notifications:**
   - Configurar SendGrid/Resend
   - Templates HTML con diseño Quantum
   - Queue system para emails masivos

3. **Admin Panel UI:**
   - Panel de payouts en Quantum Dark Mode
   - Tabla con filtros y búsqueda
   - Botones para exportar CSV
   - Modal para marcar como pagado

4. **Mentor Dashboard:**
   - Vista de earnings en dashboard de mentor
   - Histórico de pagos
   - Gráfico de ingresos por semana

---

## 💡 Notas Importantes

- **Decimal Precision:** Todos los montos usan `Decimal` con 2 decimales
- **Timezone:** CallBookings deben usar timezone correcto para cálculo de semanas
- **Idempotencia:** Verificar duplicados antes de crear payouts
- **Auditoría:** Todas las transacciones están registradas en WalletTransaction
- **Seguridad:** Cron endpoints protegidos con API key

---

**Sistema Implementado:** ✅ Completo y listo para testing
**Última Actualización:** 30 de diciembre de 2025
