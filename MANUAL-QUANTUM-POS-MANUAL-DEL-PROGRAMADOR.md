# 📚 MANUAL DEL PROGRAMADOR - PLATAFORMA QUANTUM FRUTOS

## Guía Completa de Desarrollo y Arquitectura

**Versión:** 2.0  
**Fecha:** Febrero 2026  
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
  PENDING
  ASISTE
  NO_ASISTE
  NO_ANSWER
  BUSY
}
```

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

*Manual del Programador - Plataforma Quantum Frutos*  
*Versión 2.0 - Febrero 2026*  
*Última actualización: 26/02/2026*
