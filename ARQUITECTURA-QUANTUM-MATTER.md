# 🚀 QUANTUM MATTER - PLATAFORMA FRUTOS
## INSTRUCTIVO COMPLETO DE ARQUITECTURA Y CONTINUACIÓN

---

## 📋 INSTRUCCIONES PARA NUEVA CONVERSACIÓN

**Copia y pega este prompt completo al iniciar una nueva conversación:**

```
Eres mi asistente de desarrollo para la plataforma "Quantum Matter" (Plataforma Frutos). 
Esta es una aplicación de entrenamiento/formación empresarial construida con:

- **Framework**: Next.js 14.2.20 con App Router
- **Lenguaje**: TypeScript
- **Base de datos**: PostgreSQL con Prisma 5.22.0
- **Autenticación**: NextAuth.js
- **Estilos**: Tailwind CSS
- **Hosting**: Vercel
- **Repositorio**: github.com/aldo-rgb/plataforma-frutos-produccion (rama main)

**ESTILO DE RESPUESTA:**
- Sé directo y conciso
- Cuando hagas cambios en código, usa el formato "Modo Buscar y Reemplazar Exacto"
- Para código nuevo, indica la línea de arriba y abajo donde debe ir
- No preguntes confirmación, actúa directamente
- Sube cambios a Vercel con: git add -A && git commit -m "mensaje" && git push origin main

**CONTEXTO DEL PROYECTO:**
[PEGA AQUÍ EL CONTENIDO DE ESTE DOCUMENTO]
```

---

## 🏗️ ARQUITECTURA GENERAL

### Stack Tecnológico
```
/plataforma-frutos-FINAL
├── /app                    # Next.js App Router
│   ├── /api               # API Routes (backend)
│   ├── /dashboard         # Páginas protegidas por rol
│   ├── /auth              # Páginas de autenticación
│   └── layout.tsx         # Layout principal
├── /components            # Componentes React reutilizables
├── /lib                   # Utilidades y configuraciones
│   ├── prisma.ts         # Cliente Prisma
│   ├── auth.ts           # Configuración NextAuth
│   └── backlog-ticket.ts # Lógica de tickets BACKLOG/DROP
├── /prisma
│   └── schema.prisma     # Schema de base de datos (4142 líneas)
└── /public               # Assets estáticos
```

---

## 👥 ROLES DEL SISTEMA

| Rol | Código | Descripción |
|-----|--------|-------------|
| Participante | `PARTICIPANTE` | Usuario básico que toma entrenamientos |
| Mentor | `MENTOR` | Ofrece llamadas de disciplina |
| Game Changer | `GAMECHANGER` | Staff de apoyo en entrenamientos |
| Coordinador Básico | `COORDINATOR_BASIC` | Coordina entrenamientos básicos |
| Coordinador Avanzado | `COORDINATOR_ADVANCED` | Coordina entrenamientos avanzados |
| Coordinador General | `COORDINADOR` | Acceso a ambos niveles |
| Trainer | `TRAINER` | Imparte los entrenamientos presenciales |
| Director | `DIRECTOR` | Dirección general |
| School Admin | `SCHOOL_ADMIN` | Administrador de organización |
| Admin | `ADMINISTRADOR` | Administrador del sistema |

---

## 📚 MODELOS PRINCIPALES DE BASE DE DATOS

### Usuarios y Organizaciones
```prisma
model Usuario {
  id                    Int
  nombre                String
  email                 String @unique
  rol                   Rol
  organizationId        Int?
  puntosCuanticos       Int    @default(0)
  tier                  UserTier
  currentVisionLevel    VisionLevel?
  // ... 100+ campos más
}

model Organization {
  id                Int
  name              String
  slug              String @unique
  schoolAdminId     Int @unique
  totalLicenses     Int
  activeLicenses    Int
  // Configuración de precios, geofencing, etc.
}
```

### Visiones y Entrenamientos
```prisma
model Vision {
  id                  Int
  nombre              String
  organizationId      Int
  startDate           DateTime?      // Inicio BÁSICO
  endDate             DateTime?      // Fin BÁSICO
  advancedStartDate   DateTime?      // Inicio AVANZADO
  advancedEndDate     DateTime?      // Fin AVANZADO
  plWeekend1StartDate DateTime?      // PL Fin de semana 1
  plWeekend2StartDate DateTime?
  plWeekend3StartDate DateTime?      // Graduación
  // Relaciones con enrollments, products, tickets, etc.
}

model vision_enrollments {
  id               Int
  userId           Int
  visionId         Int
  level            VisionLevel  // BASIC, ADVANCED, PL
  enrollmentStatus String       // ENROLLED, GRADUATED, etc.
  attendanceStatus String?      // ATTENDED, NOT_ATTENDED, BACKLOG, DROP
  coordinatorId    Int
}

model SchoolProduct {
  id             Int
  organizationId Int
  visionId       Int?
  name           String
  type           ProductType      // TRAINING, WORKSHOP
  levelType      ProductLevelType // BASIC, ADVANCED, PL
  trainingStatus TrainingStatus   // PENDING, IN_PROGRESS, COMPLETED
  basePrice      Float
  promoPrice     Float?
  startDate      DateTime?
  endDate        DateTime?
}
```

### Precios por Organización
```prisma
model DefaultPrice {
  id             Int
  organizationId Int
  levelType      ProductLevelType // BASIC, ADVANCED, PL, COMBO_ADV_PL
  basePrice      Float
  promoPrice     Float?
}

// Precios actuales (Org 1):
// BASIC:       base=$7,500  promo=$7,500
// ADVANCED:    base=$9,500  promo=$7,500
// PL:          base=$11,000 promo=$9,500
// COMBO_ADV_PL: base=$14,500 promo=$9,000
```

### Tickets y Pagos
```prisma
model Ticket {
  id             String @id @default(uuid())
  ownerId        Int
  organizationId Int
  visionId       Int
  level          VisionLevel
  type           TicketType      // STANDARD, SCHOLARSHIP, VIP
  status         TicketStatus    // PENDING_PAYMENT, ACTIVE, USED
  paymentStatus  TicketPaymentStatus // UNPAID, PARTIAL, PAID, GIFT
  isTransferable Boolean
  amountPaid     Decimal
}

model AdvancedPreRegistration {
  id                 Int
  userId             Int
  currentProductId   Int
  targetProductId    Int?
  status             PreRegistrationStatus // PENDING, CONFIRMED, PAID
  paymentType        String?  // FULL, APARTADO
  amountPaid         Decimal
  promoApplied       Boolean
}
```

### Llamadas de Disciplina
```prisma
model CallBooking {
  id                  Int
  mentorId            Int
  studentId           Int
  scheduledAt         DateTime
  status              EstadoLlamada // PENDING, CONFIRMED, COMPLETED, MISSED_BY_USER
  type                CallType      // DISCIPLINE, ORIENTATION
  programEnrollmentId Int?
}

model CallAvailability {
  id        Int
  mentorId  Int
  dayOfWeek Int
  startTime String
  endTime   String
  type      CallType
}
```

---

## 🎯 FUNCIONALIDADES COMPLETADAS

### 1. Sistema de Entrenamientos (Visiones)
- ✅ Creación de visiones con fechas BASIC, ADVANCED, PL
- ✅ Enrollment de participantes por nivel
- ✅ Check-in con QR/geofencing
- ✅ Gestión de asistencia (ATTENDED, NOT_ATTENDED, BACKLOG, DROP)
- ✅ El Cruce (atravesar de nivel) con escaneo QR
- ✅ Generación de badges/gafetes PDF

### 2. Sistema de Tickets
- ✅ Compra de tickets por nivel
- ✅ Pre-registro para avanzado con "Apartado"
- ✅ Tickets de cortesía para BACKLOG y DROP
- ✅ Transferencia de tickets

### 3. Sistema de Precios
- ✅ Precios base y promocionales por organización
- ✅ COMBO (Advanced + PL) con precio especial
- ✅ Deadline de promo a las 8 PM del último día del básico
- ✅ Lógica de "Apartado" ($500 para reservar)

### 4. Dashboard por Rol
- ✅ Participante: metas, tareas, evidencias
- ✅ Coordinador Básico/Avanzado: widgets de declarados/inscritos
- ✅ Trainer: gestión de entrenamientos
- ✅ School Admin: gestión completa de organización

### 5. Backlogs y Drops (RECIÉN IMPLEMENTADO)
- ✅ Widget en dashboards de coordinadores
- ✅ Página `/dashboard/coordinador/backlogs-drops`
- ✅ Generación automática de ticket de cortesía
- ✅ Restricción de 1 sola oportunidad por usuario
- ✅ Notificaciones al participante

### 6. Sistema de Llamadas (Disciplina)
- ✅ Disponibilidad de mentores
- ✅ Reserva de llamadas
- ✅ Tracking de llamadas completadas/perdidas
- ✅ Comisiones para mentores

### 7. Gamificación
- ✅ Puntos Cuánticos (PC)
- ✅ Experiencia XP
- ✅ Niveles y rangos
- ✅ Colecciones y badges
- ✅ Arena (duelos entre usuarios)

---

## 🔧 ENDPOINTS API PRINCIPALES

### Coordinador
```
GET  /api/coordinador/dashboard-stats
GET  /api/coordinador/training-stats
GET  /api/coordinador/productos-activos
GET  /api/coordinador/backlogs-drops-stats
GET  /api/coordinador/backlogs-drops
POST /api/coordinador/training-stats (con widgetStatsDenominators)
```

### Participante
```
GET  /api/me/dashboard-stats
GET  /api/me/upgrade-advanced-info  // Panorama, precios, deadline
POST /api/me/pre-register-advanced
```

### School Admin
```
GET  /api/school-admin/visiones/[id]
POST /api/school-admin/visiones/[id]/update-attendance
GET  /api/school-admin/visiones/[id]/badges-pdf
POST /api/school-admin/visiones/[id]/start-training
POST /api/school-admin/visiones/[id]/finish-training
```

### El Cruce (Atravesar)
```
GET  /api/el-cruce/sessions
POST /api/el-cruce/sessions
POST /api/el-cruce/scan
```

---

## 📊 LÓGICA DE WIDGETS DECLARADOS/INSCRITOS

### Durante BÁSICO (antes de AVANZADO):
```typescript
// Declarados = preRegistrosAdvanced / inscritosBásico
// Inscritos = pagadosAdvanced / preRegistrosAdvanced

widgetStatsDenominators: {
  declaradosDenominator: basicEnrolledCount,
  inscritosDenominator: preRegistrosCount
}
```

### Durante AVANZADO (antes de PL):
```typescript
// Declarados = preRegistrosPL / inscritosAvanzado
// Inscritos = pagadosPL / preRegistrosPL

widgetStatsDenominators: {
  declaradosDenominator: advancedEnrolledCount,
  inscritosDenominator: preRegistrosPLCount
}
```

---

## 🎫 LÓGICA DE TICKETS BACKLOG/DROP

### Archivo: `/lib/backlog-ticket.ts`

```typescript
export type TicketReasonType = 'BACKLOG' | 'DROP';

export async function createBacklogTicket(
  userId: number,
  currentVisionId: number,
  organizationId: number,
  reasonType: TicketReasonType = 'BACKLOG'
): Promise<BacklogTicketResult>
```

**Reglas:**
1. Solo 1 ticket de cortesía por usuario (ya sea por BACKLOG o DROP)
2. El ticket NO es transferible
3. Se asigna al próximo básico disponible (o queda pendiente)
4. Válido por 1 año si está pendiente de asignar

---

## 💰 LÓGICA DE PRECIOS UPGRADE-ADVANCED

### Archivo: `/api/me/upgrade-advanced-info/route.ts`

**3 Panoramas:**
1. `BEFORE_BASIC_ENDS` - Antes de que termine el básico (promo activa)
2. `PROMO_ACTIVE` - Promo activa (hasta 8 PM del último día)
3. `NO_PROMO` - Sin promoción

**Precios de Apartado ($500):**
- Durante promo: Hoy = $500, Después = COMBO promo - $500
- Sin promo: Hoy = $500, Después = PL promo - $500

**Precios de Pago Completo:**
- Durante promo: COMBO promo ($9,000)
- Sin promo: COMBO base ($14,500)

---

## 📝 PENDIENTES POR DESARROLLAR

### Alta Prioridad
- [ ] Encuestas de cierre para Trainer y GameChanger
- [ ] Sistema de auditoría del Director
- [ ] Reportes financieros completos
- [ ] Integración completa con Stripe Connect

### Media Prioridad
- [ ] Chat IA mejorado
- [ ] Notificaciones push
- [ ] Exportación de datos a Excel
- [ ] Dashboard de métricas avanzadas

### Baja Prioridad
- [ ] App móvil nativa
- [ ] Integración con calendario externo
- [ ] Sistema de referidos mejorado

---

## 🔑 VARIABLES DE ENTORNO REQUERIDAS

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://tu-dominio.vercel.app
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET=...
OPENAI_API_KEY=...
```

---

## 📁 ARCHIVOS CLAVE PARA REFERENCIA

```
/lib/backlog-ticket.ts                           # Lógica BACKLOG/DROP
/app/api/me/upgrade-advanced-info/route.ts       # Precios upgrade
/app/api/coordinador/training-stats/route.ts     # Stats widgets
/app/api/school-admin/visiones/[id]/update-attendance/route.ts
/app/dashboard/coordinador-basico/page.tsx       # Dashboard coord
/app/dashboard/upgrade-advanced/page.tsx         # Página upgrade
/components/dashboard/BacklogsDropsWidget.tsx    # Widget nuevo
```

---

## 🚨 NOTAS IMPORTANTES

1. **Fechas**: El sistema usa `America/Mexico_City` timezone
2. **Promo deadline**: Se calcula como las 20:00 (8 PM) del `endDate` del básico
3. **Enrollments únicos**: `@@unique([userId, visionId, level])` en vision_enrollments
4. **Tickets SCHOLARSHIP**: Se usan para cortesía con `amountPaid = 0` y `paymentStatus = 'GIFT'`

---

## 🔄 COMANDOS FRECUENTES

```bash
# Desarrollo local
npm run dev

# Generar cliente Prisma después de cambios al schema
npx prisma generate

# Aplicar migraciones
npx prisma migrate dev

# Subir a producción
git add -A && git commit -m "descripción" && git push origin main

# Ver logs de Vercel
vercel logs
```

---

**Última actualización**: 15 de enero de 2026
**Versión del documento**: 1.0
