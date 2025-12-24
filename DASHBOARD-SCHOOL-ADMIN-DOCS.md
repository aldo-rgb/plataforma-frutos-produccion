# Dashboard SCHOOL_ADMIN - Documentación Completa

## 📋 Resumen de Implementación

Se ha rediseñado completamente el dashboard de SCHOOL_ADMIN para:
1. ✅ **Diseño moderno** similar al dashboard de ADMINISTRADOR
2. ✅ **Widget de pago prominente** para licencias pendientes
3. ✅ **Sistema de activación** de licencias post-pago

---

## 🎨 Características del Nuevo Dashboard

### 1. Diseño Visual
- **Glassmorphism UI** con gradientes purple/pink
- **KPI Cards** con iconos y métricas en tiempo real
- **Widget de pago animado** con efectos de pulse
- **Distribución responsive** (mobile-first)

### 2. Componentes Principales

#### A. Header
```typescript
- Logo de la organización
- Nombre del centro educativo
- Email del director
- Botón de descarga de reportes
```

#### B. Widget de Pago Pendiente
```typescript
- Muestra SOLO si: data.pendingPayment === true
- Lista de órdenes pendientes con:
  • Orden ID (8 primeros caracteres)
  • Cantidad de licencias
  • Tipo de tier (BASIC, PREMIUM, ELITE)
  • Monto total en USD
  • Estado (PENDIENTE)
- Botón CTA: "Proceder al Pago"
- Badge amarillo animado: "⚠️ ACCIÓN REQUERIDA"
- Mensaje de seguridad con Shield icon
```

#### C. KPI Cards (4 tarjetas)
1. **Estudiantes Totales**
   - Icon: Users (cyan)
   - Valor: Total de estudiantes
   - Trend: Activos vs inactivos

2. **Tasa de Cumplimiento**
   - Icon: Target (purple)
   - Valor: Porcentaje de cartas completadas
   - Trend: "Cartas y evidencias"

3. **Cartas Aprobadas**
   - Icon: CheckCircle (green)
   - Valor: Total aprobadas en el mes
   - Trend: "Total del mes"

4. **Créditos Disponibles**
   - Icon: Ticket (yellow/red)
   - Valor: Créditos disponibles
   - Trend: "⚠️ Pago pendiente" o "✅ Activos"

#### D. Distribución de Estudiantes
```typescript
- Gráfica de barras con 3 tiers
- Colores: BASIC (cyan), PREMIUM (purple), ELITE (yellow)
- Top 5 estudiantes por XP
- Leaderboard con badges numerados
```

#### E. Acciones Rápidas
```typescript
- "Comprar Licencias" → /licenses/request
- "Ver Créditos Disponibles"
- "Gestionar Estudiantes"
- "Reportes Analíticos"
```

---

## 🔌 API Endpoints

### 1. GET `/api/school-admin/dashboard`
**Descripción**: Retorna todos los datos del dashboard

**Auth**: SCHOOL_ADMIN role required

**Response**:
```json
{
  "organization": {
    "id": 1,
    "name": "Instituto XYZ",
    "contactEmail": "director@instituto.com"
  },
  "stats": {
    "totalStudents": 150,
    "totalMentors": 5,
    "totalUsers": 155,
    "availableCredits": 25,
    "totalPurchased": 200,
    "totalAllocated": 175
  },
  "pendingOrders": [
    {
      "id": "cuid123456",
      "quantity": 50,
      "tier": "PREMIUM",
      "amount": 2500.00,
      "paymentMethod": "stripe",
      "createdAt": "2024-01-15T10:30:00Z",
      "status": "PENDING",
      "paymentUrl": "https://checkout.stripe.com/..."
    }
  ],
  "completedOrders": [...],
  "pendingPayment": true,
  "tierDistribution": {
    "BASIC": 80,
    "PREMIUM": 50,
    "ELITE": 25
  },
  "topStudents": [
    {
      "id": 10,
      "nombre": "Juan Pérez",
      "experienciaXP": 15000,
      "tier": "ELITE"
    }
  ],
  "users": [...]
}
```

**Consultas SQL Realizadas**:
```sql
-- 1. Organization info con usuarios
SELECT * FROM Organization WHERE id = ? INCLUDE Usuario

-- 2. Pending orders
SELECT * FROM LicenseOrder 
WHERE organizationId = ? AND status = 'PENDING'
ORDER BY createdAt DESC

-- 3. School credits aggregate
SELECT SUM(totalPurchased), SUM(totalAllocated)
FROM SchoolCredit
WHERE organizationId = ? AND isActive = true

-- 4. Completed orders (last 5)
SELECT * FROM LicenseOrder
WHERE organizationId = ? AND status = 'COMPLETED'
ORDER BY paidAt DESC LIMIT 5
```

---

### 2. POST `/api/school-admin/licenses/request`
**Descripción**: Crea una orden de licencias y genera URL de pago

**Body**:
```json
{
  "quantity": 50,
  "tier": "PREMIUM",
  "paymentMethod": "stripe" | "paypal" | "mercadopago"
}
```

**Validaciones**:
- Quantity >= 50 (mínimo B2B)
- User.rol === 'SCHOOL_ADMIN'
- User.organizationId EXISTS

**Response**:
```json
{
  "success": true,
  "message": "Orden creada exitosamente",
  "order": {
    "id": "cuid123456",
    "quantity": 50,
    "tier": "PREMIUM",
    "amount": 2500.00,
    "paymentUrl": "https://checkout.stripe.com/..."
  }
}
```

**Flujo de Creación**:
1. Crear LicenseOrder con status='PENDING'
2. Llamar función de pasarela (createPayPalOrder, createStripeCheckout, createMercadoPagoPreference)
3. Guardar paymentUrl y externalPaymentId
4. Retornar orden + paymentUrl

---

### 3. GET `/api/school-admin/licenses/payment/success`
**Descripción**: Procesa el callback de éxito de pago

**Query Params**:
- `orderId` (required)
- `session_id` (Stripe)
- `payment_id` (Mercado Pago)
- `PayerID` (PayPal)

**Flujo**:
1. Buscar LicenseOrder por orderId
2. Verificar payment con API de la pasarela
3. Si verified:
   - Crear SchoolCredit con quantity
   - Update LicenseOrder: status='COMPLETED', creditsGenerated=true, paidAt=now()
   - Redirect: `/dashboard/school-admin?success=true&quantity=X&tier=Y`
4. Si failed:
   - Update LicenseOrder: status='FAILED'
   - Redirect: `/dashboard/school-admin?error=payment_failed`

**Verificación por Pasarela**:

**PayPal**:
```typescript
1. Get OAuth2 token
2. POST /v2/checkout/orders/{orderId}/capture
3. Verify status === 'COMPLETED'
```

**Stripe**:
```typescript
1. stripe.checkout.sessions.retrieve(sessionId)
2. Verify payment_status === 'paid'
```

**Mercado Pago**:
```typescript
1. GET /v1/payments/{paymentId}
2. Verify status === 'approved'
```

---

## 💾 Modelos de Base de Datos

### LicenseOrder
```prisma
model LicenseOrder {
  id                 String              @id @default(cuid())
  organizationId     Int
  requestedBy        Int                 // SCHOOL_ADMIN user ID
  quantity           Int
  tier               UserTier
  amount             Float               // USD
  paymentMethod      String              // 'paypal', 'stripe', 'mercadopago'
  status             LicenseOrderStatus  // PENDING, COMPLETED, FAILED...
  externalPaymentId  String?             // PayPal order ID, Stripe session ID, MP preference ID
  paymentUrl         String?             // Redirect URL for payment
  paidAt             DateTime?
  paymentData        Json?               // Full payment response
  creditsGenerated   Boolean             @default(false)
  creditsGeneratedAt DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt

  Organization       Organization        @relation(fields: [organizationId], references: [id])
  RequestedBy        Usuario             @relation(fields: [requestedBy], references: [id])
}

enum LicenseOrderStatus {
  PENDING
  PROCESSING
  COMPLETED
  FAILED
  CANCELLED
  REFUNDED
}
```

### SchoolCredit
```prisma
model SchoolCredit {
  id             Int          @id @default(autoincrement())
  organizationId Int
  planType       UserTier
  totalPurchased Int          // Total licencias compradas
  totalAllocated Int          // Total licencias ya convertidas en License
  unitPrice      Float
  totalPaid      Float
  isActive       Boolean      @default(true)
  paymentMethod  String?
  notes          String?
  createdAt      DateTime     @default(now())
  updatedAt      DateTime     @updatedAt

  Organization   Organization @relation(fields: [organizationId], references: [id])
}
```

---

## 🎯 Flujo Completo del Sistema

### 1. SCHOOL_ADMIN Inicia Sesión
```
1. Login → Verifica rol === 'SCHOOL_ADMIN'
2. Redirect → /dashboard/school-admin
3. Fetch → GET /api/school-admin/dashboard
4. Render → Dashboard con todos los datos
```

### 2. Dashboard Muestra Pago Pendiente
```
IF pendingPayment === true:
  - Widget de pago aparece ARRIBA de KPIs
  - Lista de pendingOrders con detalles
  - Badge "⚠️ ACCIÓN REQUERIDA" con pulse animation
  - Botón CTA: "Proceder al Pago"
```

### 3. Director Solicita Más Licencias
```
1. Click → "Comprar Licencias" o "Proceder al Pago"
2. Navigate → /dashboard/school-admin/licenses/request
3. Form:
   - Quantity (min: 50)
   - Tier (BASIC, PREMIUM, ELITE)
   - Payment Method (PayPal, Stripe, Mercado Pago)
4. Submit → POST /api/school-admin/licenses/request
5. Response → { paymentUrl }
6. Redirect → paymentUrl (external payment gateway)
```

### 4. Director Completa el Pago
```
1. User → Completa pago en PayPal/Stripe/Mercado Pago
2. Gateway → Redirect to success URL:
   /api/school-admin/licenses/payment/success?orderId=X&[gateway_params]
3. Backend:
   - Verify payment with gateway API
   - Create SchoolCredit record
   - Update LicenseOrder: status='COMPLETED', creditsGenerated=true
4. Redirect → /dashboard/school-admin?success=true&quantity=X&tier=Y
```

### 5. Dashboard Muestra Confirmación
```
1. Dashboard detecta ?success=true en URL
2. Muestra notificación verde: "✅ ¡Pago exitoso! Se han activado X licencias Y"
3. Widget de pago pendiente DESAPARECE
4. KPI "Créditos Disponibles" actualiza a nuevo valor
5. After 5s → Clear query params, hide notification
```

---

## 🎨 Estilos y Animaciones

### Colores del Dashboard
```css
/* Background gradients */
from-slate-950 via-slate-900 to-slate-950

/* Payment widget */
from-purple-900/50 via-pink-900/30 to-slate-900
border-purple-500/50

/* KPI Cards */
- Cyan: text-cyan-400, bg-cyan-500/10
- Purple: text-purple-400, bg-purple-500/10
- Green: text-green-400, bg-green-500/10
- Yellow: text-yellow-400, bg-yellow-500/10
- Red: text-red-400, bg-red-500/10

/* CTA Button */
bg-gradient-to-r from-purple-600 to-pink-600
shadow-lg shadow-purple-500/50
```

### Animaciones
```css
/* Badge pulse */
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

/* Glow effect */
.glow {
  box-shadow: 0 0 20px rgba(168, 85, 247, 0.4);
}

/* Hover transitions */
transition-all duration-300 ease-in-out
```

---

## 🔒 Seguridad y Validaciones

### Authorization
```typescript
// Middleware en cada endpoint
const session = await getServerSession(authOptions);
if (!session || session.user.rol !== 'SCHOOL_ADMIN') {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}
```

### Business Rules
1. **Minimum Purchase**: 50 licencias (B2B model)
2. **Payment Verification**: Siempre verificar con API de la pasarela
3. **Idempotency**: No procesar orden ya COMPLETED
4. **Credit Generation**: Automático después de pago verificado
5. **License Activation**: Creditos disponibles para generar License records

### Error Handling
```typescript
try {
  // Operation
} catch (error) {
  console.error('[CONTEXT] Error:', error);
  return NextResponse.json({ 
    error: 'User-friendly message' 
  }, { status: 500 });
}
```

---

## 📊 KPIs y Métricas

### Dashboard Metrics
1. **Estudiantes Totales**: COUNT(Usuario WHERE rol='ESTUDIANTE')
2. **Estudiantes Activos**: COUNT(Usuario WHERE isActive=true)
3. **Tasa de Cumplimiento**: (Cartas Aprobadas / Total Cartas) * 100
4. **Cartas Aprobadas**: COUNT(CartaFrutos WHERE estado='APROBADA')
5. **Créditos Disponibles**: SUM(totalPurchased - totalAllocated)

### Order Metrics
- **Pending Orders**: COUNT(LicenseOrder WHERE status='PENDING')
- **Completed Orders**: COUNT(LicenseOrder WHERE status='COMPLETED')
- **Total Revenue**: SUM(LicenseOrder.amount WHERE status='COMPLETED')
- **Average Order Value**: AVG(LicenseOrder.amount)

---

## 🧪 Testing Checklist

### Frontend
- [ ] Dashboard carga correctamente
- [ ] Widget de pago solo aparece si hay pending orders
- [ ] KPI cards muestran datos reales
- [ ] Top students ordenados por XP
- [ ] Tier distribution suma 100%
- [ ] Notificación de éxito aparece y desaparece
- [ ] Responsive design funciona en mobile

### Backend
- [ ] GET /dashboard retorna datos correctos
- [ ] POST /licenses/request crea orden correctamente
- [ ] Payment URLs se generan para las 3 pasarelas
- [ ] GET /payment/success verifica pagos
- [ ] SchoolCredit se crea automáticamente
- [ ] LicenseOrder actualiza a COMPLETED
- [ ] Redirect URLs contienen query params correctos

### Payment Gateways
- [ ] PayPal sandbox order creation
- [ ] Stripe test mode checkout
- [ ] Mercado Pago test credentials
- [ ] Payment verification APIs funcionan
- [ ] Capture/approve payments correctamente

---

## 🚀 Deployment Notes

### Environment Variables Required
```bash
# PayPal
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=sandbox # or production

# Stripe
STRIPE_SECRET_KEY=
STRIPE_PUBLISHABLE_KEY=

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=
MERCADOPAGO_PUBLIC_KEY=

# Next Auth
NEXTAUTH_URL=https://yourdomain.com
NEXTAUTH_SECRET=

# Database
DATABASE_URL=
```

### Pre-Launch Checklist
1. [ ] Cambiar PAYPAL_MODE a 'production'
2. [ ] Usar Stripe production keys
3. [ ] Usar Mercado Pago production credentials
4. [ ] Verificar NEXTAUTH_URL apunta a dominio correcto
5. [ ] Test complete purchase flow en production
6. [ ] Monitor logs de pagos
7. [ ] Setup Stripe webhooks para async notifications
8. [ ] Setup PayPal IPN/webhooks
9. [ ] Setup Mercado Pago webhooks

---

## 📝 TODO / Future Improvements

### High Priority
- [ ] Implement webhooks para confirmación asíncrona de pagos
- [ ] Add refund functionality
- [ ] Email notifications on payment success/failure
- [ ] CSV export de estudiantes y métricas
- [ ] Filtros y búsqueda en listado de estudiantes

### Medium Priority
- [ ] Payment retry logic para failed orders
- [ ] Invoice generation (PDF) para completed orders
- [ ] Multi-currency support
- [ ] Subscription model (recurring payments)
- [ ] Payment plans (cuotas/installments)

### Low Priority
- [ ] Dashboard customization (color themes)
- [ ] Advanced analytics (charts, trends)
- [ ] Comparison reports (mes a mes)
- [ ] Export reports to Excel/PDF
- [ ] Integration with accounting software

---

## 🆘 Troubleshooting

### Dashboard no muestra pending orders
```bash
# Verificar que existen órdenes PENDING
psql> SELECT * FROM "LicenseOrder" WHERE status = 'PENDING';

# Check API response
curl -H "Cookie: next-auth.session-token=..." \
  http://localhost:3000/api/school-admin/dashboard
```

### Payment verification falla
```bash
# Check environment variables
echo $STRIPE_SECRET_KEY
echo $PAYPAL_CLIENT_ID
echo $MERCADOPAGO_ACCESS_TOKEN

# Test API credentials
curl -u "$PAYPAL_CLIENT_ID:$PAYPAL_SECRET" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -d "grant_type=client_credentials"
```

### Credits not generated after payment
```bash
# Check LicenseOrder status
psql> SELECT id, status, creditsGenerated FROM "LicenseOrder" WHERE id = 'XXX';

# Check SchoolCredit created
psql> SELECT * FROM "SchoolCredit" 
      WHERE organizationId = X 
      ORDER BY createdAt DESC LIMIT 5;

# Manually generate credits if needed
psql> INSERT INTO "SchoolCredit" (organizationId, planType, totalPurchased, totalAllocated, unitPrice, totalPaid, isActive, paymentMethod)
      VALUES (X, 'PREMIUM', 50, 0, 50.0, 2500.0, true, 'stripe');
```

---

## 📞 Support

Para issues o preguntas:
- GitHub Issues: [repo]/issues
- Email: support@plataforma-frutos.com
- Docs: /docs/school-admin-dashboard

---

**Última actualización**: 2024-01-XX
**Versión**: 1.0.0
**Autor**: Development Team
