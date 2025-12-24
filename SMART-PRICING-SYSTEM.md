# 💰 SMART PRICING & SCHOOL LIFECYCLE SYSTEM

Sistema completo de precios individuales y licencias escolares con retención automática.

---

## 📋 ARQUITECTURA DEL SISTEMA

### 🎯 3 Esquemas de Precios

#### 1. **Planes Mensuales** (Precio "Ancla")
- **STANDARD**: $99 MXN/mes
  - Equivalente anual: $1,188 MXN
- **PREMIUM**: $299 MXN/mes  
  - Equivalente anual: $3,588 MXN

#### 2. **Planes Anuales** (¡Oferta Imperdible!)
- **STANDARD**: $800 MXN/año
  - Ahorro: $388 MXN (32%)
  - Equivalente: $66.67/mes
- **PREMIUM**: $2,500 MXN/año
  - Ahorro: $1,088 MXN (30%)
  - Equivalente: $208.33/mes

#### 3. **Licencias Escolares** (B2B Configurable)
- Precio **CONFIGURABLE** por escuela
- Default: $600 (Standard) / $1,250 (Premium)
- Duración: **Ciclo de Visión** (configurable en meses)

---

## 🏫 LICENCIAS ESCOLARES

### Configuración por Organización

Cada escuela puede tener precios personalizados:

```typescript
{
  standardLicensePrice: 600.00,    // Negociable
  premiumLicensePrice: 1250.00,    // Negociable
  visionCycleDuration: 6,          // Meses (ej: semestre)
  renewalOfferEnabled: true,       // Activar retention loop
  renewalOfferDiscount: 50.00      // % descuento post-visión
}
```

### Panel de Admin

Ubicación: `/admin/school-licenses`

**Componente**: `SchoolLicenseConfigPanel.tsx`

**Funcionalidades**:
- Configurar precios por escuela
- Definir duración del ciclo
- Activar/desactivar oferta de renovación
- Ver proyecciones de ingresos

---

## 🔄 RETENTION LOOP (Oferta de Renovación)

### El Flujo

1. **Trigger**: 15 días antes de que expire la licencia escolar
2. **Sistema Crea Oferta**: Automáticamente via cron job
3. **Usuario Recibe Modal**: Con 50% de descuento
4. **Decisión**:
   - ✅ **Acepta**: Se convierte en usuario SOLITARIO con descuento
   - ❌ **Rechaza**: Downgrade a FREE (mantiene historial)

### Oferta de Renovación

**Para Ex-Alumnos de Escuelas:**

| Tier | Precio Público | Precio Post-Visión | Ahorro |
|------|---------------|-------------------|--------|
| Standard | $800/año | **$400/año** | $400 (50%) |
| Premium | $2,500/año | **$1,250/año** | $1,250 (50%) |

**Mensaje**:
> "¡Hola [Nombre]! Tu ciclo de visión en [Escuela] está terminando.  
> No pierdas tu ritmo. Continúa por solo $400 tu primer año."

---

## 📊 SCHEMA DE BASE DE DATOS

### Modelos Nuevos

#### `Subscription`
```prisma
model Subscription {
  id                    Int                @id @default(autoincrement())
  userId                Int
  plan                  SubscriptionPlan   // MONTHLY_STANDARD, ANNUAL_PREMIUM, etc.
  status                String             // ACTIVE, CANCELLED, EXPIRED
  
  basePrice             Float              // Precio base
  finalPrice            Float              // Precio con descuentos
  discount              Float              // % descuento aplicado
  isPostVisionDiscount  Boolean            // ¿Descuento ex-alumno?
  
  startDate             DateTime
  endDate               DateTime
  nextBillingDate       DateTime?
  
  originalOrganization  String?            // Escuela de origen
  renewalCount          Int                @default(0)
  
  Payments              Payment[]
  RenewalOffers         RenewalOffer[]
}
```

#### `Payment`
```prisma
model Payment {
  id                Int             @id @default(autoincrement())
  subscriptionId    Int?
  userId            Int
  organizationId    Int?            // Si es pago de escuela
  
  amount            Float
  currency          String          @default("MXN")
  status            PaymentStatus   // PENDING, COMPLETED, FAILED, REFUNDED
  paymentMethod     String?         // stripe, paypal, transfer
  transactionId     String?         // ID del gateway
  
  isRenewal         Boolean         @default(false)
  isSchoolPayment   Boolean         @default(false)
}
```

#### `RenewalOffer`
```prisma
model RenewalOffer {
  id                Int             @id @default(autoincrement())
  subscriptionId    Int
  userId            Int
  
  originalPrice     Float
  offeredPrice      Float           // Con 50% descuento
  discountPercent   Float           @default(50.00)
  
  status            RenewalStatus   // OFFERED, ACCEPTED, DECLINED, EXPIRED
  offeredAt         DateTime        @default(now())
  expiresAt         DateTime        // +15 días
  respondedAt       DateTime?
  
  message           String
}
```

### Campos Nuevos en `Usuario`

```prisma
subscriptionPlan          SubscriptionPlan?   // Plan actual
subscriptionStartDate     DateTime?
subscriptionEndDate       DateTime?
isPostVisionUser          Boolean            @default(false)
renewalOfferShown         Boolean            @default(false)
lastRenewalOfferDate      DateTime?
originalOrganizationId    Int?               // ID de escuela de origen
```

### Campos Nuevos en `Organization`

```prisma
standardLicensePrice      Float              @default(600.00)
premiumLicensePrice       Float              @default(1250.00)
visionCycleDuration       Int                @default(6)      // meses
renewalOfferEnabled       Boolean            @default(true)
renewalOfferDiscount      Float              @default(50.00)  // %
```

---

## 🚀 API ENDPOINTS

### Suscripciones

#### `POST /api/subscriptions/create`
Crear nueva suscripción individual

**Body**:
```json
{
  "plan": "ANNUAL_STANDARD",
  "isPostVisionDiscount": true
}
```

#### `GET /api/subscriptions/renewal-offer`
Obtener oferta de renovación activa

#### `POST /api/subscriptions/renewal-offer`
Generar oferta de renovación (admin)

#### `PUT /api/subscriptions/renewal-offer`
Aceptar/rechazar oferta de renovación

**Body**:
```json
{
  "renewalOfferId": 123,
  "acceptOffer": true
}
```

### Pagos

#### `POST /api/payments/process`
Procesar un pago

**Body**:
```json
{
  "amount": 800,
  "subscriptionId": 123,
  "paymentMethod": "stripe",
  "isRenewal": false
}
```

#### `GET /api/payments/process`
Obtener historial de pagos del usuario

### Admin - Organizaciones

#### `GET /api/admin/organizations`
Listar todas las organizaciones

#### `GET /api/admin/organizations/[id]/config`
Obtener configuración de una escuela

#### `PUT /api/admin/organizations/[id]/config`
Actualizar configuración de precios de escuela

**Body**:
```json
{
  "standardLicensePrice": 600,
  "premiumLicensePrice": 1250,
  "visionCycleDuration": 6,
  "renewalOfferEnabled": true,
  "renewalOfferDiscount": 50
}
```

---

## 🎨 COMPONENTES FRONTEND

### `PricingTable.tsx`
Tabla comparativa de precios con toggle Mensual/Anual

**Ubicación**: `/src/components/pricing/PricingTable.tsx`

**Props**:
```typescript
interface PricingTableProps {
  onSelectPlan?: (plan) => void;
  showPostVisionDiscount?: boolean;  // Mostrar precio con 50% OFF
}
```

### `RenewalOfferModal.tsx`
Modal de oferta de renovación (Retention Loop)

**Ubicación**: `/src/components/pricing/RenewalOfferModal.tsx`

**Props**:
```typescript
interface RenewalOfferModalProps {
  userId: number;
  onAccept?: () => void;
  onDecline?: () => void;
}
```

### `SchoolLicenseConfigPanel.tsx`
Panel de configuración de licencias escolares (Admin)

**Ubicación**: `/src/components/admin/SchoolLicenseConfigPanel.tsx`

---

## ⚙️ CRON JOB: Retention Loop Automático

### Script
**Ubicación**: `/scripts/generate-renewal-offers.js`

### Ejecución Sugerida
```bash
# Diario a las 08:00 AM
0 8 * * * node scripts/generate-renewal-offers.js
```

### Funcionalidades

1. **Detectar Expiraciones**: Licencias que expiran en 15 días
2. **Crear Ofertas**: Automáticamente con 50% descuento
3. **Marcar Expiradas**: Ofertas que pasaron de fecha
4. **Downgrade Automático**: Usuarios con licencias vencidas → FREE

### Ejecución Manual
```bash
node scripts/generate-renewal-offers.js
```

---

## 📈 FLUJOS COMPLETOS

### Flujo 1: Usuario Individual Compra Plan Anual

1. Usuario ve `PricingTable` con toggle Mensual/Anual
2. Selecciona **ANNUAL_STANDARD** ($800)
3. `POST /api/subscriptions/create`
4. Sistema crea `Subscription` + actualiza `Usuario.tier`
5. `POST /api/payments/process` (integración Stripe)
6. Usuario accede a features de STANDARD

### Flujo 2: Escuela Compra Licencias

1. Admin crea organización en sistema
2. Admin configura precios via `SchoolLicenseConfigPanel`
   - Standard: $600/licencia
   - Premium: $1,250/licencia
   - Ciclo: 6 meses
3. Admin genera códigos de licencia
4. Estudiantes canjean códigos
5. Sistema asigna `tier` + `subscriptionEndDate` (ciclo + 6 meses)

### Flujo 3: Retention Loop (Post-Visión)

1. **Día -15**: Cron job detecta licencia próxima a expirar
2. **Crear Oferta**: Sistema crea `RenewalOffer` con 50% OFF
3. **Notificación**: Usuario ve `RenewalOfferModal` al login
4. **Decisión**:
   - ✅ **Acepta**: Nueva `Subscription` con `finalPrice = $400`
   - ❌ **Rechaza**: `Usuario.tier = FREE` (mantiene historial)

---

## 🔐 MIGRACIÓN DE BASE DE DATOS

### Comandos

```bash
# 1. Actualizar schema
npx prisma db push

# 2. Generar Prisma Client
npx prisma generate

# 3. Backup antes de cambios
node scripts/backup-database.js --output=./backups/pre-pricing-system.json.gz

# 4. Verificar migración
npx prisma studio
```

---

## 🧪 TESTING

### Tests Recomendados

1. **Crear Suscripción Individual**
```bash
curl -X POST http://localhost:3000/api/subscriptions/create \
  -H "Content-Type: application/json" \
  -d '{"plan": "ANNUAL_STANDARD"}'
```

2. **Generar Oferta de Renovación**
```bash
node scripts/generate-renewal-offers.js
```

3. **Configurar Licencia Escolar**
- Login como admin
- Ir a `/admin/school-licenses`
- Seleccionar organización
- Modificar precios y guardar

---

## 📚 REFERENCIAS

### Tipos TypeScript
`/src/types/pricing.ts`

### Constantes de Precios
```typescript
import { PRICING, POST_VISION_RENEWAL } from '@/types/pricing';
```

### Funciones Utilidad
```typescript
import { 
  getPlanPrice, 
  calculateDiscount,
  getPostVisionPrice 
} from '@/types/pricing';
```

---

## 🎯 COPY MARKETING

### Tabla de Precios

**Header**: "Elige tu Plan de Transformación"  
**Subheader**: "Invierte en tu futuro. Menos de lo que cuesta un café al día."

**Badges**:
- Standard: "Más Popular"
- Premium: "Salto Cuántico"

**CTA Anual**: "Ahorra hasta 32%"

### Modal de Renovación

**Título**: "¡No Pierdas Tu Ritmo!"  
**Mensaje**: "Tu ciclo de visión en [Escuela] está terminando. Continúa por solo $400 tu primer año."

**Copy Secundario**: "Mantén todo tu progreso, badges y metas activas."

---

## ✅ CHECKLIST DE IMPLEMENTACIÓN

- [x] Schema de Prisma actualizado
- [x] Tipos TypeScript creados
- [x] API Routes implementadas
- [x] Componente PricingTable
- [x] Componente RenewalOfferModal
- [x] Panel de Admin (SchoolLicenseConfigPanel)
- [x] Cron Job de Retention Loop
- [ ] Integración con Stripe/PayPal
- [ ] Sistema de notificaciones (email/push)
- [ ] Tests unitarios
- [ ] Tests de integración
- [ ] Documentación de deployment

---

## 🚀 DEPLOYMENT

### Variables de Entorno Necesarias

```env
# Stripe (opcional por ahora)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...

# Base de datos
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
```

### Configuración de Cron Job (Producción)

**Vercel** (con Vercel Cron):
```json
// vercel.json
{
  "crons": [{
    "path": "/api/cron/renewal-offers",
    "schedule": "0 8 * * *"
  }]
}
```

**PM2** (con ecosystem.config.js):
```javascript
module.exports = {
  apps: [{
    name: 'renewal-cron',
    script: './scripts/generate-renewal-offers.js',
    cron_restart: '0 8 * * *'
  }]
};
```

---

## 📞 SOPORTE

Para preguntas sobre el sistema de precios:
- Ver documentación en `/docs/pricing-system.md`
- Revisar tipos en `/src/types/pricing.ts`
- Consultar ejemplos en componentes

---

**Versión**: 1.0.0  
**Última Actualización**: 23 de diciembre de 2025  
**Autor**: Sistema Plataforma Frutos
