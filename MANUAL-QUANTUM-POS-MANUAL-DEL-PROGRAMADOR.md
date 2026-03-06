# 📚 MANUAL DEL PROGRAMADOR - PLATAFORMA QUANTUM FRUTOS

## Guía Completa de Desarrollo y Arquitectura

**Versión:** 3.5  
**Fecha:** 06 Marzo 2026  
**Plataforma:** Quantum Frutos - Sistema de Transformación Personal

---

# 📋 ÍNDICE

1. [Arquitectura General](#1-arquitectura-general)
2. [Sistema de Visiones](#2-sistema-de-visiones)
3. [Sistema Carta F.R.U.T.O.S.](#3-sistema-carta-frutos)
4. [Sistema de Pagos y Licencias](#4-sistema-de-pagos-y-licencias)
5. [Sistema de Mentorías](#5-sistema-de-mentorías)
6. [Sistema de Gamificación](#6-sistema-de-gamificación-quantum-archive)
7. [Sistema de Códigos de Regalo](#7-sistema-de-códigos-de-regalo)
8. [QUANTUM POS - Terminal de Cobro](#8-quantum-pos---terminal-de-cobro)
9. [Dashboard School Admin](#9-dashboard-school-admin)
10. [APIs Financieras](#10-quantum-finance-apis)
11. [Guía de Deploy](#11-guía-de-deploy)
12. [Variables de Entorno](#12-variables-de-entorno)
13. [Sistemas de Comisiones](#13-sistemas-de-comisiones)
14. [Errores Comunes y Soluciones](#14-errores-comunes-y-soluciones)
15. [Catálogo Completo de Modelos (212 Tablas)](#15-catálogo-completo-de-modelos-212-tablas)
16. [Flujos de Procesos Principales](#16-flujos-de-procesos-principales)
17. [APIs Principales](#17-apis-principales)
18. [Librerías Core](#18-librerías-core)
19. [Dashboards por Rol](#19-dashboards-por-rol)
20. [Estadísticas del Sistema](#20-estadísticas-del-sistema)
21. [Historial de Cambios](#21-historial-de-cambios)

---

# 1. ARQUITECTURA GENERAL

## 1.1 Stack Tecnológico

| Tecnología | Versión | Uso |
|------------|---------|-----|
| Next.js | 14.2.20 | Framework (App Router) |
| TypeScript | 5.x | Lenguaje principal |
| PostgreSQL | 15+ | Base de datos |
| Prisma | 5.22.0 | ORM |
| NextAuth.js | 4.x | Autenticación |
| Tailwind CSS | 3.x | Estilos |
| Vercel | - | Hosting |

## 1.2 Estructura del Proyecto

```
plataforma-frutos/
├── app/                    # Next.js App Router
│   ├── api/               # APIs REST
│   ├── dashboard/         # Páginas del dashboard
│   └── auth/              # Autenticación
├── components/            # Componentes React
│   ├── dashboard/         # Widgets del dashboard
│   ├── carta/             # Componentes de carta
│   └── ui/                # Componentes base
├── lib/                   # Utilidades
│   ├── prisma.ts         # Cliente Prisma
│   ├── auth.ts           # Configuración auth
│   └── taskGenerator.ts  # Generador de tareas
├── prisma/               # Schema de BD (~6500 líneas)
│   └── schema.prisma
└── public/               # Assets estáticos
```

## 1.3 Roles del Sistema

| Rol | Enum | Permisos |
|-----|------|----------|
| Participante | `PARTICIPANTE` | Carta, tareas, puntos |
| Mentor | `MENTOR` | Revisar cartas, llamadas |
| Game Changer | `GAMECHANGER` | Apoyo a participantes |
| Coordinador Básico | `COORDINATOR_BASIC` | Gestión nivel básico |
| Coordinador Avanzado | `COORDINATOR_ADVANCED` | Gestión nivel avanzado |
| Coordinador | `COORDINADOR` | Gestión completa |
| Trainer | `TRAINER` | Entrenamientos presenciales |
| School Admin | `SCHOOL_ADMIN` | Administración escuela |
| Administrador | `ADMINISTRADOR` | Control total |

---

# 2. SISTEMA DE VISIONES

## 2.1 Descripción

Las **Visiones** son la unidad organizativa principal del programa. Permiten aislamiento de datos donde cada coordinador gestiona su visión de forma independiente.

## 2.2 Modelo de Datos

```prisma
model Vision {
  id              Int       @id @default(autoincrement())
  nombre          String
  descripcion     String?
  organizationId  Int
  isActive        Boolean   @default(true)
  fechaInicio     DateTime?
  fechaFin        DateTime?
  
  Organization    Organization @relation(...)
  enrollments     vision_enrollments[]
  tickets         Ticket[]
}

model vision_enrollments {
  id               Int      @id @default(autoincrement())
  userId           Int
  visionId         Int
  enrolledAt       DateTime @default(now())
  enrollmentStatus String   @default("ENROLLED")
  
  @@unique([userId, visionId])
}
```

## 2.3 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/director/visiones` | GET | Listar visiones de la organización |
| `/api/school-admin/visiones` | POST | Crear nueva visión |
| `/api/school-admin/visiones/[id]/call-tracking` | GET | Tracking de llamadas |
| `/api/coordinador/productos-activos` | GET | Productos activos del coordinador |

## 2.4 Flujo

```
School Admin crea Visión → Define fechas y niveles →
Coordinadores gestionan inscripciones → Game Changers apoyan →
Participantes se inscriben → Completan 63 días
```

---

# 3. SISTEMA CARTA F.R.U.T.O.S.

## 3.1 Descripción

El corazón de la plataforma. Permite a usuarios definir metas en 8 áreas de vida con un wizard de 3 pasos y revisión granular del mentor.

## 3.2 Las 8 Áreas

1. **F**inanzas - Economía personal
2. **R**elaciones - Vínculos personales
3. **U**nidad (Paz Mental) - Bienestar emocional
4. **T**alentos - Habilidades y desarrollo
5. **O**cio - Tiempo libre y diversión
6. **S**alud - Bienestar físico

Adicionales:
7. Servicio Transformacional
8. Servicio a la Comunidad
9. Enrolamiento

## 3.3 Modelo de Datos

```prisma
model CartaFrutos {
  id                Int          @id @default(autoincrement())
  usuarioId         Int          @unique
  estado            EstadoCarta  @default(BORRADOR)
  
  // Declaraciones por área
  finanzasDeclaracion     String?
  finanzasDeclaracionStatus EstadoItem @default(PENDIENTE)
  finanzasMeta            String?
  
  // ... (8 áreas similares)
  
  autorizadoMentor  Boolean @default(false)
  autorizadoCoord   Boolean @default(false)
  wizardStep        Int     @default(0)
}

enum EstadoCarta {
  BORRADOR
  EN_REVISION
  CAMBIOS_REQUERIDOS
  APROBADA
  RECHAZADA
}
```

## 3.4 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/carta/my-carta` | GET/PUT | Obtener/actualizar carta |
| `/api/carta/submit` | POST | Enviar para revisión |
| `/api/carta/review` | POST | Mentor revisa (feedback granular) |
| `/api/carta/approve` | POST | Aprobar + explotar tareas |
| `/api/carta/[id]/stats` | GET | Estadísticas de carta |

## 3.5 Flujo de Aprobación

```
Usuario completa Wizard (3 pasos) → Submit a Mentor →
Mentor revisa campo por campo → Aprueba/Solicita cambios →
Si aprobado: Sistema genera ~100 tareas para 63 días →
Usuario ejecuta tareas diarias → Gana XP/PC
```

---

# 4. SISTEMA DE PAGOS Y LICENCIAS

## 4.1 Descripción

Gestión de órdenes de compra, confirmación de pagos, y asignación de créditos a organizaciones.

## 4.2 Modelo de Datos

```prisma
model LicenseOrder {
  id              Int          @id @default(autoincrement())
  organizationId  Int
  quantity        Int
  tier            String
  amount          Float
  status          OrderStatus  @default(PENDING)
  paymentData     Json?        // Incluye proofUrl
  
  createdAt       DateTime     @default(now())
}

model SchoolCredit {
  id              Int    @id @default(autoincrement())
  organizationId  Int    @unique
  totalPurchased  Int    @default(0)
  totalAllocated  Int    @default(0)
  totalPaid       Float  @default(0)
}

enum OrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  CANCELLED
  REFUNDED
}
```

## 4.3 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/school-admin/licenses/request` | POST | Solicitar licencias |
| `/api/admin/license-orders/[id]/mark-paid` | POST | Confirmar pago |
| `/api/admin/pending-payments` | GET | Pagos pendientes |

## 4.4 Flujo de Pago

```
School Admin solicita licencias → Genera orden PENDING →
Sube comprobante de pago (PROCESSING) →
Admin revisa → Marca como pagado (COMPLETED) →
Sistema actualiza SchoolCredit → Org puede generar códigos
```

---

# 5. SISTEMA DE MENTORÍAS

## 5.1 Descripción

Gestión de llamadas de disciplina semanales entre mentores y participantes con tracking de completado.

## 5.2 Modelo de Datos

```prisma
model CallTracking {
  id               Int      @id @default(autoincrement())
  enrollmentId     Int
  visionId         Int
  attendanceStatus AttendanceStatus @default(PENDING)
  callAttempts     Int      @default(0)
  lastInteractionAt DateTime?
  
  interactions     CallTrackingInteraction[]
}

model CallTrackingInteraction {
  id           Int      @id @default(autoincrement())
  trackingId   Int
  callResult   String
  comments     String?
  calledBy     Int
  createdAt    DateTime @default(now())
}

enum AttendanceStatus {
  PENDING       // Pendiente de asistencia
  ATTENDED      // Asistió al entrenamiento ✅
  NOT_ATTENDED  // No asistió
  DROP          // Baja/Abandono
  BACKLOG       // En lista de espera para siguiente visión
  MOVED         // Movido a otra visión
}
```

> **⚠️ IMPORTANTE:** Los valores de `attendanceStatus` en `vision_enrollments` son:
> - `PENDING` (787) - Pendiente
> - `ATTENDED` (297) - Asistió ✅
> - `NOT_ATTENDED` (11) - No asistió
> - `DROP` (10) - Baja
> - `BACKLOG` (2) - Lista de espera
> - `MOVED` (25) - Movido
> - `null` (103) - Sin estado

## 5.3 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/school-admin/visiones/[id]/call-tracking` | GET | Lista de llamadas |
| `/api/school-admin/visiones/[id]/call-tracking` | POST | Registrar interacción |
| `/api/mentor/mis-participantes` | GET | Participantes asignados |

---

# 6. SISTEMA DE GAMIFICACIÓN (QUANTUM ARCHIVE)

## 6.1 Descripción

Sistema de gamificación con dual currency (XP para estatus, PC para compras), evaluación de calidad con IA, y colecciones de logros.

## 6.2 Sistema de Puntos

| Tipo | Propósito | Ganancia |
|------|-----------|----------|
| XP (Experiencia) | Subir de nivel/rango | Completar tareas |
| PC (Puntos Cuánticos) | Comprar items | Calidad alta + streaks |

## 6.3 Rareza de Evidencias

| Rareza | XP Base | PC Base | Color |
|--------|---------|---------|-------|
| COMMON | 10 | 5 | Gris |
| UNCOMMON | 25 | 50 | Verde |
| RARE | 50 | 100 | Azul |
| EPIC | 100 | 300 | Púrpura |
| LEGENDARY | 200 | 500 | Dorado |

## 6.4 Bonificaciones

- **Día Perfecto**: +100 PC (todas las tareas del día)
- **Racha de 7 días**: Multiplicador XP
- **Calidad Alta** (≥85%): +1 tier de rareza
- **Colección completa**: Badge especial

## 6.5 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/mentor/evidencia/[id]/aprobar` | PUT | Aprobar con evaluación IA |
| `/api/evidencias/vault` | GET | Galería de logros |
| `/api/collections/progress` | GET | Progreso de colecciones |

---

# 7. SISTEMA DE CÓDIGOS DE REGALO

## 7.1 Descripción

Generación de códigos de acceso gratuito o con descuento para participantes.

## 7.2 Tipos de Código

| Tipo | Prefijo | Descripción |
|------|---------|-------------|
| GOLDEN | `GOLDEN-XXXX` | Acceso gratuito nivel básico |
| GOLDEN_DISCOUNT | `GOLDEN95-XXXX` | Descuento configurable (5-95%) |
| PLATINUM | `PLATINUM-XXXX` | Acceso completo (3 niveles) |

## 7.3 Modelo de Datos

```prisma
model GiftCode {
  id                 Int            @id @default(autoincrement())
  code               String         @unique
  type               GiftCodeType
  organizationId     Int
  visionId           Int?
  status             GiftCodeStatus @default(ACTIVE)
  value              Decimal?
  discountPercentage Int?
  createdBy          Int
  usedBy             Int?
  usedAt             DateTime?
  expiresAt          DateTime?
  
  createdAt          DateTime       @default(now())
  updatedAt          DateTime       @updatedAt
}

enum GiftCodeType {
  GOLDEN
  GOLDEN_DISCOUNT
  PLATINUM
}

enum GiftCodeStatus {
  ACTIVE
  USED
  EXPIRED
  CANCELLED
}
```

## 7.4 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/school-admin/gift-codes` | GET | Listar códigos |
| `/api/school-admin/gift-codes` | POST | Crear códigos |
| `/api/school-admin/gift-codes` | DELETE | Cancelar código |
| `/api/gift-codes/redeem` | POST | Canjear código |

---

# 8. QUANTUM POS - TERMINAL DE COBRO

## 8.1 Descripción

Sistema de cobro con terminales físicas Mercado Pago Point para pagos presenciales.

## 8.2 Modelo de Datos

```prisma
model QuantumPOSTransaction {
  id              Int                @id @default(autoincrement())
  paymentIntentId String             @unique
  deviceId        String
  amount          Decimal            @db.Decimal(10, 2)
  status          QuantumPOSStatus   @default(PENDING)
  
  participantId   Int?
  visionId        Int?
  ticketLevel     VisionLevel?
  
  mpPaymentId     String?
  mpStatus        String?
  
  ticketId        Int?               @unique
  createdBy       Int
  organizationId  Int
  
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

enum QuantumPOSStatus {
  PENDING
  PROCESSING
  APPROVED
  REJECTED
  CANCELLED
  ERROR
}
```

## 8.3 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/treasury/quantum-pos` | GET | Listar dispositivos |
| `/api/treasury/quantum-pos` | POST | Crear payment intent |
| `/api/treasury/quantum-pos` | DELETE | Cancelar transacción |
| `/api/treasury/quantum-pos/status` | GET | Estado de transacción |
| `/api/treasury/participant-info` | GET | Info de progresión |
| `/api/webhooks/mercadopago-point` | POST | Webhook de MP |

## 8.4 Flujo de Cobro

```
Admin selecciona participante → Sistema detecta nivel →
Envía cobro a terminal POS → Cliente paga →
Webhook recibe confirmación → Genera ticket automáticamente
```

---

# 9. DASHBOARD SCHOOL ADMIN

## 9.1 Descripción

Panel de control para administradores escolares con KPIs, gestión de visiones y participantes.

## 9.2 Widgets Principales

1. **KPI Cards**: Estudiantes, cumplimiento, cartas, créditos
2. **Visiones Widget**: Lista de visiones activas
3. **Registros Médicos**: Alertas de condiciones especiales
4. **Treasury Widget**: Cobros rápidos

## 9.3 APIs del Dashboard

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/school-admin/dashboard` | GET | Datos del dashboard |
| `/api/coordinador/action-stats` | GET | Estadísticas de acción |
| `/api/coordinator/medical-alerts` | GET | Alertas médicas |

---

# 10. QUANTUM FINANCE APIs

## 10.1 Descripción

Motor financiero con escrow para visiones, pagos semanales a mentores, y billetera organizacional.

## 10.2 Modelo de Escrow

```prisma
model VisionEscrow {
  id              Int      @id @default(autoincrement())
  visionId        Int      @unique
  totalDeposited  Decimal
  remainingBalance Decimal
  status          EscrowStatus @default(ACTIVE)
}

model OrganizationWallet {
  id              Int      @id @default(autoincrement())
  organizationId  Int      @unique
  balance         Decimal  @default(0)
  totalDeposited  Decimal  @default(0)
  totalWithdrawn  Decimal  @default(0)
}
```

## 10.3 APIs Principales

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/school-admin/visiones/[id]/checkout` | POST | Crear escrow |
| `/api/admin/payouts/generate-weekly` | POST | Generar pagos semanales |
| `/api/admin/payouts/[id]/mark-paid` | POST | Marcar como pagado |
| `/api/coordinator/students/[id]/dropout` | POST | Procesar baja + reembolso |

---

# 11. GUÍA DE DEPLOY

## 11.1 Requisitos

- Node.js 18+
- PostgreSQL 15+
- Cuenta Vercel
- Cuenta GitHub

## 11.2 Pasos de Deploy

```bash
# 1. Subir a GitHub
git add .
git commit -m "Deploy to production"
git push origin main

# 2. En Vercel
# - Importar repositorio
# - Configurar variables de entorno
# - Deploy automático

# 3. Migrar base de datos
npx prisma migrate deploy

# 4. Verificar
curl https://tu-app.vercel.app/api/health
```

---

# 12. VARIABLES DE ENTORNO

## 12.1 Requeridas

```env
# Base de datos
DATABASE_URL="postgresql://user:pass@host:5432/db"

# Autenticación
NEXTAUTH_SECRET="tu-secret-seguro"
NEXTAUTH_URL="https://tu-dominio.com"

# OpenAI (para IA)
OPENAI_API_KEY="sk-..."

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN="APP_USR-..."
MERCADO_PAGO_WEBHOOK_SECRET="..."

# Stripe (si aplica)
STRIPE_SECRET_KEY="sk_live_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Supabase (storage)
NEXT_PUBLIC_SUPABASE_URL="https://xxx.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="..."
```

## 12.2 Opcionales

```env
# Email
RESEND_API_KEY="re_..."

# WhatsApp
WHATSAPP_BUSINESS_ID="..."
WHATSAPP_ACCESS_TOKEN="..."

# Analytics
NEXT_PUBLIC_GA_ID="G-..."
```

---

# 13. SISTEMAS DE COMISIONES

El sistema tiene **dos motores de comisiones** independientes que trabajan en paralelo:

## 13.1 Quantum Paymaster (Comisiones de Coordinadores)

Sistema de comisiones para **coordinadores** basado en check-ins de participantes.

### Triggers de Comisión

| Trigger | Monto | Descripción |
|---------|-------|-------------|
| `BASIC_SEATED` | $300 MXN | Participante sentado en Básico |
| `ADVANCE_SEATED` | $500 MXN | Participante sentado en Avanzado |
| `ADVANCE_COMBO_SEATED` | $700 MXN | Participante Combo sentado en Avanzado |
| `PL_START` | Variable | Inicio de PL |
| `PL_WEEK3_CHECKPOINT` | $400 MXN | Checkpoint semana 3 de PL |
| `REFUND_ADJUSTMENT` | Negativo | Ajuste por reembolso |

### Archivos Clave

```
/lib/commission-engine.ts          # Motor de comisiones
/app/api/coordinator/wallet/       # API del wallet
/components/dashboard/coordinator/QuantumWalletWidget.tsx
/app/dashboard/school-admin/comisiones/  # Panel de administración
```

### API Endpoints

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/coordinator/wallet` | GET | Obtener resumen del wallet |
| `/api/school-admin/comisiones/stats` | GET | Estadísticas de comisiones |
| `/api/school-admin/comisiones/pending` | GET | Comisiones pendientes |
| `/api/school-admin/comisiones/authorize` | POST | Autorizar comisiones |

### Flujo de Check-in → Comisión

```
1. Coordinador hace check-in del participante
2. Se detecta el nivel y tipo de ticket
3. commission-engine.ts calcula el monto
4. Se crea registro en CoordinatorCommission
5. Estado inicial: PENDING_REVIEW
6. School Admin autoriza → AUTHORIZED
7. Tesorería paga → PAID
```

---

## 13.2 Quantum Ambassadors (Comisiones por Referidos)

Sistema de comisiones para **graduados** que refieren nuevos usuarios.

### Porcentajes de Comisión

| Producto | Porcentaje |
|----------|------------|
| Básico | 20% |
| Combo (Jornada Completa) | 20% |
| Avanzado | 10% |
| PL | 10% |

### Modelo de Datos

```prisma
model ambassador_wallet_transactions {
  id                Int       @id @default(autoincrement())
  ambassadorId      Int       // Graduado que refirió
  referredUserId    Int       // Usuario que compró
  ticketId          String?   // Ticket asociado
  productType       String    // BASIC, COMBO, ADVANCED, PL
  saleAmount        Decimal   // Monto de la venta
  commissionPercent Decimal   // 0.20, 0.10
  commissionAmount  Decimal   // Monto de la comisión
  status            String    // CLEARED, WITHDRAWN, SPENT
  organizationId    Int
  visionId          Int?
  createdAt         DateTime
}

model ambassador_withdrawal_requests {
  id            Int       @id @default(autoincrement())
  ambassadorId  Int
  amount        Decimal
  bankClabe     String
  bankName      String?
  accountHolder String?
  status        String    // PENDING, APPROVED, REJECTED, COMPLETED
  createdAt     DateTime
  processedAt   DateTime?
}
```

### Campos en Usuario

```prisma
model Usuario {
  isGraduated         Boolean   @default(false)
  ambassadorBalance   Decimal   @default(0)
  bankClabe           String?
  bankName            String?
  bankAccountHolder   String?
}
```

### Archivos Clave

```
/lib/ambassador-engine.ts                    # Motor de comisiones
/app/api/ambassador/wallet/route.ts          # API del wallet
/components/dashboard/AmbassadorWalletWidget.tsx      # Widget completo
/components/dashboard/ReferralCommissionsWidget.tsx   # Widget compacto
```

### Lógica de Elegibilidad

```typescript
// Un usuario es elegible para comisión si:
// 1. Es dueño del referralCode usado
// 2. Está marcado como graduado (isGraduated = true)
// 3. NO está actualmente en PL activo (si está, la comisión va al coordinador)
```

### Integración con Checkout

La comisión se procesa automáticamente cuando el pago es confirmado:

```typescript
// En /api/checkout/payment-success/route.ts
import { processAmbassadorCommission } from '@/lib/ambassador-engine';

// Después de crear el usuario y tickets:
if (userData.referralCode) {
  await processAmbassadorCommission({
    referralCode: userData.referralCode,
    referredUserId: newUser.id,
    ticketId: basicTicket.id,
    productType: ticketSelection === 'FULL_VISION' ? 'COMBO' : 'BASIC',
    saleAmount: amount,
    organizationId,
    visionId
  });
}
```

### Puntos de Integración

| Archivo | Cuándo se procesa |
|---------|-------------------|
| `/api/checkout/payment-success` | Registro + pago Stripe/MP |
| `/api/checkout-advanced/payment-success` | Upgrade a Avanzado/PL |
| `/api/gift-codes/redeem` | Canjeo de códigos de regalo |
| `/api/webhooks/mercadopago-point` | Pago con terminal POS |

---

# 14. ERRORES COMUNES Y SOLUCIONES

## 14.1 PaymentGatewayConfig.findUnique Error

**Error:**
```
Error al crear el pago: Invalid `prisma.paymentGatewayConfig.findUnique()` invocation
Argument `where` of type PaymentGatewayConfigWhereUniqueInput needs at least one of 
`id` or `organizationId_provider` arguments.
```

**Causa:** El modelo `PaymentGatewayConfig` tiene un índice único compuesto:
```prisma
@@unique([organizationId, provider])
```

**Solución:** Usar `findFirst` en lugar de `findUnique`:
```typescript
// ❌ INCORRECTO
const config = await prisma.paymentGatewayConfig.findUnique({
  where: { organizationId: orgId }
});

// ✅ CORRECTO
const config = await prisma.paymentGatewayConfig.findFirst({
  where: { organizationId: orgId, isActive: true }
});
```

**Archivos afectados:**
- `/api/checkout/create-payment/route.ts`
- `/api/checkout-advanced/create-payment/route.ts`
- `/api/tickets/create-payment/route.ts`
- `/api/school-admin/payment-gateway/test-payment/route.ts`

## 14.2 Prisma Client Desincronizado

**Síntomas:** TypeScript no reconoce campos nuevos del schema.

**Solución:**
```bash
rm -rf node_modules/.prisma && npx prisma generate
```

## 14.3 invitedByUser no existe en select

**Error:**
```
Object literal may only specify known properties, but 'invitedByUser' does not exist
```

**Causa:** Se está usando `select` en lugar de `include` para relaciones.

**Solución:**
```typescript
// ❌ INCORRECTO
const user = await prisma.usuario.findUnique({
  where: { id },
  select: { invitedByUser: { select: { referralCode: true } } }
});

// ✅ CORRECTO
const user = await prisma.usuario.findUnique({
  where: { id },
  include: { invitedByUser: { select: { referralCode: true } } }
});
```

---

# 📖 APÉNDICES

## A. Comandos Útiles

```bash
# Desarrollo
npm run dev

# Build producción
npm run build

# Prisma
npx prisma studio          # GUI de base de datos
npx prisma db push         # Sincronizar schema
npx prisma migrate dev     # Crear migración
npx prisma generate        # Generar cliente

# Git
git status
git diff
git log --oneline -10
```

## B. Estructura de APIs

Todas las APIs siguen el patrón:

```typescript
// Respuesta exitosa
{ success: true, data: {...} }

// Error
{ success: false, error: "Mensaje de error" }
```

## C. Autenticación

Usar `getServerSession` en APIs:

```typescript
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET() {
  const session = await getServerSession(authOptions);
  
  if (!session?.user?.email) {
    return NextResponse.json(
      { success: false, error: 'No autorizado' },
      { status: 401 }
    );
  }
  
  // ... lógica
}
```

---

## D. Registro de Cambios

### 26 de Febrero 2026

**Quantum Paymaster (Coordinadores)**
- Implementado sistema completo de comisiones por check-in
- Triggers: BASIC_SEATED ($300), ADVANCE_SEATED ($500), ADVANCE_COMBO_SEATED ($700), PL_WEEK3_CHECKPOINT ($400)
- Widget `QuantumWalletWidget` para dashboards de coordinadores
- API `/api/coordinator/wallet` para consultar balance
- Panel de gestión en `/dashboard/school-admin/comisiones`

**Quantum Ambassadors (Referidos)**
- Nuevo sistema de comisiones por referidos para graduados
- Porcentajes: 20% Básico/Combo, 10% Avanzado/PL
- Nuevos modelos: `ambassador_wallet_transactions`, `ambassador_withdrawal_requests`
- Nuevos campos en Usuario: `isGraduated`, `ambassadorBalance`, `bankClabe`, `bankName`, `bankAccountHolder`
- Motor: `/lib/ambassador-engine.ts`
- API: `/api/ambassador/wallet`
- Widgets: `AmbassadorWalletWidget` (completo), `ReferralCommissionsWidget` (compacto para Gamechangers)
- Integración automática en checkout, gift codes y webhooks

**Correcciones**
- Fix `PaymentGatewayConfig.findUnique` → usar `findFirst` por índice compuesto
- Archivos corregidos: checkout/create-payment, checkout-advanced/create-payment, tickets/create-payment

**Documentación**
- Añadida sección 13: Sistemas de Comisiones
- Añadida sección 14: Errores Comunes y Soluciones
- Actualizado índice del manual

**Scripts de Mantenimiento Ejecutados**
- Asignación masiva de referral codes a 37 usuarios que no tenían
- Marcado de 633 usuarios como graduados (`isGraduated = true`)
- Regeneración de cliente Prisma tras cambios en schema

---

## E. Scripts de Mantenimiento

### Asignar Referral Codes a Usuarios sin Código

```javascript
// Ejecutar con: node -e "..."
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

function generateReferralCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

async function main() {
  const usuarios = await prisma.usuario.findMany({
    where: { referralCode: null },
    select: { id: true, nombre: true }
  });
  
  for (const u of usuarios) {
    let code = generateReferralCode();
    // Verificar unicidad
    let exists = await prisma.usuario.findFirst({ where: { referralCode: code } });
    while (exists) {
      code = generateReferralCode();
      exists = await prisma.usuario.findFirst({ where: { referralCode: code } });
    }
    
    await prisma.usuario.update({
      where: { id: u.id },
      data: { referralCode: code }
    });
    console.log('✅', u.id, '-', u.nombre, ':', code);
  }
}

main().finally(() => prisma.$disconnect());
```

### Marcar Usuarios como Graduados

```javascript
// Marcar como graduados a usuarios con tickets BASIC pagados y check-in completado
const result = await prisma.usuario.updateMany({
  where: {
    tickets: {
      some: {
        level: 'BASIC',
        paymentStatus: 'PAID',
        checkInAt: { not: null }
      }
    }
  },
  data: { isGraduated: true }
});
console.log('Usuarios marcados como graduados:', result.count);
```

### Regenerar Cliente Prisma

```bash
# Cuando TypeScript no reconoce campos nuevos del schema
rm -rf node_modules/.prisma && npx prisma generate

# Sincronizar schema con base de datos
npx prisma db push
```

---

# 15. CATÁLOGO COMPLETO DE MODELOS (212 TABLAS)

## 15.1 Modelos Core del Sistema

### Usuario (Tabla principal)

```prisma
model Usuario {
  id                    Int       @id @default(autoincrement())
  nombre                String
  email                 String    @unique
  password              String?
  imagen                String?
  rol                   Rol       @default(PARTICIPANTE)
  puntosCuanticos       Int       @default(0)
  isActive              Boolean   @default(false)
  tier                  UserTier  @default(FREE)
  organizationId        Int?
  mentorId              Int?
  coordinadorId         Int?
  gameChangerId         Int?
  referralCode          String?   @unique
  isGraduated           Boolean   @default(false)
  ambassadorBalance     Decimal   @default(0)
  telefono              String?
  timezone              String    @default("America/Mexico_City")
  createdAt             DateTime  @default(now())
  updatedAt             DateTime
  
  // Relaciones principales
  Organization          Organization?
  mentor                Usuario?  @relation("MentorParticipantes")
  participantes         Usuario[] @relation("MentorParticipantes")
  tickets               Ticket[]
  cartaFrutos           CartaFrutos[]
}
```

**Campos importantes:**
- `referralCode`: Código único para referir nuevos usuarios
- `isGraduated`: Si completó el Básico (elegible para comisiones ambassador)
- `ambassadorBalance`: Saldo acumulado por comisiones de referidos
- `rol`: Define permisos y dashboards disponibles
- `organizationId`: Escuela a la que pertenece

### Organization (Escuelas/Campus)

```prisma
model Organization {
  id                    Int       @id @default(autoincrement())
  name                  String
  slug                  String    @unique
  logoUrl               String?
  brandColor            String    @default("#6366F1")
  contactEmail          String
  status                OrganizationStatus @default(ACTIVE)
  schoolAdminId         Int       @unique
  totalLicenses         Int       @default(0)
  activeLicenses        Int       @default(0)
  isGeofenced           Boolean   @default(false)
  campusLatitude        Float?
  campusLongitude       Float?
  geofenceRadius        Int       @default(100)
  
  // Relaciones
  schoolAdmin           Usuario   @relation(fields: [schoolAdminId])
  visiones              Vision[]
  usuarios              Usuario[]
  tickets               Ticket[]
  paymentConfig         PaymentGatewayConfig[]
}
```

### Vision (Eventos/Entrenamientos)

```prisma
model Vision {
  id                    Int       @id @default(autoincrement())
  nombre                String
  descripcion           String?
  coordinadorId         Int
  organizationId        Int?
  isActive              Boolean   @default(true)
  
  // Fechas Básico
  startDate             DateTime?
  endDate               DateTime?
  
  // Fechas Avanzado
  advancedStartDate     DateTime?
  advancedEndDate       DateTime?
  
  // Fechas PL (3 fines de semana)
  plWeekend1StartDate   DateTime?
  plWeekend1EndDate     DateTime?
  plWeekend2StartDate   DateTime?
  plWeekend2EndDate     DateTime?
  plWeekend3StartDate   DateTime?
  plWeekend3EndDate     DateTime?
  
  // Configuración
  maxParticipantes      Int?
  licensesAllocated     Int       @default(0)
  
  // Relaciones
  coordinador           Usuario   @relation(fields: [coordinadorId])
  Organization          Organization?
  tickets               Ticket[]
  enrollments           vision_enrollments[]
}
```

### Ticket (Boletos/Inscripciones)

```prisma
model Ticket {
  id                    String    @id
  ownerId               Int
  organizationId        Int
  visionId              Int
  level                 VisionLevel
  type                  TicketType @default(STANDARD)
  status                TicketStatus @default(PENDING_PAYMENT)
  paymentStatus         TicketPaymentStatus @default(UNPAID)
  purchasePrice         Decimal?
  amountPaid            Decimal   @default(0)
  isTransferable        Boolean   @default(true)
  transferredAt         DateTime?
  transferredTo         Int?
  giftCodeId            Int?
  isAnticipo            Boolean   @default(false)
  createdAt             DateTime  @default(now())
  
  // Relaciones
  owner                 Usuario   @relation(fields: [ownerId])
  Organization          Organization
  Vision                Vision
  GiftCode              GiftCode?
}
```

---

## 15.2 Enums del Sistema

### Roles de Usuario

```prisma
enum Rol {
  LIDER
  PARTICIPANTE
  MENTOR
  COORDINADOR
  COORDINATOR_BASIC
  COORDINATOR_ADVANCED
  TRAINER
  ADMINISTRADOR
  GAMECHANGER
  SCHOOL_ADMIN
}
```

### Niveles de Programa

```prisma
enum VisionLevel {
  BASIC       // Fin de semana básico
  ADVANCED    // Avanzado (2 días)
  PL          // Proyecto de Liderazgo (3 fines de semana)
}
```

### Estados de Pago de Ticket

```prisma
enum TicketPaymentStatus {
  PAID        // Pagado completo
  PARTIAL     // Pago parcial (anticipo)
  GIFT        // Código de regalo
  PENDING     // Pendiente de pago
  UNPAID      // Sin pago
}
```

### Tipos de Gift Code

```prisma
enum GiftCodeType {
  GOLDEN          // 100% descuento (invitación completa)
  PLATINUM        // VIP con beneficios especiales
  GOLDEN_DISCOUNT // Descuento porcentual (ej: 50%, 95%)
}
```

### Tiers de Usuario

```prisma
enum UserTier {
  FREE
  PREMIUM
  VIP
}
```

### Estados de Organización

```prisma
enum OrganizationStatus {
  ACTIVE
  INACTIVE
  SUSPENDED
}
```

---

## 15.3 Modelos de Comisiones

### Comisiones de Coordinadores

```prisma
model coordinator_commissions {
  id                Int       @id @default(autoincrement())
  coordinatorId     Int
  relatedUserId     Int
  visionId          Int
  organizationId    Int
  enrollmentId      Int?
  triggerEvent      CommissionTriggerEvent
  amount            Decimal   @db.Decimal(10, 2)
  status            CoordinatorCommissionStatus @default(PENDING_REVIEW)
  notes             String?
  authorizedBy      Int?
  authorizedAt      DateTime?
  paidAt            DateTime?
  createdAt         DateTime  @default(now())
  
  // Eventos trigger
  // BASIC_SEATED: $300
  // ADVANCE_SEATED: $500
  // ADVANCE_COMBO_SEATED: $700
  // PL_START: $400
  // PL_WEEK3_CHECKPOINT: $400
  // REFUND_ADJUSTMENT: negativo
}

model coordinator_commission_config {
  id                    Int       @id @default(autoincrement())
  visionId              Int       @unique
  organizationId        Int
  basicSeatedAmount     Decimal   @default(300)
  advanceSeatedAmount   Decimal   @default(500)
  advanceComboAmount    Decimal   @default(700)
  plStartAmount         Decimal   @default(400)
  plWeek3Amount         Decimal   @default(400)
  plGuestBonus          Decimal   @default(400)
  isActive              Boolean   @default(true)
  createdBy             Int
  createdAt             DateTime  @default(now())
}
```

### Comisiones de Embajadores (Referidos)

```prisma
model ambassador_wallet_transactions {
  id                Int       @id @default(autoincrement())
  ambassadorId      Int       // Usuario graduado que refirió
  referredUserId    Int       // Usuario que pagó
  ticketId          String?
  productType       AmbassadorProductType
  saleAmount        Decimal   // Monto de la venta
  commissionPercent Decimal   // 0.20, 0.10
  commissionAmount  Decimal   // Monto ganado
  status            AmbassadorTxStatus @default(CLEARED)
  organizationId    Int
  visionId          Int?
  createdAt         DateTime  @default(now())
}

enum AmbassadorProductType {
  BASIC       // 20%
  COMBO       // 20%
  ADVANCED    // 10%
  PL          // 10%
}
```

---

## 15.4 Modelos de Gift Codes

```prisma
model GiftCode {
  id                  Int           @id @default(autoincrement())
  code                String        @unique
  type                GiftCodeType
  organizationId      Int
  visionId            Int?
  status              GiftCodeStatus @default(ACTIVE)
  value               Decimal?      // Valor fijo (para PLATINUM)
  discountPercentage  Int?          // Para GOLDEN_DISCOUNT
  createdBy           Int
  usedBy              Int?
  usedAt              DateTime?
  expiresAt           DateTime?
  notes               String?
  createdAt           DateTime      @default(now())
  
  // Relaciones
  Organization        Organization
  Vision              Vision?
  creator             Usuario
  usedByUser          Usuario?
  tickets             Ticket[]
}

enum GiftCodeStatus {
  ACTIVE
  USED
  EXPIRED
  CANCELLED
}
```

---

## 15.5 Modelos de Pagos

### Payment Gateway Config

```prisma
model PaymentGatewayConfig {
  id              Int           @id @default(autoincrement())
  organizationId  Int
  provider        PaymentGateway
  publicKey       String?
  secretKey       String
  webhookSecret   String?
  isActive        Boolean       @default(true)
  createdAt       DateTime      @default(now())
  
  Organization    Organization
  
  @@unique([organizationId, provider])  // IMPORTANTE: índice compuesto
}

enum PaymentGateway {
  STRIPE
  MERCADOPAGO
  PAYPAL
}
```

**⚠️ Importante:** Usar `findFirst` en lugar de `findUnique` por el índice compuesto.

### Payment (Transacciones)

```prisma
model Payment {
  id              Int           @id @default(autoincrement())
  userId          Int
  organizationId  Int?
  amount          Float
  currency        String        @default("MXN")
  status          PaymentStatus @default(PENDING)
  paymentMethod   String?
  transactionId   String?
  description     String?
  metadata        Json?
  createdAt       DateTime      @default(now())
}

enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
  REFUNDED
  CANCELLED
}
```

---

## 15.6 Modelos de Carta F.R.U.T.O.S.

```prisma
model CartaFrutos {
  id              Int           @id @default(autoincrement())
  usuarioId       Int
  visionId        Int?
  estado          EstadoCarta   @default(BORRADOR)
  fechaCreacion   DateTime      @default(now())
  fechaEnvio      DateTime?
  fechaAprobacion DateTime?
  rejectionReason String?
  
  // Relaciones
  usuario         Usuario
  metas           Meta[]
  acciones        Accion[]
  evidencias      Evidencia[]
}

model Meta {
  id              Int           @id @default(autoincrement())
  cartaId         Int
  areaVida        String        // SALUD, FINANZAS, RELACIONES, etc.
  descripcion     String
  fechaLimite     DateTime?
  completada      Boolean       @default(false)
  
  carta           CartaFrutos
  acciones        Accion[]
}

model Accion {
  id              Int           @id @default(autoincrement())
  metaId          Int
  descripcion     String
  fechaLimite     DateTime?
  completada      Boolean       @default(false)
  
  meta            Meta
  evidencias      Evidencia[]
}
```

---

## 15.7 Modelos de Mentorías

```prisma
model PerfilMentor {
  id                Int           @id @default(autoincrement())
  usuarioId         Int           @unique
  especialidades    String[]
  disponibilidad    Json?
  maxParticipantes  Int           @default(5)
  estilo            MentorStyle   @default(BALANCED)
  isActive          Boolean       @default(true)
  
  usuario           Usuario
  mentoriasActivas  SolicitudMentoria[]
}

model SolicitudMentoria {
  id              Int           @id @default(autoincrement())
  participanteId  Int
  mentorId        Int?
  estado          EstadoSolicitudMentoria @default(PENDIENTE)
  tipoServicio    TipoServicioMentoria
  notas           String?
  createdAt       DateTime      @default(now())
  
  participante    Usuario
  mentor          PerfilMentor?
}
```

---

# 16. FLUJOS DE PROCESOS PRINCIPALES

## 16.1 Flujo de Registro y Pago

```
1. Usuario llega a /auth/signup?ref=CODIGO
2. Completa formulario con datos personales
3. Selecciona visión y tipo de boleto (BASIC, COMBO)
4. Sistema crea Usuario y Ticket (paymentStatus: UNPAID)
5. Redirige a pasarela de pago (Stripe/MercadoPago)
6. Webhook confirma pago:
   - Actualiza Ticket.paymentStatus = PAID
   - Si hay referralCode:
     a. Busca ambassador (dueño del código)
     b. Verifica si es graduado y no está en PL
     c. Crea ambassador_wallet_transaction (20% o 10%)
     d. Actualiza ambassadorBalance del usuario
7. Envía email de confirmación
```

## 16.2 Flujo de Check-in y Comisiones Coordinador

```
1. Staff escanea QR del participante
2. Sistema verifica:
   - Ticket válido y pagado
   - No ha hecho check-in antes
3. Marca asistencia (checkInAt = now())
4. Trigger de comisión:
   - BASIC_SEATED: $300 para Coordinador Básico
   - ADVANCE_SEATED: $500 para Coordinador Avanzado
   - ADVANCE_COMBO_SEATED: $700 si compró Combo
5. Crea coordinator_commission (status: PENDING_REVIEW)
6. School Admin autoriza → AUTHORIZED
7. Tesorería paga → PAID
```

## 16.3 Flujo de Gift Codes

```
1. School Admin crea código:
   - GOLDEN: 100% gratis
   - GOLDEN_DISCOUNT: X% descuento
   - PLATINUM: VIP
2. Usuario recibe código por email/WhatsApp
3. Usuario va a /dashboard/canjear
4. Ingresa código
5. Sistema verifica:
   - Código existe y está ACTIVE
   - No ha expirado
   - Pertenece a su organización
6. Si GOLDEN: Crea ticket PAID automáticamente
7. Si GOLDEN_DISCOUNT: Aplica descuento y va a pago
8. Marca código como USED
```

## 16.4 Flujo de Transferencia de Ticket

```
1. Usuario con ticket va a /dashboard/my-tickets
2. Click en "Transferir"
3. Ingresa email del destinatario
4. Sistema verifica:
   - Ticket es transferible (isTransferable: true)
   - No ha sido transferido antes
   - Está dentro del tiempo límite
5. Crea/encuentra usuario destinatario
6. Actualiza ticket:
   - transferredTo = nuevo usuario
   - transferredAt = now()
   - isTransferable = false
7. Notifica a ambos usuarios
```

---

# 17. APIS PRINCIPALES

## 17.1 APIs de Checkout

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/checkout/create-payment` | POST | Crear intento de pago |
| `/api/checkout/payment-success` | POST | Confirmar pago exitoso |
| `/api/checkout-advanced/create-payment` | POST | Pago para Avanzado/PL |
| `/api/webhooks/stripe` | POST | Webhook de Stripe |
| `/api/webhooks/mercadopago` | POST | Webhook de MercadoPago |

## 17.2 APIs de Usuario

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/user/profile` | GET/PUT | Perfil del usuario |
| `/api/me` | GET | Datos del usuario actual |
| `/api/usuarios` | GET | Lista de usuarios |
| `/api/usuarios/[id]` | GET/PUT | Usuario específico |

## 17.3 APIs de School Admin

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/school-admin/visiones` | GET/POST | Gestión de visiones |
| `/api/school-admin/gift-codes` | GET/POST | Gestión de códigos |
| `/api/school-admin/usuarios` | GET | Usuarios de la escuela |
| `/api/school-admin/comisiones` | GET | Dashboard comisiones |
| `/api/school-admin/payment-gateway` | GET/POST | Config pagos |

## 17.4 APIs de Comisiones

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/coordinator/wallet` | GET | Wallet del coordinador |
| `/api/ambassador/wallet` | GET | Wallet del embajador |
| `/api/school-admin/comisiones/authorize` | POST | Autorizar comisión |
| `/api/school-admin/comisiones/pending` | GET | Comisiones pendientes |

---

# 18. LIBRERÍAS CORE

## 18.1 /lib/prisma.ts
Cliente singleton de Prisma para evitar múltiples conexiones en desarrollo.

## 18.2 /lib/auth.ts
Configuración de NextAuth con credenciales y magic links.

## 18.3 /lib/commission-engine.ts
Motor de cálculo de comisiones para coordinadores. Funciones principales:
- `triggerBasicSeatedCommission()`
- `triggerAdvanceSeatedCommission()`
- `triggerPLStartCommission()`
- `calculateRefundAdjustment()`

## 18.4 /lib/ambassador-engine.ts
Motor de comisiones por referidos. Funciones principales:
- `processAmbassadorCommission()`
- `getAmbassadorWalletSummary()`
- `findEligibleAmbassador()`
- `isUserInActivePL()`

## 18.5 /lib/payment-gateway.ts
Obtiene credenciales de pasarela de pago por organización.
- `getPaymentGateway(organizationId, provider?)`

## 18.6 /lib/taskGenerator.ts
Genera tareas diarias para participantes basadas en su carta.

## 18.7 /lib/referralCode.ts
Genera códigos de referido únicos de 8 caracteres.

---

# 19. DASHBOARDS POR ROL

## 19.1 PARTICIPANTE
- `/dashboard` - Panel principal
- `/dashboard/carta` - Mi carta F.R.U.T.O.S.
- `/dashboard/tareas` - Tareas diarias
- `/dashboard/my-tickets` - Mis boletos
- `/dashboard/perfil-completo` - Completar perfil

## 19.2 MENTOR
- `/dashboard/mentor` - Panel de mentor
- `/dashboard/mentor/participantes` - Lista de asignados
- `/dashboard/mentor/llamadas` - Registro de llamadas

## 19.3 GAMECHANGER
- `/dashboard/gamechanger` - Panel GC
- `/dashboard/gamechanger/mis-participantes`
- Widget de comisiones por referidos

## 19.4 COORDINADOR
- `/dashboard/coordinador` - Panel coordinador
- `/dashboard/coordinador/vision` - Gestión de visión
- `/dashboard/coordinador/participantes`
- Widget de Wallet de Comisiones

## 19.5 SCHOOL_ADMIN
- `/dashboard/school-admin` - Panel administrativo
- `/dashboard/school-admin/visiones` - Gestión de visiones
- `/dashboard/school-admin/gift-codes` - Códigos de regalo
- `/dashboard/school-admin/usuarios` - Usuarios
- `/dashboard/school-admin/comisiones` - Gestión de comisiones
- `/dashboard/school-admin/pagos` - Configuración de pagos

## 19.6 TRAINER
- `/dashboard/trainer` - Panel de trainer
- `/dashboard/trainer/misiones` - Misiones de entrenamiento

---

# 20. ESTADÍSTICAS DEL SISTEMA

```
Total de Modelos: 212
Total de Enums: 143
Total de APIs: ~150 carpetas
Total de Dashboards: ~80 páginas
Líneas de Schema: ~6,700
Usuarios Totales: 1,072
Organizaciones: Múltiples
```

---

# 21. HISTORIAL DE CAMBIOS

## v3.5 - 06/03/2026 (Fixes Sistema GC y Átomos - SmallGroup)

### 🎯 Resumen de Sesión

Esta sesión se enfocó en corregir el **Sistema de Átomos (SmallGroup)** para Game Changers, incluyendo:
- Detección correcta del nivel de entrenamiento (BASIC vs ADVANCED)
- Relaciones Prisma en APIs de stats y squads
- Campos `id` requeridos en creación de SmallGroup y SmallGroupMember
- Validación de seguridad para niveles finalizados
- **Fix para GCs que solo tienen asignación ADVANCED (sin squad BASIC previo)**

---

### 🔧 Fix: Detección de nivel ADVANCED para GCs sin squad BASIC previo

**Archivo modificado:** `app/api/gc-calls/my-stats/route.ts`

**Problema:** Game Changers asignados **solo** al nivel ADVANCED (sin haber tenido squad BASIC) veían `level: BASIC` en lugar de `ADVANCED`.

**Caso de uso:**
- GC asignado a Vision 25 con `VisionGameChanger.level = 'ADVANCED'`
- No tiene ningún SmallGroup (ni BASIC ni ADVANCED)
- El sistema mostraba BASIC por defecto en lugar de usar su asignación real

**Causa raíz:** La lógica de fallback en `my-stats` no marcaba `needsAdvancedSquad = true` cuando el GC tenía asignación ADVANCED pero ningún squad.

**Solución:**
```typescript
// En el bloque de fallback cuando no hay squads pero sí gcAssignments
if (!activeTrainingInfo && gcAssignments.length > 0) {
  const levelPriority = ['PL', 'ADVANCED', 'BASIC'];
  const sortedAssignments = [...gcAssignments].sort((a, b) => {
    return levelPriority.indexOf(a.level) - levelPriority.indexOf(b.level);
  });
  
  const highestLevelAssignment = sortedAssignments[0];
  const level = highestLevelAssignment.level;
  
  // ✅ AGREGADO: Si es ADVANCED y no tiene squad, indicar que necesita crearlo
  if (level === 'ADVANCED') {
    needsAdvancedSquad = true;
    targetVisionId = highestLevelAssignment.visionId;
  }
  
  // ... calcular trainingInfo con el nivel correcto
  activeTrainingInfo = {
    level: level,  // ← Ahora usa 'ADVANCED' correctamente
    // ... otros campos
  };
}
```

**Resultado:**
- GCs con asignación ADVANCED ahora ven `trainingInfo.level = 'ADVANCED'`
- Se muestra el botón "Crear Átomo" para nivel ADVANCED
- `targetVisionId` apunta a la visión correcta para crear el squad

---

### 🔧 Fix: API `/api/gc-calls/my-stats` - Relaciones SmallGroup

**Archivo modificado:** `app/api/gc-calls/my-stats/route.ts`

**Problema 1:** Error "Unknown field `members`" y "Unknown field `vision`"

**Causa raíz:** Nombres de relaciones incorrectos en el query:
- `members` → `SmallGroupMember`
- `vision` → `Vision`
- `leader` → `Usuario`

**Solución:**
```typescript
// ANTES (incorrecto)
const smallGroup = await prisma.smallGroup.findFirst({
  where: { leaderId: gc.id, visionId },
  include: {
    members: { select: { userId: true } },
    vision: { select: { nombre: true } }
  }
});

// DESPUÉS (correcto)
const smallGroup = await prisma.smallGroup.findFirst({
  where: { leaderId: gc.id, visionId },
  include: {
    SmallGroupMember: { select: { userId: true } },
    Vision: { select: { nombre: true } },
    Usuario: { select: { id: true, nombre: true } }
  }
});
```

**Problema 2:** Error "Unknown field `participant`" en GCCallSlot

**Causa raíz:** Relación multi-foreign key usa nombre completo

**Solución:**
```typescript
// ANTES (incorrecto)
include: { participant: { select: { nombre: true } } }

// DESPUÉS (correcto)
include: { Usuario_GCCallSlot_participantIdToUsuario: { select: { nombre: true } } }
```

---

### 🔧 Fix: API `/api/squads/route.ts` - Relaciones y campos requeridos

**Archivo modificado:** `app/api/squads/route.ts`

**Problema 1:** Error "Unknown field `leader`", `vision`, `product`, `members`"

**Solución:**
```typescript
// ANTES (incorrecto)
include: {
  leader: { select: { id: true, nombre: true, imagen: true } },
  vision: { select: { id: true, nombre: true } },
  product: { select: { id: true, name: true } },
  members: { include: { Usuario_SmallGroupMember_userIdToUsuario: true } }
}

// DESPUÉS (correcto)
include: {
  Usuario: { select: { id: true, nombre: true, imagen: true } },
  Vision: { select: { id: true, nombre: true } },
  SchoolProduct: { select: { id: true, name: true } },
  SmallGroupMember: { 
    include: { Usuario_SmallGroupMember_userIdToUsuario: true } 
  }
}
```

**Problema 2:** Error "Argument `id` is missing" en SmallGroup.create()

**Causa raíz:** Modelo `SmallGroup` tiene `id String @id` SIN `@default(uuid())`

**Solución:**
```typescript
// ANTES (incorrecto)
const newSquad = await prisma.smallGroup.create({
  data: {
    visionId,
    leaderId: gc.id,
    name: name.trim(),
    level,
    maxMembers: maxMembers || 12,
  }
});

// DESPUÉS (correcto)
const newSquad = await prisma.smallGroup.create({
  data: {
    id: crypto.randomUUID(),   // ← REQUERIDO
    visionId,
    leaderId: gc.id,
    name: name.trim(),
    level,
    maxMembers: maxMembers || 12,
    updatedAt: new Date(),      // ← REQUERIDO
  }
});
```

---

### 🔧 Fix: API `/api/squads/[id]/add-member/route.ts` - Múltiples fixes

**Archivo modificado:** `app/api/squads/[id]/add-member/route.ts`

**Problema 1:** Mismas relaciones incorrectas que en squads

**Problema 2:** Error "Argument `id` is missing" en SmallGroupMember.create()

**Causa raíz:** Modelo `SmallGroupMember` tiene `id String @id` SIN `@default(uuid())`

**Solución:**
```typescript
// ANTES (incorrecto)
const newMember = await tx.smallGroupMember.create({
  data: {
    groupId: squadId,
    userId: targetUser!.id,
    enrollmentId: enrollment?.id || null,
  }
});

// DESPUÉS (correcto)
const newMember = await tx.smallGroupMember.create({
  data: {
    id: crypto.randomUUID(),  // ← REQUERIDO
    groupId: squadId,
    userId: targetUser!.id,
    enrollmentId: enrollment?.id || null,
  }
});
```

---

### 🛡️ Nueva Validación de Seguridad: Niveles Finalizados

**Archivo modificado:** `app/api/squads/[id]/add-member/route.ts`

**Problema:** Átomos de BASIC podían ser modificados incluso después de que el entrenamiento ADVANCED ya inició (advancedStartDate pasada).

**Solución implementada:** Validar que no se puedan agregar miembros a átomos de niveles anteriores:

```typescript
// Obtener la visión con fechas de nivel
const vision = await tx.vision.findUnique({
  where: { id: squad.visionId },
  select: { advancedStartDate: true }
});

const today = new Date();
today.setHours(0, 0, 0, 0);

// Bloquear modificaciones a BASIC si ADVANCED ya inició
if (squad.level === 'BASIC' && vision?.advancedStartDate) {
  const advancedStart = new Date(vision.advancedStartDate);
  advancedStart.setHours(0, 0, 0, 0);
  
  if (today >= advancedStart) {
    return NextResponse.json({
      success: false,
      error: 'El nivel BÁSICO ya finalizó. No se pueden agregar miembros a este átomo.'
    }, { status: 400 });
  }
}
```

---

### 📋 Tabla Resumen de Relaciones Corregidas - Sesión 06/03/2026

| Modelo | Relación Incorrecta | Relación Correcta |
|--------|--------------------|--------------------|
| `SmallGroup` | `members` | `SmallGroupMember` |
| `SmallGroup` | `vision` | `Vision` |
| `SmallGroup` | `leader` | `Usuario` |
| `SmallGroup` | `product` | `SchoolProduct` |
| `GCCallSlot` | `participant` | `Usuario_GCCallSlot_participantIdToUsuario` |

### 📋 Modelos que Requieren `id` Manual - Actualizado

| Modelo | Tipo de ID | Requiere en create() |
|--------|------------|---------------------|
| `SmallGroup` | `String @id` | ✅ `id: crypto.randomUUID()` |
| `SmallGroupMember` | `String @id` | ✅ `id: crypto.randomUUID()` |
| `CashBatch` | `String @id` | ✅ `id: randomUUID()` |
| `ExpoVisitor` | `String @id` | ✅ `id: generateUUID()` |
| `Ticket` | `String @id` | ✅ `id: crypto.randomUUID()` |
| `ExpoReview` | `String @id` | ✅ `id: crypto.randomUUID()` |

---

### 🔍 Referencia Rápida: Modelos SmallGroup

```prisma
model SmallGroup {
  id               String             @id        // ← SIN @default - REQUIERE MANUAL
  visionId         Int
  leaderId         Int
  name             String
  level            TrainingLevel
  maxMembers       Int                @default(12)
  createdAt        DateTime           @default(now())
  updatedAt        DateTime           // ← SIN @default - REQUIERE MANUAL
  
  // Relaciones (usar estos nombres exactos en include)
  Usuario          Usuario            @relation(fields: [leaderId])
  Vision           Vision             @relation(fields: [visionId])
  SchoolProduct    SchoolProduct?     @relation(fields: [productId])
  SmallGroupMember SmallGroupMember[]
}

model SmallGroupMember {
  id           String      @id        // ← SIN @default - REQUIERE MANUAL
  groupId      String
  userId       Int
  enrollmentId Int?
  joinedAt     DateTime    @default(now())
  
  // Relaciones
  SmallGroup                                SmallGroup @relation(fields: [groupId])
  Usuario_SmallGroupMember_userIdToUsuario  Usuario    @relation("SmallGroupMember_userIdToUsuario")
}
```

---

## v3.4 - 05/03/2026 (Sesión de Fixes Masivos de Prisma)

### 🎯 Resumen de Sesión

Esta sesión se enfocó en corregir **múltiples errores de relaciones Prisma** en todo el sistema, especialmente en los módulos de:
- Biblioteca del Entrenador (TrainerTaskTemplate)
- Lanzador de Tareas (TrainerMission)
- Sistema Buddy (BuddyPair)
- Submissions de Misiones (MissionSubmission)

---

### 🔧 Fix: Biblioteca del Entrenador - Relaciones de Templates

**Archivos modificados:**
- `app/api/trainer/biblioteca/route.ts`
- `app/api/trainer/biblioteca/[id]/route.ts`
- `app/dashboard/trainer/biblioteca/page.tsx`

**Problema 1:** Error "Unknown field `Questions`" al crear/obtener plantillas

**Causa:** Los nombres de relaciones en el schema son:
- `Questions` → `TrainerTaskQuestion`
- `Missions` → `TrainerMission`

**Solución:**
```typescript
// ANTES (incorrecto)
include: {
  Questions: { orderBy: { orderIndex: 'asc' } },
  _count: { select: { Missions: true } }
}

// DESPUÉS (correcto)
include: {
  TrainerTaskQuestion: { orderBy: { orderIndex: 'asc' } },
  _count: { select: { TrainerMission: true } }
}

// Mapear para compatibilidad con frontend:
return {
  ...template,
  Questions: template.TrainerTaskQuestion,
  usageCount: template._count.TrainerMission
};
```

**Problema 2:** Error "Argument `updatedAt` is missing" en TrainerTaskTemplate y TrainerTaskQuestion

**Solución:**
```typescript
// En trainerTaskTemplate.create()
await prisma.trainerTaskTemplate.create({
  data: {
    // ...otros campos
    updatedAt: new Date(), // ← REQUERIDO
    TrainerTaskQuestion: questions?.length > 0 ? {
      create: questions.map(q => ({
        // ...campos de pregunta
        updatedAt: new Date() // ← TAMBIÉN REQUERIDO EN ANIDADOS
      }))
    } : undefined
  }
});

// En trainerTaskQuestion.createMany()
await prisma.trainerTaskQuestion.createMany({
  data: questions.map(q => ({
    // ...campos
    updatedAt: new Date() // ← REQUERIDO
  }))
});
```

**Problema 3:** Error `uploadingPdf is not defined` en página de biblioteca

**Causa:** Se eliminó la funcionalidad de subir PDF pero quedó la referencia en el botón.

**Solución:**
```typescript
// ANTES
disabled={saving || uploadingPdf || uploadingImage}

// DESPUÉS
disabled={saving || uploadingImage}
```

---

### 🔧 Fix: Lanzador de Tareas - Relaciones TrainerMission

**Archivo modificado:** `app/api/trainer/lanzador/route.ts`

**Problema:** Error "Unknown field `Template`" al obtener/crear misiones

**Relaciones correctas del modelo TrainerMission:**
```prisma
model TrainerMission {
  TrainerTaskTemplate TrainerTaskTemplate @relation(fields: [templateId])
  SchoolProduct       SchoolProduct?      @relation(fields: [productId])
  Vision              Vision?             @relation(fields: [visionId])
  MissionSubmission   MissionSubmission[]
}
```

**Solución:**
```typescript
// ANTES (incorrecto)
include: {
  Template: { select: { title: true, type: true } },
  Product: { select: { name: true } },
  _count: { select: { Submissions: true } }
}

// DESPUÉS (correcto)
include: {
  TrainerTaskTemplate: { select: { title: true, type: true } },
  SchoolProduct: { select: { name: true } },
  _count: { select: { MissionSubmission: true } }
}

// Mapear:
return {
  title: mission.TrainerTaskTemplate?.title,
  product: mission.SchoolProduct?.name,
  submissionCount: mission._count.MissionSubmission
};
```

**También agregado:** `updatedAt: new Date()` en `trainerMission.create()`

---

### 🔧 Fix: Sistema Buddy - Relaciones BuddyPair

**Archivo modificado:** `app/api/buddy/route.ts`

**Problema:** Error "Unknown field `initiator`" al buscar buddy pairs

**Relaciones correctas del modelo BuddyPair:**
```prisma
model BuddyPair {
  Usuario_BuddyPair_initiatorIdToUsuario Usuario @relation("BuddyPair_initiatorIdToUsuario")
  Usuario_BuddyPair_receiverIdToUsuario  Usuario @relation("BuddyPair_receiverIdToUsuario")
  Usuario_BuddyPair_brokenByToUsuario    Usuario? @relation("BuddyPair_brokenByToUsuario")
  Vision                                 Vision   @relation(fields: [visionId])
}
```

**Solución:**
```typescript
// ANTES (incorrecto)
include: {
  initiator: { select: { id: true, nombre: true, apodo: true } },
  receiver: { select: { id: true, nombre: true, apodo: true } }
}

// DESPUÉS (correcto)
include: {
  Usuario_BuddyPair_initiatorIdToUsuario: {
    select: { id: true, nombre: true, apodo: true, profileImage: true, telefono: true }
  },
  Usuario_BuddyPair_receiverIdToUsuario: {
    select: { id: true, nombre: true, apodo: true, profileImage: true, telefono: true }
  }
}

// Mapear para compatibilidad:
const mappedPairs = buddyPairs.map(p => ({
  ...p,
  initiator: p.Usuario_BuddyPair_initiatorIdToUsuario,
  receiver: p.Usuario_BuddyPair_receiverIdToUsuario
}));
```

---

### 🔧 Fix: Submissions de Misiones - Relaciones MissionSubmission

**Archivo modificado:** `app/api/trainer/lanzador/[missionId]/submissions/route.ts`

**Problema:** Error 500 al ver respuestas de participantes

**Relaciones correctas del modelo MissionSubmission:**
```prisma
model MissionSubmission {
  Usuario_MissionSubmission_userIdToUsuario     Usuario  @relation("MissionSubmission_userIdToUsuario")
  Usuario_MissionSubmission_reviewedByToUsuario Usuario? @relation("MissionSubmission_reviewedByToUsuario")
  MissionQuestionAnswer                         MissionQuestionAnswer[]
  TrainerMission                                TrainerMission @relation(fields: [missionId])
}

model MissionQuestionAnswer {
  TrainerTaskQuestion TrainerTaskQuestion @relation(fields: [questionId])
  MissionSubmission   MissionSubmission   @relation(fields: [submissionId])
}
```

**Solución:**
```typescript
// ANTES (incorrecto)
include: {
  Template: { include: { Questions: true } }
}
// Y en submissions:
include: {
  User: { select: { id: true, nombre: true } },
  QuestionAnswers: {
    include: { Question: { select: { questionText: true } } }
  }
}

// DESPUÉS (correcto)
include: {
  TrainerTaskTemplate: { include: { TrainerTaskQuestion: true } }
}
// Y en submissions:
include: {
  Usuario_MissionSubmission_userIdToUsuario: {
    select: { id: true, nombre: true, email: true, imagen: true }
  },
  MissionQuestionAnswer: {
    include: {
      TrainerTaskQuestion: {
        select: { id: true, questionText: true, questionType: true, options: true }
      }
    }
  }
}

// Mapear:
const formattedSubmissions = submissions.map(sub => {
  const user = sub.Usuario_MissionSubmission_userIdToUsuario;
  return {
    user: { id: user.id, nombre: user.nombre },
    answers: sub.MissionQuestionAnswer.map(ans => ({
      questionText: ans.TrainerTaskQuestion.questionText,
      textAnswer: ans.textAnswer
    }))
  };
});
```

---

### 🔧 Fix: Badges PDF - Relaciones SchoolProduct

**Archivo modificado:** `app/api/school-admin/visiones/[id]/badges-pdf/route.ts`

**Problema:** Error al generar badges - relaciones de Trainer y Coordinator incorrectas

**Solución:**
```typescript
// ANTES
include: { Trainer: true, Coordinator: true }

// DESPUÉS
include: {
  Usuario_SchoolProduct_trainerIdToUsuario: true,
  Usuario_SchoolProduct_coordinatorIdToUsuario: true
}
```

---

### 🔧 Fix: Check-In Complete - Campo updatedAt en ProductAttendance

**Archivo modificado:** `app/api/staff/check-in/complete/route.ts`

**Solución:**
```typescript
await prisma.productAttendance.create({
  data: {
    // ...campos
    updatedAt: new Date() // ← AÑADIDO
  }
});
```

---

### 🔧 Fix: Bitácoras Trainer - Relación BusinessCategory

**Archivo modificado:** `app/api/trainer/bitacoras/[id]/route.ts`

**Problema:** Error "Unknown field `category`"

**Solución:**
```typescript
// ANTES
include: { BusinessProfile: { include: { category: true } } }

// DESPUÉS
include: { BusinessProfile: { include: { BusinessCategory: true } } }
```

---

### 📋 Tabla Resumen de Relaciones Corregidas - Sesión 05/03/2026

| Modelo | Relación Incorrecta | Relación Correcta |
|--------|--------------------|--------------------|
| `TrainerTaskTemplate` | `Questions` | `TrainerTaskQuestion` |
| `TrainerTaskTemplate` | `Missions` | `TrainerMission` |
| `TrainerMission` | `Template` | `TrainerTaskTemplate` |
| `TrainerMission` | `Product` | `SchoolProduct` |
| `TrainerMission` | `Submissions` | `MissionSubmission` |
| `MissionSubmission` | `User` | `Usuario_MissionSubmission_userIdToUsuario` |
| `MissionSubmission` | `QuestionAnswers` | `MissionQuestionAnswer` |
| `MissionQuestionAnswer` | `Question` | `TrainerTaskQuestion` |
| `BuddyPair` | `initiator` | `Usuario_BuddyPair_initiatorIdToUsuario` |
| `BuddyPair` | `receiver` | `Usuario_BuddyPair_receiverIdToUsuario` |
| `SchoolProduct` | `Trainer` | `Usuario_SchoolProduct_trainerIdToUsuario` |
| `SchoolProduct` | `Coordinator` | `Usuario_SchoolProduct_coordinatorIdToUsuario` |
| `BusinessProfile` | `category` | `BusinessCategory` |
| `SmallGroup` | `leader` | `Usuario` |
| `SmallGroupMember` | `group` | `SmallGroup` |

---

### 📋 Modelos que Requieren updatedAt Manual

Estos modelos tienen `updatedAt DateTime` **SIN** `@default()` ni `@updatedAt`:

| Modelo | Operaciones Afectadas |
|--------|----------------------|
| `TrainerTaskTemplate` | create, update |
| `TrainerTaskQuestion` | create, createMany |
| `TrainerMission` | create, update |
| `MissionSubmission` | create, createMany, update |
| `AdvancedQuestionnaire` | create, update, upsert |
| `ProductAttendance` | create, update |
| `Ticket` | create |
| `ExpoReview` | create |
| `SmallGroup` | create, update |

**Siempre agregar:** `updatedAt: new Date()`

### 📋 Modelos que Requieren `id` Manual (String @id sin default)

| Modelo | Operaciones Afectadas |
|--------|----------------------|
| `SmallGroup` | create |
| `SmallGroupMember` | create |
| `CashBatch` | create |
| `ExpoVisitor` | create |
| `Ticket` | create |
| `ExpoReview` | create |

**Siempre agregar:** `id: crypto.randomUUID()`

---

### 🛠️ Utilidades de Datos Ejecutadas

**Copiar plantillas de Mika a otras entrenadoras:**
```javascript
// Plantillas copiadas de Mika (trainerId: 158) a:
// - Ivonne Flores (id: 46) - 7 plantillas
// - Samantha Olivares (id: 56) - 7 plantillas

const mikaTemplates = await prisma.trainerTaskTemplate.findMany({
  where: { trainerId: 158 },
  include: { TrainerTaskQuestion: true }
});

for (const template of mikaTemplates) {
  const newTemplate = await prisma.trainerTaskTemplate.create({
    data: {
      trainerId: targetTrainerId,
      title: template.title,
      // ...copiar todos los campos
      updatedAt: new Date()
    }
  });
  
  if (template.TrainerTaskQuestion.length > 0) {
    await prisma.trainerTaskQuestion.createMany({
      data: template.TrainerTaskQuestion.map(q => ({
        templateId: newTemplate.id,
        questionText: q.questionText,
        // ...copiar campos
        updatedAt: new Date()
      }))
    });
  }
}
```

**Crear submissions faltantes para misión:**
```javascript
// Misión 11 tenía solo 3 submissions pero 12 usuarios con ATTENDED
const enrollments = await prisma.vision_enrollments.findMany({
  where: { visionId, level: trainerLevel, attendanceStatus: 'ATTENDED' }
});

const existingSubmissions = await prisma.missionSubmission.findMany({
  where: { missionId }
});

const missingUserIds = enrollments
  .map(e => e.userId)
  .filter(id => !existingSubmissions.some(s => s.userId === id));

await prisma.missionSubmission.createMany({
  data: missingUserIds.map(userId => ({
    missionId,
    userId,
    status: 'PENDING',
    updatedAt: new Date()
  }))
});
```

---

### 🔍 Referencia Rápida: Modelos del Trainer System

```prisma
model TrainerTaskTemplate {
  id                  Int                   @id @default(autoincrement())
  trainerId           Int
  title               String
  type                TrainerTaskType
  // Relaciones
  TrainerMission      TrainerMission[]
  TrainerTaskQuestion TrainerTaskQuestion[]
  Usuario             Usuario               @relation(fields: [trainerId])
}

model TrainerMission {
  id                  Int                 @id @default(autoincrement())
  templateId          Int
  trainerId           Int
  visionId            Int?
  productId           Int?
  status              MissionStatus       @default(SCHEDULED)
  // Relaciones
  MissionSubmission   MissionSubmission[]
  SchoolProduct       SchoolProduct?      @relation(fields: [productId])
  TrainerTaskTemplate TrainerTaskTemplate @relation(fields: [templateId])
  Usuario             Usuario             @relation(fields: [trainerId])
  Vision              Vision?             @relation(fields: [visionId])
}

model MissionSubmission {
  id                                            Int        @id @default(autoincrement())
  missionId                                     Int
  userId                                        Int
  status                                        SubmissionStatus @default(PENDING)
  updatedAt                                     DateTime   // ← SIN DEFAULT
  // Relaciones
  MissionQuestionAnswer                         MissionQuestionAnswer[]
  TrainerMission                                TrainerMission @relation(fields: [missionId])
  Usuario_MissionSubmission_userIdToUsuario     Usuario    @relation("MissionSubmission_userIdToUsuario")
}
```

---

## v3.3 - 05/03/2026 (Sesión Actual)

### 🔧 Fixes de Relaciones Prisma y Campos Requeridos

Esta sesión se enfocó en corregir múltiples errores de Prisma relacionados con nombres de relaciones incorrectos y campos faltantes en operaciones `create()` y `upsert()`.

---

### Fix: API `/api/gc-calls/my-gc` - Relaciones SmallGroup

**Problema:** Error "Unknown field `group` for include statement on model `SmallGroupMember`"

**Causa raíz:** Nombres de relaciones incorrectos en el query:
- `group` → `SmallGroup`
- `leader` → `Usuario`
- `vision` → `Vision`

**Solución:**
```typescript
// ANTES (incorrecto)
const membership = await prisma.smallGroupMember.findFirst({
  include: {
    group: {
      include: {
        leader: { select: { id: true, nombre: true, imagen: true, email: true } },
        vision: { select: { id: true, nombre: true, startDate: true } }
      }
    }
  }
});
const gc = membership.group.leader;
const vision = membership.group.vision;

// DESPUÉS (correcto)
const membership = await prisma.smallGroupMember.findFirst({
  include: {
    SmallGroup: {
      include: {
        Usuario: { select: { id: true, nombre: true, imagen: true, email: true } },
        Vision: { select: { id: true, nombre: true, startDate: true } }
      }
    }
  }
});
const gc = membership.SmallGroup.Usuario;
const vision = membership.SmallGroup.Vision;
```

**Archivo modificado:** `app/api/gc-calls/my-gc/route.ts`

---

### Fix: Múltiples APIs usando `group` en lugar de `SmallGroup` (Marzo 2026)

**Problema:** Error `Unknown argument 'group'. Did you mean 'groupId'?` en queries de SmallGroupMember

**Causa raíz:** Múltiples archivos API usaban el nombre de relación incorrecto `group` en lugar de `SmallGroup` en queries where/include de `SmallGroupMember`.

**Archivos corregidos:**

| Archivo | Cambio |
|---------|--------|
| `app/api/gc-calls/quick-log/route.ts` | `group` → `SmallGroup`, `membership.group.visionId` → `membership.SmallGroup.visionId` |
| `app/api/gc-calls/my-post-entreno/route.ts` | `group` → `SmallGroup`, `membership.group.leaderId` → `membership.SmallGroup.leaderId` |
| `app/api/squads/vision/[visionId]/orphans/route.ts` | `group` → `SmallGroup` en where clause |
| `app/api/squads/vision/[visionId]/stats/route.ts` | `group` → `SmallGroup` (2 lugares) |
| `app/api/game-changer/mark-drop/route.ts` | `group` → `SmallGroup`, `user` → `Usuario_SmallGroupMember_userIdToUsuario`, `enrollment` → `vision_enrollments` |
| `app/api/school-admin/visiones/[id]/assign-gc-to-participant/route.ts` | `group` → `SmallGroup`, `leader` → `Usuario` |

**Ejemplo de corrección:**
```typescript
// ANTES (incorrecto)
const membership = await prisma.smallGroupMember.findFirst({
  where: {
    userId: participantId,
    isActive: true,
    group: { leaderId: gcId }  // ❌ 'group' no existe
  },
  include: {
    group: { select: { id: true, level: true } }  // ❌
  }
});
const visionId = membership.group.visionId;  // ❌

// DESPUÉS (correcto)
const membership = await prisma.smallGroupMember.findFirst({
  where: {
    userId: participantId,
    isActive: true,
    SmallGroup: { leaderId: gcId }  // ✅ Relación correcta
  },
  include: {
    SmallGroup: { select: { id: true, level: true } }  // ✅
  }
});
const visionId = membership.SmallGroup.visionId;  // ✅
```

**Relaciones correctas en SmallGroupMember:**
| Relación Prisma | Campo FK | Descripción |
|-----------------|----------|-------------|
| `SmallGroup` | `groupId` | El grupo al que pertenece |
| `Usuario_SmallGroupMember_userIdToUsuario` | `userId` | El usuario miembro |
| `Usuario_SmallGroupMember_movedByToUsuario` | `movedBy` | Quién movió al miembro |
| `vision_enrollments` | `enrollmentId` | La inscripción asociada |

---

### Fix: API `/api/bitacora` - Campo updatedAt requerido en AdvancedQuestionnaire

**Problema:** Error "Argument `updatedAt` is missing" al guardar bitácora

**Causa raíz:** El modelo `AdvancedQuestionnaire` tiene `updatedAt DateTime` SIN `@default(now())` ni `@updatedAt`, por lo que Prisma requiere el valor manual.

**Schema del modelo:**
```prisma
model AdvancedQuestionnaire {
  id              Int       @id @default(autoincrement())
  userId          Int       @unique
  // ... otros campos
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  // ← SIN @default() - REQUIERE VALOR MANUAL
}
```

**Solución:**
```typescript
// En create()
await prisma.advancedQuestionnaire.create({
  data: {
    userId,
    visionId: visionId || null,
    ...updateData,
    updatedAt: new Date(), // ← AÑADIDO
  }
});

// En update()
await prisma.advancedQuestionnaire.update({
  where: { userId },
  data: {
    ...updateData,
    updatedAt: new Date(), // ← AÑADIDO
  }
});

// En upsert()
await prisma.advancedQuestionnaire.upsert({
  where: { userId },
  update: {
    ...cleanData,
    updatedAt: new Date(), // ← AÑADIDO
  },
  create: {
    userId,
    ...cleanData,
    updatedAt: new Date(), // ← AÑADIDO
  }
});
```

**Archivo modificado:** `app/api/bitacora/route.ts`

---

### 📋 Resumen de Relaciones Prisma Corregidas - Sesión 06/03/2026

Esta sesión se corrigieron múltiples errores de relaciones Prisma que causaban errores 500 en varios endpoints.

#### Correcciones en SmallGroupMember

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/api/gc-calls/quick-log/route.ts` | `group` | `SmallGroup` |
| `/api/gc-calls/my-post-entreno/route.ts` | `group` | `SmallGroup` |
| `/api/squads/vision/[visionId]/orphans/route.ts` | `group` | `SmallGroup` |
| `/api/squads/vision/[visionId]/stats/route.ts` | `group`, `leader`, `members` | `SmallGroup`, `Usuario`, `SmallGroupMember` |
| `/api/game-changer/mark-drop/route.ts` | `group`, `user`, `enrollment` | `SmallGroup`, `Usuario_SmallGroupMember_userIdToUsuario`, `vision_enrollments` |
| `/api/school-admin/visiones/[id]/assign-gc-to-participant/route.ts` | `group`, `leader`, `members` | `SmallGroup`, `Usuario`, `SmallGroupMember` |

#### Correcciones en SmallGroup

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/api/coordinator/gc-calls-monitor/route.ts` | `leader`, `members` | `Usuario`, `SmallGroupMember` |
| `/api/gc-calls/dashboard/route.ts` | `leader`, `members`, `user` | `Usuario`, `SmallGroupMember`, `Usuario_SmallGroupMember_userIdToUsuario` |
| `/api/squads/[id]/route.ts` | `leader`, `vision`, `product`, `members` | `Usuario`, `Vision`, `SchoolProduct`, `SmallGroupMember` |
| `/api/squads/assign-orphan/route.ts` | `members` | `SmallGroupMember` |

#### Correcciones en GCCallAttempt

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/api/coordinator/gc-calls-monitor/route.ts` | `participant` | `Usuario_GCCallAttempt_participantIdToUsuario` |

#### Correcciones en GCCallLog y GCCallSlot

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/api/gc-calls/log/route.ts` | `participant`, `gameChanger`, `squad`, `slot`, `availability` | `Usuario_GCCallLog_participantIdToUsuario`, `Usuario_GCCallLog_gameChangerIdToUsuario`, `SmallGroup`, `GCCallSlot`, `GCAvailability` |
| `/api/gc-calls/dashboard/route.ts` | `participant`, `gameChanger`, `squad`, `interventions`, `availability`, `callLog` | `Usuario_GCCallLog_participantIdToUsuario`, `Usuario_GCCallLog_gameChangerIdToUsuario`, `SmallGroup`, `TrainerIntervention`, `GCAvailability`, `GCCallLog` |

#### Correcciones en TrainerIntervention

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/api/gc-calls/intervention/route.ts` | `trainer`, `callLog` | `Usuario`, `GCCallLog` |

#### IDs Requeridos Agregados

| Archivo | Modelo | Campo |
|---------|--------|-------|
| `/api/gc-calls/quick-log/route.ts` | `GCCallAttempt` | `id: crypto.randomUUID()` |
| `/api/gc-calls/intervention/route.ts` | `TrainerIntervention` | `id: crypto.randomUUID()` |
| `/api/school-admin/visiones/[id]/assign-gc-to-participant/route.ts` | `SmallGroup` | `id: crypto.randomUUID()`, `updatedAt: new Date()` |

---

### 🔍 Referencia Completa: Relaciones de Modelos GC Calls

```prisma
model GCCallAttempt {
  // Relaciones correctas:
  Usuario_GCCallAttempt_gameChangerIdToUsuario  Usuario     // gameChanger
  Usuario_GCCallAttempt_participantIdToUsuario  Usuario     // participant
  SmallGroup                                     SmallGroup? // squad
  Vision                                         Vision
}

model GCCallLog {
  // Relaciones correctas:
  Usuario_GCCallLog_gameChangerIdToUsuario  Usuario               // gameChanger
  Usuario_GCCallLog_participantIdToUsuario  Usuario               // participant
  SmallGroup                                 SmallGroup?           // squad
  GCCallSlot                                 GCCallSlot            // slot
  Vision                                     Vision
  TrainerIntervention                        TrainerIntervention[] // interventions
}

model GCCallSlot {
  // Relaciones correctas:
  Usuario_GCCallSlot_participantIdToUsuario  Usuario        // participant
  Usuario_GCCallSlot_cancelledByToUsuario    Usuario?       // cancelledBy
  GCAvailability                              GCAvailability // availability
  SmallGroup                                  SmallGroup?    // squad
  GCCallLog                                   GCCallLog?     // callLog
}

model GCAvailability {
  // Relaciones correctas:
  Usuario     Usuario      // gameChanger
  SmallGroup  SmallGroup?  // squad
}

model TrainerIntervention {
  // Relaciones correctas:
  Usuario    Usuario   // trainer
  GCCallLog  GCCallLog // callLog
}
```

---

### 📋 Resumen de Relaciones Prisma Corregidas - Sesión 05/03/2026

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/api/gc-calls/my-gc/route.ts` | `group` | `SmallGroup` |
| `/api/gc-calls/my-gc/route.ts` | `leader` | `Usuario` |
| `/api/gc-calls/my-gc/route.ts` | `vision` | `Vision` |

### 📋 Campos updatedAt Agregados - Sesión 05/03/2026

| Archivo | Modelo | Operación |
|---------|--------|-----------|
| `/api/bitacora/route.ts` | `AdvancedQuestionnaire` | create, update, upsert |

---

### 🔍 Referencia Rápida: Modelo SmallGroup y SmallGroupMember

```prisma
model SmallGroup {
  id               String             @id
  visionId         Int
  leaderId         Int
  // Relaciones
  Usuario          Usuario            @relation(fields: [leaderId])  // ← Líder del grupo
  Vision           Vision             @relation(fields: [visionId])
  SmallGroupMember SmallGroupMember[]
}

model SmallGroupMember {
  id        String     @id
  groupId   String
  userId    Int
  // Relaciones
  SmallGroup SmallGroup @relation(fields: [groupId])  // ← NO 'group'
  Usuario_SmallGroupMember_userIdToUsuario Usuario @relation(...)
}
```

---

### 🔍 Referencia Rápida: Modelo AdvancedQuestionnaire

```prisma
model AdvancedQuestionnaire {
  id                Int                 @id @default(autoincrement())
  userId            Int                 @unique
  visionId          Int?
  status            QuestionnaireStatus @default(NOT_STARTED)
  currentDimension  Int                 @default(0)
  lastSavedAt       DateTime?
  completedAt       DateTime?
  // Campos del cuestionario...
  suicideRiskFlag   Boolean             @default(false)
  createdAt         DateTime            @default(now())
  updatedAt         DateTime            // ← SIN DEFAULT - SIEMPRE PROPORCIONAR
}
```

---

## v3.2 - 05/03/2026

### 🎯 Tesorería Express - Nuevo Flujo Estructurado de Cobros

**Problema:** El flujo de cobros de Tesorería Express era confuso y no diferenciaba correctamente entre niveles.

**Solución Implementada:** Flujo estructurado en pasos:

```
PASO 1: Seleccionar Visión
PASO 2: Buscar Participante (Padrino para Básico)
PASO 3: Seleccionar Nivel (BASIC, ADVANCED, PL)
PASO 3.5: [Solo BASIC] Formulario de Nuevo Usuario
PASO 4: Seleccionar Precio
PASO 5: Generar Código / Enviar a Terminal
```

**Lógica de Padrino para Básico:**
- El participante seleccionado es el **PADRINO** (quien invita/paga)
- Se registra un **NUEVO USUARIO** con los datos del formulario
- El nuevo usuario queda vinculado al padrino via `invitedBy`
- Se incrementa `invitedCount` del padrino

**Auto-selección de Visión Básico:**
- NO se usa la visión seleccionada en el dropdown
- La API busca automáticamente la **próxima visión Básico vigente**
- Criterios: `enabledLevels: { has: 'BASIC' }`, `startDate > today`, orden por `startDate asc`

**Archivos modificados:**
- `components/dashboard/TreasuryQuickWidget.tsx` - Nuevo flujo UI
- `app/api/treasury/register-basic/route.ts` - Lógica de registro con padrino

### 📦 Soporte FULL (Combo Completo $27,000)

**Funcionalidad:** Cuando se selecciona el precio de $27,000 (Combo Completo):

1. **Detección:** `priceType === 'COMBO'` o `type.includes('COMBO')`
2. **Creación de Tickets:** 3 tickets (BASIC, ADVANCED, PL)
3. **Enrollments:** 3 registros en `vision_enrollments`
4. **Código de Confirmación:** Prefijo `FULL-` en lugar de `BASIC-`

```typescript
// API: register-basic/route.ts
const isCombo = priceType === 'COMBO' || priceType === 'BASIC_COMBO';
const ticketLevels = isCombo 
  ? ['BASIC', 'ADVANCED', 'PL']  // 3 niveles
  : ['BASIC'];                    // Solo básico

// Crear ticket para cada nivel
for (const level of ticketLevels) {
  await tx.ticket.create({
    data: { userId: newUser.id, level, status: 'VALID', visionId: vision.id }
  });
  await tx.vision_enrollments.create({
    data: { usuarioId: newUser.id, visionId: vision.id, level, status: 'ACTIVE' }
  });
}

// Código con prefijo correcto
const codePrefix = isCombo ? 'FULL' : 'BASIC';
```

**Archivos modificados:**
- `app/api/treasury/register-basic/route.ts`
- `components/dashboard/TreasuryQuickWidget.tsx`

### 💳 Modal de Estado para Pagos con Tarjeta (POS)

**Problema:** Al pagar con tarjeta, no había feedback visual del estado y el usuario no se registraba.

**Solución:** Nuevo modal con estados progresivos:

| Stage | Icono | Mensaje |
|-------|-------|---------|
| `sending` | 📱 | "Enviando a Terminal..." |
| `waiting` | 💳 | "Esperando pago en terminal..." |
| `processing` | ⏳ | "Procesando..." |
| `approved` | ✅ | "¡Pago recibido!" |
| `registering` | 👥 | "Registrando participante..." |
| `completed` | 🎉 | "¡Completado!" + Código de confirmación |
| `error` | ⚠️ | Mensaje de error |
| `cancelled` | ❌ | "Pago cancelado" |

**Flujo para Básico con Tarjeta:**
1. Enviar cobro a terminal POS
2. Esperar aprobación del pago
3. **Si APROBADO:** Registrar usuario automáticamente
4. **Si RECHAZADO/CANCELADO:** NO registrar usuario, mostrar error
5. Mostrar código de confirmación para compartir

**Estado del Modal:**
```typescript
const [posPaymentStatus, setPosPaymentStatus] = useState<{
  stage: 'sending' | 'waiting' | 'processing' | 'approved' | 'registering' | 'completed' | 'error' | 'cancelled';
  message: string;
  paymentIntentId?: string;
  error?: string;
  confirmationCode?: string;  // Código para compartir
  amount?: number;
  participantName?: string;
  visionName?: string;
  isCombo?: boolean;
}>({ stage: 'sending', message: 'Enviando a terminal...' });
```

**Archivos modificados:**
- `components/dashboard/TreasuryQuickWidget.tsx`

### ✅ PaymentCode como REDEEMED Inmediato

**Cambio:** Para pagos de Tesorería Express (Básico/Full), el `PaymentCode` se crea con estado `REDEEMED` directamente:

```typescript
const paymentCode = await tx.paymentCode.create({
  data: {
    id: paymentCodeId,
    code: `${codePrefix}-${timestamp}-${randomSuffix}`,
    amount: parseFloat(amount),
    reference: referenceText,
    status: 'REDEEMED',        // ← Ya confirmado
    redeemedById: newUser.id,
    redeemedAt: new Date(),
    // ...
  },
});
```

**Razón:** El pago ya fue recibido (efectivo o tarjeta), por lo que el código es de **confirmación**, no de cobro pendiente.

### 🛡️ Permisos: SCHOOL_ADMIN agregado

**Archivos actualizados para incluir rol `SCHOOL_ADMIN`:**
- `app/api/treasury/register-basic/route.ts`

```typescript
const ALLOWED_ROLES = ['ADMIN', 'SUPER_ADMIN', 'COORDINADOR', 'TESORERO', 'DIRECTOR', 'SUBDIRECTOR', 'SCHOOL_ADMIN'];
```

---

## v3.1 - 03/03/2026 (Sesión 2)

### 🚨 REGLA CRÍTICA: Modelos con `id` String sin @default

**Descubrimiento:** Varios modelos tienen `id String @id` SIN `@default(uuid())`, lo que significa que el `id` DEBE proporcionarse manualmente en `create()`.

**Modelos afectados que requieren `id` manual:**
| Modelo | Tipo de ID | Requiere en create() |
|--------|------------|---------------------|
| `CashBatch` | `String @id` | ✅ `id: randomUUID()` |
| `ExpoVisitor` | `String @id` | ✅ `id: generateUUID()` |

### Fix: Quantum Website /site/[slug] - Múltiples Relaciones Prisma

**Problema:** El sitio web publicado mostraba 404 aunque existía en la BD.

**Causa raíz:** Múltiples relaciones con nombres incorrectos en la query:
- `products` → `QuantumProduct`
- `user` → `Usuario`
- `Usuario_ServiceReview_authorIdToUsuario` → `Usuario` (relación simple en ServiceReview)

**Solución:**
```typescript
// INCORRECTO
const website = await prisma.quantumWebsite.findUnique({
  where: { slug, isPublished: true },
  include: {
    products: true,        // ❌ 
    user: {                // ❌
      select: {
        BusinessProfile: {
          select: {
            reviews: {     // ❌ (es ServiceReview)
              include: {
                author: {} // ❌ (es Usuario)
              }
            }
          }
        }
      }
    }
  }
});

// CORRECTO
const website = await prisma.quantumWebsite.findUnique({
  where: { slug, isPublished: true },
  include: {
    QuantumProduct: true,  // ✅
    Usuario: {             // ✅
      select: {
        BusinessProfile: {
          select: {
            ServiceReview: {  // ✅
              include: {
                Usuario: {}   // ✅ (relación simple)
              }
            }
          }
        }
      }
    }
  }
});
```

**Archivos modificados:**
- `app/site/[slug]/page.tsx`

### Fix: Quantum Web My-Site API - Relación QuantumProduct

**Problema:** API `/api/quantum-web/my-site` devolvía `hasSite: false` con error de Prisma.

**Causa raíz:** `products` → `QuantumProduct`

**Archivo modificado:**
- `app/api/quantum-web/my-site/route.ts`

### Fix: ExpoVisitor.create() - Campo id Requerido

**Problema:** Error al registrar visitante en la Expo: "Error al registrar visitante".

**Causa raíz:** Modelo `ExpoVisitor` tiene `id String @id` sin `@default()`.

**Solución:**
```typescript
// INCORRECTO
await prisma.expoVisitor.create({
  data: {
    token: generateUUID(),
    name: name.trim(),
    // ... sin id
  }
});

// CORRECTO
await prisma.expoVisitor.create({
  data: {
    id: generateUUID(),      // ✅ REQUERIDO
    token: generateUUID(),
    name: name.trim(),
    // ...
  }
});
```

**Archivo modificado:**
- `app/api/expo/visitor/register/route.ts`

### Fix: Mi-Negocio Layout - Empalme con Topbar

**Problema:** Botones de Publicar, Editar y Vista se empalmaban con la barra superior.

**Causa raíz:** Uso de `min-h-screen` que ignora el layout del dashboard con Topbar de 64px.

**Solución:**
```typescript
// INCORRECTO
className="min-h-screen flex flex-col items-center justify-center p-6"

// CORRECTO
className="min-h-[calc(100vh-8rem)] flex flex-col items-center justify-center p-6"
```

**Archivo modificado:**
- `app/dashboard/mi-negocio/page.tsx` (múltiples componentes)

### 📋 Resumen de Relaciones Prisma Corregidas Hoy

| Archivo | Relación Incorrecta | Relación Correcta |
|---------|--------------------|--------------------|
| `/site/[slug]/page.tsx` | `products` | `QuantumProduct` |
| `/site/[slug]/page.tsx` | `user` | `Usuario` |
| `/site/[slug]/page.tsx` | `reviews` (en BusinessProfile) | `ServiceReview` |
| `/site/[slug]/page.tsx` | `author` (en ServiceReview) | `Usuario` |
| `/api/quantum-web/my-site/route.ts` | `products` | `QuantumProduct` |
| `/api/expo/visitor/register/route.ts` | (faltaba `id`) | `id: generateUUID()` |

### 🔍 Cómo Verificar Relaciones en Prisma Schema

```bash
# Ver relaciones de un modelo específico
grep -A 50 "^model QuantumWebsite" prisma/schema.prisma | grep -E "^\s+\w+\s+\w+"

# Ver nombre exacto de relación
grep -A 30 "^model ServiceReview" prisma/schema.prisma
```

---

## v3.0 - 03/03/2026


### 🔑 Patrón Crítico Descubierto: Nombres de Relaciones Prisma

**Descubrimiento principal:** En el schema Prisma de ~6,700 líneas, las relaciones usan nombres en **PascalCase** basados en el nombre del modelo, NO aliases en camelCase.

**Regla de nombrado:**
| Tipo de Relación | Formato del Nombre | Ejemplo |
|------------------|-------------------|---------|
| Relación simple | `NombreModelo` | `Vision`, `Organization`, `BusinessCategory` |
| Multi-relación (mismo modelo) | `ModeloA_ModeloB_campoToModeloA` | `Usuario_CashBatch_coordinatorIdToUsuario` |

**Cómo diagnosticar:** Cuando Prisma muestra error "Unknown field X", revisar las opciones disponibles marcadas con "?". Ejemplo:
```
Unknown field `vision` for select statement on model `BusinessProfile`.
Available options are marked with ?: Vision?
```

### Fix: Treasury Coordinator - CashBatch Creation

**Problema:** Error al crear corte de caja: "Argument `id` is missing" y constraint de `batchNumber` único.

**Causa raíz:**
1. Modelo `CashBatch` tiene `id String @id` SIN `@default(uuid())` - requiere `id` manual
2. Modelo tiene `updatedAt DateTime` SIN `@default(now())` - requiere valor manual
3. `batchNumber` buscaba solo por coordinador en lugar de global

**Solución:**
```typescript
// Generar batchNumber global (no por coordinador)
const lastBatch = await prisma.cashBatch.findFirst({
  orderBy: { createdAt: 'desc' }
});
const nextNumber = lastBatch 
  ? parseInt(lastBatch.batchNumber.replace('BATCH-', '')) + 1 
  : 1;

// Crear con id y updatedAt manuales
const batch = await prisma.cashBatch.create({
  data: {
    id: randomUUID(),  // REQUERIDO
    batchNumber: `BATCH-${nextNumber.toString().padStart(5, '0')}`,
    coordinatorId,
    status: 'PENDING',
    updatedAt: new Date(),  // REQUERIDO
    // ...
  }
});
```

**Archivo modificado:**
- `app/api/treasury/coordinator/batch/route.ts`

### Fix: Treasury Director - Relaciones de CashBatch

**Problema:** Error 500 al cargar batches pendientes en vista de director.

**Causa raíz:** Nombres de relaciones incorrectos:
- `coordinator` → `Usuario_CashBatch_coordinatorIdToUsuario`
- `approvedBy` → `Usuario_CashBatch_approvedByIdToUsuario`
- `paymentCodes` → `PaymentCode`
- `expenses` → `Expense`

**Archivo modificado:**
- `app/api/treasury/director/batches/route.ts`

### Fix: Sidebar para Coordinador en Vista Participante

**Problema:** Coordinadores no veían el menú de navegación cuando usaban la vista de participante (`/dashboard?view=participante`).

**Causa raíz:** El Sidebar retornaba `null` para roles que no eran `PARTICIPANTE`, pero los coordinadores usan esta vista para ver su perspectiva como participante.

**Solución:**
```typescript
// Permitir sidebar en vista participante para COORDINADOR
if (view === 'participante' && (rol === 'PARTICIPANTE' || rol === 'COORDINADOR')) {
  // Mostrar sidebar de participante
}
```

**Archivo modificado:**
- `components/dashboard/Sidebar.tsx`

### Fix: Legacy Vision Builder - Nombre de Campo en Respuesta

**Problema:** Error al cargar `/dashboard/legado/legacy-vision-builder`.

**Causa raíz:** API retornaba `TribeCaptainAssignment` pero frontend esperaba `assignments`.

**Solución:**
```typescript
// API response mapping
{
  // ... otros campos
  assignments: captaincy.TribeCaptainAssignment  // Renombrar para frontend
}
```

**Archivo modificado:**
- `app/api/legacy-vision-builder/route.ts`

### Fix: TribeCaptaincy.create() - Campo updatedAt Requerido

**Problema:** Error al crear TribeCaptaincy: "Argument `updatedAt` is missing".

**Causa raíz:** Modelo `TribeCaptaincy` tiene `updatedAt DateTime` sin `@default(now())`.

**Solución:**
```typescript
await prisma.tribeCaptaincy.create({
  data: {
    // ... otros campos
    updatedAt: new Date()  // REQUERIDO
  }
});
```

**Archivo modificado:**
- `app/api/legacy-vision-builder/route.ts`

### Fix: QuantumWebsite.create() - Campo updatedAt Requerido

**Problema:** Error al publicar sitio web Quantum.

**Causa raíz:** Modelo `QuantumWebsite` tiene `updatedAt DateTime` sin default.

**Archivo modificado:**
- `app/api/quantum-web/publish/route.ts`

### Fix: BusinessProfile.create() - Campo updatedAt Requerido

**Problema:** Error al crear perfil de negocio en `/dashboard/mi-negocio`.

**Archivo modificado:**
- `app/api/talent-directory/my-profile/route.ts`

### Fix: Talent Directory My-Profile API - Relaciones Prisma

**Problema:** Error 500 al cargar y guardar perfil de negocio.

**Causa raíz:** Múltiples relaciones con nombres incorrectos:
- `category` → `BusinessCategory`
- `organization` → `Organization`
- `vision` → `Vision`
- `reviews` → `ServiceReview`

**Solución completa:**
```typescript
// GET - Query con relaciones correctas
const profile = await prisma.businessProfile.findUnique({
  where: { userId },
  include: {
    BusinessCategory: true,  // No 'category'
    Organization: true,      // No 'organization'
    Vision: true,            // No 'vision'
    ServiceReview: true      // No 'reviews'
  }
});

// Mapear para compatibilidad con frontend
return {
  ...profile,
  category: profile.BusinessCategory,
  organization: profile.Organization,
  vision: profile.Vision,
  reviews: profile.ServiceReview
};

// POST - Crear con updatedAt
await prisma.businessProfile.create({
  data: {
    userId,
    categoryId,
    // ...
    updatedAt: new Date()  // REQUERIDO
  }
});
```

**Archivo modificado:**
- `app/api/talent-directory/my-profile/route.ts`

### Fix: Expo Exhibitor API - Relación Vision

**Problema:** Error "No se pudo cargar la información" en `/expo/votar/[userId]`.

**Causa raíz:** Relación `vision` incorrecta → `Vision`.

**Archivo modificado:**
- `app/api/expo/exhibitor/[userId]/route.ts`

### 📋 Patrón de Campos Requeridos sin Default

**Modelos afectados que requieren `updatedAt: new Date()` manual:**
| Modelo | Campo | Requiere en create() |
|--------|-------|---------------------|
| `CashBatch` | `id`, `updatedAt` | ✅ Ambos |
| `TribeCaptaincy` | `updatedAt` | ✅ Sí |
| `QuantumWebsite` | `updatedAt` | ✅ Sí |
| `BusinessProfile` | `updatedAt` | ✅ Sí |

**Recomendación:** Al crear registros en modelos con `updatedAt DateTime` (sin `@default`), SIEMPRE incluir `updatedAt: new Date()`.

## v2.9 - 01/03/2026

### Fix: TOP FILE API - Relaciones GCCallLog y GCCallAttempt

**Problema:** El botón "TOP FILE" seguía mostrando error 500 después de fixes anteriores.

**Causa raíz:** Nombres de relaciones Prisma incorrectos en el mapeo de respuesta:
- `c.gameChanger` → `c.Usuario_GCCallLog_gameChangerIdToUsuario` (en GCCallLog)
- `c.gameChanger` → `c.Usuario_GCCallAttempt_gameChangerIdToUsuario` (en GCCallAttempt)
- `c.vision` → `c.Vision`

**Archivo modificado:**
- `app/api/el-cruce/top-file/[userId]/route.ts`

### UI: Reemplazar filtro de pagos por filtro de progreso

**Cambio:** En la página "Mis Participantes", el filtro "Todos los pagos" fue reemplazado por un filtro de progreso más útil.

**Opciones de filtro:**
| Valor | Descripción |
|-------|-------------|
| `CARTA` | 📝 Con Carta (tiene declaraciones) |
| `QUIZ_MEDICO` | 💊 Quiz Médico completado |
| `QUIZ_AVANZADO` | 📋 Quiz Avanzado completado |
| `NEGOCIO` | 💼 Tiene perfil de negocio |
| `SIN_CARTA` | ❌ Sin carta |
| `SIN_QUIZ_MEDICO` | ⚠️ Sin quiz médico |

**Archivo modificado:**
- `app/dashboard/school-admin/users/page.tsx`

### UI: Eliminar botón "Ver Detalles"

**Cambio:** Se eliminó el botón "Ver Detalles" de la lista de usuarios, dejando solo el botón "TOP FILE" para ver información del participante.

**Archivo modificado:**
- `app/dashboard/school-admin/users/page.tsx`

## v2.8 - 01/03/2026

### Fix: TOP FILE API - Relaciones Prisma incorrectas en AdvancedPreRegistration

**Problema:** El botón "TOP FILE" en la lista de usuarios mostraba "Error interno del servidor" (500).

**Causa raíz:** Nombres de relaciones Prisma incorrectos en `/api/el-cruce/top-file/[userId]/route.ts`:
- `currentProduct` → `SchoolProduct_AdvancedPreRegistration_currentProductIdToSchoolProduct`
- `targetProduct` → `SchoolProduct_AdvancedPreRegistration_targetProductIdToSchoolProduct`
- `scannedByStaff` → `Usuario_AdvancedPreRegistration_scannedByStaffIdToUsuario`

**Archivos modificados:**
- `app/api/el-cruce/top-file/[userId]/route.ts`

### Fix: Filtrado preciso de usuarios por Vision + Level

**Problema:** La página "Mis Participantes" mostraba 19 usuarios cuando deberían ser 17 al filtrar por Vision 13 + Nivel PL.

**Causa raíz:** El filtrado verificaba que el usuario tuviera Vision 13 Y nivel PL por separado, pero no que tuviera un enrollment que fuera Vision 13 CON nivel PL al mismo tiempo.

**Solución implementada:**
```typescript
// API: Crear combinaciones vision+level para filtrado preciso
const visionLevelCombos = enrollments.map((e: any) => `${e.visionId}_${e.level}`);

// Frontend: Usar combinación cuando ambos filtros están activos
if (visionFilter !== 'ALL' && levelFilter !== 'ALL') {
  const combo = `${visionId}_${levelFilter}`;
  filtered = filtered.filter(u => u.visionLevelCombos.includes(combo));
}
```

**Archivos modificados:**
- `app/api/school-admin/users/route.ts` - Agregar campo `visionLevelCombos`
- `app/dashboard/school-admin/users/page.tsx` - Usar combinación para filtrado

### Fix: Ícono de Carta solo activo con declaraciones

**Problema:** El ícono de carta en la lista de usuarios se mostraba amarillo (activo) para usuarios con carta BORRADOR vacía.

**Solución:** El ícono ahora solo se muestra amarillo cuando el usuario tiene al menos una declaración en su carta, consistente con el widget de "Saltos Cuánticos".

**Archivo modificado:**
- `app/api/school-admin/users/route.ts` - Verificar declaraciones antes de retornar estado de carta

## v2.7 - 01/03/2026

### Fix: School Admin Users API - Filtrado por enrollmentStatus

**Problema:** La página "Mis Participantes" mostraba 22 usuarios para Vision 13 nivel PL, pero la página "Gestionar Visión" mostraba 17.

**Causa raíz:** La API `/api/school-admin/users` obtenía los visionIds y levels de los Tickets, sin considerar el `enrollmentStatus` de `vision_enrollments`. Esto incluía usuarios con `enrollmentStatus = 'PENDING'` que aún no estaban realmente inscritos.

**Solución implementada:**
```typescript
// Agregar enrollments del usuario al query
vision_enrollments_vision_enrollments_userIdToUsuario: {
  where: {
    enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
  },
  select: {
    id: true,
    visionId: true,
    level: true,
    enrollmentStatus: true,
    Vision: { select: { id: true, nombre: true } }
  }
}

// Usar enrollments como fuente principal (no Tickets)
const enrollments = (u as any).vision_enrollments_vision_enrollments_userIdToUsuario || [];
const enrollmentVisionIds = enrollments.map((e: any) => e.visionId);
const enrollmentLevels = enrollments.map((e: any) => e.level);
```

**Archivo modificado:**
- `app/api/school-admin/users/route.ts` - Agregado filtro por enrollmentStatus ENROLLED/ACTIVE/COMPLETED

**Valores de `enrollmentStatus`:**
| Valor | Incluido en filtro | Descripción |
|-------|-------------------|-------------|
| `ENROLLED` | ✅ Sí | Inscrito activamente |
| `ACTIVE` | ✅ Sí | Participando activamente |
| `COMPLETED` | ✅ Sí | Completó el programa |
| `PENDING` | ❌ No | Pendiente de inscripción |
| `CANCELLED` | ❌ No | Cancelado |
| `DROP` | ❌ No | Baja |
| `MOVED_TO_NEXT` | ❌ No | Movido a siguiente visión |

### Fix: MetamorfosisTaskCard - Error 404 en Mis Saltos

**Problema:** Al hacer clic en "Ver Más" de una tarea de salto cuántico, redirigía a `/dashboard/participante/mis-saltos` que no existía (404).

**Solución:** Se agregó un modal in-place para mostrar el detalle del salto en lugar de redirigir a otra página.

**Archivo modificado:**
- `components/dashboard/MetamorfosisTaskCard.tsx` - Agregado modal con AnimatePresence

### Fix: School Admin Users API - Relaciones Prisma incorrectas

**Problema:** La API `/api/school-admin/users` no cargaba usuarios (mostraba "Cargando..." indefinidamente).

**Causa raíz:** Nombres de relaciones Prisma incorrectos:
- `Ticket_TicketOwner` → `Ticket_Ticket_ownerIdToUsuario`
- `MedicalForm` → `MedicalForm_MedicalForm_userIdToUsuario`
- `AdvancedQuestionnaire` → `AdvancedQuestionnaire_AdvancedQuestionnaire_userIdToUsuario`
- `VisionParticipante` → `VisionParticipante_VisionParticipante_participanteIdToUsuario`

**Archivo modificado:**
- `app/api/school-admin/users/route.ts` - Corregidos todos los nombres de relaciones

## v2.6 - 01/03/2026

### Feature: Visiones CORE - Filtrado por Nivel PL (Liderato)

**Descripción:** En visiones CORE (que tienen configurados los 3 niveles: BASIC, ADVANCED, PL), los participantes y Game Changers se filtran automáticamente para mostrar solo los del nivel PL (Liderato).

**Problema resuelto:** En la página `/dashboard/school-admin/visiones/[id]`, cuando una visión tenía los 3 niveles configurados (CORE), mostraba participantes y Game Changers del nivel activo en lugar del nivel PL.

**Solución implementada:**
```typescript
// Detectar si es visión CORE (tiene los 3 niveles)
const hasBasic = visionProducts.some(p => p.levelType === 'BASIC');
const hasAdvanced = visionProducts.some(p => p.levelType === 'ADVANCED');
const hasPL = visionProducts.some(p => p.levelType === 'PL');
const isCoreVision = hasBasic && hasAdvanced && hasPL;

// Para visiones CORE, usar nivel PL; sino, usar activeLevel
const effectiveLevel = isCoreVision ? 'PL' : activeLevel;
```

**Archivos modificados:**
- `app/api/school-admin/visiones/[id]/route.ts` - Lógica de filtrado por effectiveLevel

**Respuesta API actualizada:**
```json
{
  "success": true,
  "activeLevel": "BASIC",
  "effectiveLevel": "PL",
  "isCoreVision": true,
  "participantes": [...],
  "gameChangers": [...]
}
```

### Feature: Botones deshabilitados en Visiones CORE

**Descripción:** En visiones CORE, los botones "Asignar Capitán", "Agregar Game Changer" y "Agregar Participante" se deshabilitan automáticamente.

**Razón:** Los participantes y Game Changers en visiones CORE se agregan a través del proceso de inscripción estándar, no manualmente.

**Archivos modificados:**
- `app/dashboard/school-admin/visiones/[id]/page.tsx`

### Feature: Participantes CORE solo con asistencia confirmada

**Descripción:** En visiones CORE, la sección de Participantes solo muestra usuarios con asistencia confirmada (`attendanceStatus = 'ATTENDED'`) en el nivel PL.

**Valores de `attendanceStatus` en `vision_enrollments`:**
| Valor | Descripción | Count (actual) |
|-------|-------------|----------------|
| `PENDING` | Pendiente de asistencia | 787 |
| `ATTENDED` | ✅ Asistió al entrenamiento | 297 |
| `NOT_ATTENDED` | No asistió | 11 |
| `DROP` | Baja/Abandono | 10 |
| `BACKLOG` | Lista de espera | 2 |
| `MOVED` | Movido a otra visión | 25 |
| `null` | Sin estado | 103 |

> **⚠️ IMPORTANTE:** El valor es `ATTENDED`, NO `ASISTE`. Este es un error común.

**Filtro aplicado:**
```typescript
const enrollmentWhereClause = {
  visionId,
  level: effectiveLevel,
  ...(isCoreVision 
    ? { attendanceStatus: 'ATTENDED' } // CORE: solo con asistencia confirmada
    : { 
        OR: [
          { attendanceStatus: null },
          { attendanceStatus: { notIn: ['DROP', 'BACKLOG', 'MOVED'] } }
        ]
      }
  ),
  enrollmentStatus: { notIn: ['MOVED_TO_NEXT', 'CANCELLED', 'DROP'] },
  droppedAt: null,
};
```

### Feature: Filtro de roles para Game Changers

**Descripción:** Se agregó validación para evitar que usuarios con ciertos roles sean registrados como Game Changers.

**Roles NO permitidos como Game Changer:**
| Rol/Condición | Puede ser GC |
|---------------|--------------|
| TRAINER | ❌ No |
| SCHOOL_ADMIN | ❌ No |
| ADMINISTRADOR | ❌ No |
| esEntrenador = true | ❌ No |
| PARTICIPANTE | ✅ Sí |
| GAMECHANGER | ✅ Sí |
| MENTOR | ✅ Sí |
| COORDINADOR | ✅ Sí |

**Archivos modificados:**
- `app/api/school-admin/visiones/[id]/add-gamechangers/route.ts`
- `app/api/coordinador/visiones/[id]/add-gamechangers/route.ts`

**Comportamiento:** Los usuarios con roles no permitidos son omitidos silenciosamente y reportados en la respuesta:
```json
{
  "success": true,
  "message": "3 Game Changer(s) asignado(s). 1 usuario(s) omitido(s).",
  "skippedUsers": [
    { "email": "trainer@example.com", "reason": "Rol TRAINER no puede ser Game Changer" }
  ]
}
```

## v2.5 - 01/03/2026
### Fix: API Misión Participante - Nombres de relaciones Prisma incorrectos

**Problema:** Al acceder a `/dashboard/mision/[id]` se mostraba "Error interno" (500).

**Causa raíz:** El API `/api/participante/mision/[id]/route.ts` usaba nombres de relaciones que no coincidían con el schema de Prisma:
- `Mission` → debía ser `TrainerMission`
- `Template` → debía ser `TrainerTaskTemplate`
- `Questions` → debía ser `TrainerTaskQuestion`
- `Trainer` → debía ser `Usuario`
- `QuestionAnswers` → debía ser `MissionQuestionAnswer`
- `Reviewer` → debía ser `Usuario_MissionSubmission_reviewedByToUsuario`

**Solución:** Se corrigieron todos los nombres de relaciones en las queries de Prisma y en el formateo de respuestas.

**Archivo modificado:**
- `app/api/participante/mision/[id]/route.ts`

### UI: Eliminación de "Instalar App" del Sidebar

**Descripción:** Se eliminó el botón "Instalar App" (PWA) del sidebar del dashboard.

**Archivos modificados:**
- `components/dashboard/Sidebar.tsx` - Eliminado componente InstallAppButton y su import

## v2.4 - 27/02/2026
### Fix: PersonalQRWidget - Carga dinámica de referralCode

**Problema:** Los coordinadores que fueron asignados después de iniciar sesión no veían su código de referido en el QR. El link generado mostraba "No hay sedes disponibles" al ser usado.

**Causa raíz:** El `referralCode` se almacena en el JWT de NextAuth al momento del login. Si el código se asigna posteriormente en la base de datos, la sesión mantiene el valor `undefined`.

**Solución implementada en `/components/dashboard/PersonalQRWidget.tsx`:**

```typescript
// Estado para el referralCode (puede venir de props o cargarse dinámicamente)
const [userReferralCode, setUserReferralCode] = useState<string | undefined>(referralCode);

// Si no hay referralCode en props, obtenerlo del usuario via API
useEffect(() => {
  if (!referralCode && userId) {
    fetch(`/api/me`)
      .then(res => res.json())
      .then(data => {
        if (data.referralCode) {
          setUserReferralCode(data.referralCode);
        }
      })
      .catch(err => console.error('Error fetching user referralCode:', err));
  }
}, [referralCode, userId]);
```

**Archivos modificados:**
- `components/dashboard/PersonalQRWidget.tsx` - Carga dinámica del referralCode

**Nota técnica:** Esta solución evita que el usuario tenga que cerrar y volver a abrir sesión. El componente detecta automáticamente cuando falta el código y lo obtiene de `/api/me`.

## v2.4 - 27/02/2026
### Feature: GCTribeWidget - Widget de Tribu para Game Changers

**Descripción:** Widget que muestra estadísticas de la tribu del Game Changer (enrollados, graduados) con botón para invitar.

**Archivos creados:**
- `components/dashboard/GCTribeWidget.tsx` - Widget client con modal de QR
- `app/api/gamechanger/tribe-stats/route.ts` - API para obtener stats de tribu

**Funcionalidad:**
- Muestra nombre de la visión activa
- Muestra misión de la tribu (si existe)
- Contador de enrollados (usuarios invitados con ticket activo)
- Contador de graduados (usuarios invitados que están graduados)
- Botón "Invitar a alguien" que abre modal con QR personal

**API Response:**
```json
{
  "visionId": 24,
  "visionName": "Vision 26",
  "tribeMission": "Nuestra misión es...",
  "enrolledCount": 5,
  "graduatedCount": 2
}
```

### Fix: Página Progreso F.R.U.T.O.S. - Conteo incorrecto de tareas

**Problema:** La página `/dashboard/progreso-frutos` mostraba "0 de 1 tareas" cuando el usuario tenía cientos de tareas.

**Causa raíz:**
1. El filtro de categoría comparaba labels (`'Finanzas'`) con valores de DB (`'finanzas'`)
2. Usaba `EvidenciaAccion` para contar completadas en vez de `TaskInstance`

**Solución:**
```typescript
// Mapeo correcto de keys a categorías en DB
const keyToCategoriaMap: Record<string, string> = {
  'finanzas': 'finanzas',
  'relaciones': 'relaciones',
  // ...
};

// Query con TaskInstance en vez de EvidenciaAccion
const metas = await prisma.meta.findMany({
  where: { cartaId: carta.id, categoria: categoriaDB },
  include: {
    Accion: {
      include: {
        TaskInstance: { where: { usuarioId: usuario.id } }
      }
    }
  }
});

// Conteo basado en TaskInstance
metas.forEach(meta => {
  meta.Accion.forEach(accion => {
    const instances = accion.TaskInstance || [];
    tareasTotal += instances.length;
    tareasCompletadas += instances.filter(t => t.status === 'COMPLETED').length;
  });
});
```

**Archivo modificado:**
- `app/dashboard/progreso-frutos/page.tsx`

## v2.3 - 26/02/2026
### Fix: PersonalQRWidget - Carga dinámica de referralCode

## v2.2 - 26/02/2026
- Documentación completa de 212 modelos de base de datos
- Catálogo de flujos de procesos principales
- Lista de APIs principales
- Librerías core documentadas
- Dashboards por rol

## v2.1 - 26/02/2026
- Sistema de comisiones por referidos (Ambassador Engine)
- Sistema de ledger de comisiones
- Documentación de errores comunes

## v3.1 - 03/03/2026

### 🔧 Patrón CRÍTICO: Modelos con `id String @id` sin `@default()`

**Problema recurrente:** Algunos modelos tienen `id String @id` sin `@default(uuid())`, lo que significa que Prisma NO genera automáticamente el ID.

**Modelos afectados:**
- `ExpoVisitor` - Requiere `id: generateUUID()`
- `ExpoReview` - Requiere `id: generateUUID()`
- `CashBatch` - Requiere `id: randomUUID()`

**Solución estándar:**
```typescript
import { randomUUID } from 'crypto';

// En el create():
await prisma.expoVisitor.create({
  data: {
    id: randomUUID(), // ← REQUERIDO
    name: 'Juan',
    // ... otros campos
  }
});
```

### 🔧 Patrón CRÍTICO: Nombres de Relaciones en Prisma

**Regla:** Los nombres de relaciones en `include` deben coincidir EXACTAMENTE con los del schema.

**Ejemplos de correcciones:**

| Incorrecto | Correcto |
|------------|----------|
| `user` | `Usuario` |
| `category` | `BusinessCategory` |
| `vision` | `Vision` |
| `products` | `QuantumProduct` |
| `reviews` | `ServiceReview` o `ExpoReview` |
| `author` | `Usuario` |
| `exhibitor` | `Usuario_ExpoReview_exhibitorIdToUsuario` |

**Verificar siempre en schema.prisma:**
```bash
grep -A 10 "^model BusinessProfile" prisma/schema.prisma
```

### Fix: API `/api/talent-directory/search` - Relaciones incorrectas

**Problema:** Error 500 al buscar en Expo de Futuros - "Unknown field `user` for include statement"

**Causa raíz:** La API usaba nombres de relaciones incorrectos:
- `user` → Debe ser `Usuario`
- `category` → Debe ser `BusinessCategory`
- `vision` → Debe ser `Vision`

**Solución:**
```typescript
// ANTES (incorrecto)
include: {
  user: { select: { id: true, nombre: true } },
  category: { select: { name: true } },
  vision: { select: { nombre: true } }
}

// DESPUÉS (correcto)
include: {
  Usuario: { select: { id: true, nombre: true } },
  BusinessCategory: { select: { name: true } },
  Vision: { select: { nombre: true } }
}

// Y mapear para el frontend:
return {
  ...profile,
  user: profile.Usuario,
  category: profile.BusinessCategory,
  vision: profile.Vision
};
```

**Archivo modificado:** `app/api/talent-directory/search/route.ts`

### Fix: Expo de Futuros - Filtro por Visión en vez de Organización

**Problema:** En "Expo de Futuros", no aparecían los negocios aunque existían en la base de datos.

**Causa raíz:** La API filtraba por `organizationId` del usuario, pero los negocios de una visión pueden pertenecer a diferentes organizaciones.

**Solución:**
```typescript
// ANTES (incorrecto)
if (section === 'expo') {
  where.status = { in: ['HIDDEN', 'ACTIVE'] };
  where.organizationId = user.organizationId; // ← ESTO EXCLUÍA NEGOCIOS
  if (visionId) {
    where.visionId = parseInt(visionId);
  }
}

// DESPUÉS (correcto)
if (section === 'expo') {
  where.status = { in: ['HIDDEN', 'ACTIVE'] };
  if (visionId) {
    where.visionId = parseInt(visionId); // Filtrar SOLO por visión
  } else {
    where.organizationId = user.organizationId; // Fallback
  }
}
```

**Archivo modificado:** `app/api/talent-directory/search/route.ts`

### Fix: Frontend Mercado - Auto-seleccionar Visión del Usuario

**Problema:** El dropdown mostraba la visión pero no se enviaba el `visionId` al API.

**Solución:**
```typescript
// En fetchVisions():
const userVisionRes = await fetch('/api/user/vision-level');
if (userVisionRes.ok) {
  const data = await userVisionRes.json();
  if (data.visionId) {
    setUserActiveVisionId(data.visionId);
    setSelectedVision(data.visionId); // ← AÑADIDO: Auto-seleccionar
  }
}

// En useEffect de fetch:
if (activeSection === 'expo' && selectedVision) {
  fetchProfiles(1); // Solo fetch cuando hay visión seleccionada
}
```

**Archivo modificado:** `app/dashboard/mercado/page.tsx`

### Fix: Búsqueda de Expositores - Filtrar por Visión

**Problema:** La búsqueda en `/expo/calificar` mostraba expositores de todas las visiones.

**Solución:**
```typescript
// API: /api/expo/search-exhibitors
const visionId = searchParams.get('visionId');

const whereConditions: any[] = [
  { BusinessProfile: { isNot: null } },
  { nombre: { contains: query, mode: 'insensitive' } }
];

if (visionId) {
  whereConditions.push({ visionId: parseInt(visionId) });
}

// Frontend: calificar/page.tsx
const searchExhibitors = async (query: string) => {
  const params = new URLSearchParams();
  params.set('q', query);
  if (currentVisionId) {
    params.set('visionId', currentVisionId.toString());
  }
  const res = await fetch(`/api/expo/search-exhibitors?${params}`);
};
```

**Archivos modificados:**
- `app/api/expo/search-exhibitors/route.ts`
- `app/expo/calificar/page.tsx`

### Fix: Formulario Médico - Campo updatedAt requerido

**Problema:** Error al guardar formulario médico - el campo `updatedAt` no tiene `@updatedAt` en el schema.

**Solución:**
```typescript
const medicalFormData = {
  // ... otros campos
  updatedAt: new Date(), // ← AÑADIDO: Prisma no lo genera automáticamente
};
```

**Archivo modificado:** `app/api/medical-form/route.ts`

### Fix: Página Calificar - Mejorar UX de Búsqueda

**Problema:** El botón "Buscar" no hacía nada visible al usuario.

**Solución:**
1. Scroll suave al input de búsqueda
2. Mover input arriba del botón "Ver Catálogo"
3. Mensaje cuando no hay resultados

```typescript
onClick={() => {
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setTimeout(() => searchInput.focus(), 300);
  }
}}
```

**Archivo modificado:** `app/expo/calificar/page.tsx`

---

### Fix: API my-stats no retorna trainingInfo cuando GC no tiene squads

**Problema:** Cuando un Game Changer tiene asignación en `VisionGameChanger` pero no tiene ningún squad creado, la página de squads mostraba siempre nivel "BASIC" porque la API `/api/gc-calls/my-stats` hacía un early return sin calcular el `trainingInfo`.

**Diagnóstico:**
```javascript
// Consola del navegador mostraba:
📊 my-stats response: {success: true, trainingInfo: undefined, targetVisionId: undefined}
⚠️ No trainingInfo.level, defaulting to BASIC
```

**Causa raíz:** El código tenía un early return cuando `memberIds.length === 0`:
```typescript
// ANTES (código problemático)
if (memberIds.length === 0) {
  return NextResponse.json({
    success: true,
    stats: { totalMembers: 0, todayCalls: 0, membersWithoutCall: 0 },
    // ❌ NO incluía trainingInfo ni targetVisionId
  });
}
```

**Solución:** Calcular `trainingInfo` desde `gcAssignments` antes del early return:
```typescript
// DESPUÉS (código corregido)
if (memberIds.length === 0) {
  let trainingInfoForEmpty = null;
  let targetVisionIdForEmpty: number | null = null;
  
  if (gcAssignments.length > 0) {
    const levelPriority = ['PL', 'ADVANCED', 'BASIC'];
    const sortedAssignments = [...gcAssignments].sort((a, b) => {
      return levelPriority.indexOf(a.level) - levelPriority.indexOf(b.level);
    });
    
    const highestLevelAssignment = sortedAssignments[0];
    const level = highestLevelAssignment.level;
    
    trainingInfoForEmpty = {
      level,
      showInDashboard: true,
      // ... otros campos calculados
    };
    targetVisionIdForEmpty = highestLevelAssignment.visionId;
  }
  
  return NextResponse.json({
    success: true,
    stats: { totalMembers: 0, todayCalls: 0, membersWithoutCall: 0 },
    trainingInfo: trainingInfoForEmpty,  // ✅ Ahora incluye el nivel correcto
    targetVisionId: targetVisionIdForEmpty,
  });
}
```

**Archivo modificado:** `app/api/gc-calls/my-stats/route.ts`

**Lección:** En APIs con early returns, verificar que TODOS los campos necesarios estén incluidos en cada respuesta posible.

---

## 📋 Checklist para Nuevos Desarrolladores

### Antes de crear cualquier `.create()`:
1. ¿El modelo tiene `id String @id` sin `@default()`? → Agregar `id: randomUUID()`
2. ¿El modelo tiene `updatedAt DateTime` sin `@updatedAt`? → Agregar `updatedAt: new Date()`

### Antes de usar `include`:
1. Verificar nombre EXACTO de la relación en `schema.prisma`
2. Usar formato PascalCase: `Usuario`, `Vision`, `BusinessCategory`
3. Para relaciones múltiples usar nombre completo: `Usuario_ExpoReview_exhibitorIdToUsuario`

### Comando útil para verificar relaciones:
```bash
grep -A 20 "^model NombreDelModelo" prisma/schema.prisma
```

---

*Manual del Programador - Plataforma Quantum Frutos*  
*Versión 3.5 - Marzo 2026*  
*Última actualización: 06/03/2026*

