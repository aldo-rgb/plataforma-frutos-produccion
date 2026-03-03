# 📚 MANUAL DEL PROGRAMADOR - PLATAFORMA QUANTUM FRUTOS

## Guía Completa de Desarrollo y Arquitectura

**Versión:** 3.0  
**Fecha:** Marzo 2026  
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

---

*Manual del Programador - Plataforma Quantum Frutos*  
*Versión 3.0 - Marzo 2026*  
*Última actualización: 03/03/2026*
