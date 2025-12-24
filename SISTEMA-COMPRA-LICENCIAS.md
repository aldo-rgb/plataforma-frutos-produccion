# Sistema de Compra de Licencias B2B

## 📋 Descripción

Sistema completo de compra de licencias para directores de organizaciones (SCHOOL_ADMIN) con integración de pasarelas de pago múltiples.

## 🎯 Flujo Completo

### 1. Solicitud de Licencias (Director)

El director accede a su dashboard y puede:
- Ver licencias disponibles actuales
- Hacer clic en **"Solicitar Licencias"**
- Seleccionar:
  - Cantidad (mínimo 50 licencias)
  - Tipo de plan (STANDARD $50, PREMIUM $100, ELITE $200 USD por licencia)
  - Método de pago (PayPal, Stripe, Mercado Pago)

### 2. Generación de Orden de Pago

El sistema crea una `LicenseOrder` con:
- Estado: `PENDING`
- Información de la compra
- URL de pago de la pasarela seleccionada

### 3. Redirección a Pasarela

El director es redirigido automáticamente a:
- **PayPal**: Checkout de PayPal
- **Stripe**: Checkout de Stripe
- **Mercado Pago**: Checkout de Mercado Pago

### 4. Confirmación de Pago

Después del pago exitoso:
1. La pasarela redirige a: `/api/school-admin/licenses/payment/success?orderId=xxx`
2. El sistema verifica el pago con la API de la pasarela
3. Si es exitoso:
   - Actualiza `LicenseOrder.status` a `COMPLETED`
   - Genera `SchoolCredit` automáticamente con las licencias compradas
   - Marca `creditsGenerated = true`

### 5. Uso de Créditos

El ADMINISTRADOR ahora puede:
- Generar licencias SIN validación de créditos previos
- Los créditos ya están disponibles en `SchoolCredit`
- El COORDINADOR puede convertir créditos en códigos de licencia

## 🔧 Configuración

### Variables de Entorno Requeridas

```bash
# PayPal
PAYPAL_CLIENT_ID="your-paypal-client-id"
PAYPAL_SECRET="your-paypal-secret"
PAYPAL_MODE="sandbox" # sandbox o production

# Stripe
STRIPE_SECRET_KEY="sk_test_..."
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN="APP_USR-..."
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY="APP_USR-..."

# Next.js
NEXTAUTH_URL="http://localhost:3000" # URL de tu aplicación
```

### Instalación de Dependencias

```bash
npm install stripe @stripe/stripe-js
```

## 📊 Modelo de Datos

### LicenseOrder

```prisma
model LicenseOrder {
  id                 String              @id @default(cuid())
  organizationId     Int
  requestedBy        Int                 // SCHOOL_ADMIN que solicitó
  quantity           Int                 // Cantidad de licencias
  tier               UserTier            // STANDARD, PREMIUM, ELITE
  amount             Float               // Monto total en USD
  paymentMethod      String              // 'paypal', 'stripe', 'mercadopago'
  status             LicenseOrderStatus  // PENDING, COMPLETED, FAILED...
  externalPaymentId  String?             // ID en la pasarela
  paymentUrl         String?             // URL de pago
  paidAt             DateTime?
  paymentData        Json?
  creditsGenerated   Boolean             @default(false)
  creditsGeneratedAt DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
}
```

### Estados de Orden

- `PENDING`: Orden creada, esperando pago
- `PROCESSING`: Pago en verificación
- `COMPLETED`: Pago confirmado, créditos generados
- `FAILED`: Pago fallido
- `CANCELLED`: Orden cancelada
- `REFUNDED`: Orden reembolsada

## 🛣️ Rutas de API

### POST `/api/school-admin/licenses/request`

Crea una orden de pago y genera URL de pasarela.

**Body:**
```json
{
  "quantity": 100,
  "tier": "STANDARD",
  "paymentMethod": "paypal",
  "organizationId": 3
}
```

**Response:**
```json
{
  "success": true,
  "orderId": "clx123abc",
  "paymentUrl": "https://www.paypal.com/checkoutnow?token=xxx",
  "amount": 5000
}
```

### GET `/api/school-admin/licenses/payment/success`

Endpoint de confirmación después del pago.

**Query Params:**
- `orderId`: ID de la orden
- `session_id`: (Stripe) ID de sesión
- `payment_id`: (Mercado Pago) ID de pago
- `PayerID`: (PayPal) ID del pagador

## 🎨 Páginas Frontend

### `/dashboard/school-admin/licenses/request`

Formulario de solicitud de licencias con:
- Selector de cantidad (mínimo 50)
- Selector de tier (STANDARD, PREMIUM, ELITE)
- Selector de método de pago (PayPal, Stripe, Mercado Pago)
- Resumen de compra
- Botón "Proceder al Pago"

### `/dashboard/school-admin`

Dashboard del director con:
- **Botón nuevo**: "Solicitar Licencias" (morado, prominente)
- KPIs de la organización
- Licencias disponibles actuales

## 🔒 Seguridad

- ✅ Autenticación requerida (SCHOOL_ADMIN)
- ✅ Validación de organización
- ✅ Verificación de pago con API de pasarelas
- ✅ Generación atómica de créditos
- ✅ Transacciones de base de datos
- ✅ Manejo de errores y rollback

## 📈 Métricas y Tracking

El sistema registra:
- `LicenseOrder.createdAt`: Cuándo se solicitó
- `LicenseOrder.paidAt`: Cuándo se pagó
- `LicenseOrder.paymentData`: Datos del pago (JSON)
- `SchoolCredit.totalPurchased`: Licencias compradas
- `SchoolCredit.unitPrice`: Precio unitario pactado

## 🚀 Testing

### Modo Sandbox (Desarrollo)

**PayPal Sandbox:**
- URL: https://developer.paypal.com/
- Usar cuentas de prueba
- `PAYPAL_MODE="sandbox"`

**Stripe Test Mode:**
- Tarjeta de prueba: `4242 4242 4242 4242`
- Cualquier fecha futura
- Cualquier CVC

**Mercado Pago Sandbox:**
- URL: https://www.mercadopago.com.mx/developers/
- Usar cuentas de prueba
- Tarjetas de prueba disponibles en docs

## 📝 Notas Importantes

1. **Mínimo 50 licencias**: Política de negocio B2B
2. **Precios en USD**: Todos los montos en dólares
3. **Generación automática**: Los créditos se crean inmediatamente después del pago
4. **Sin validación previa**: ADMINISTRADOR puede generar licencias sin créditos previos
5. **Múltiples pasarelas**: Flexibilidad para el cliente

## 🔄 Flujo de Reembolsos (Futuro)

Para implementar reembolsos:
1. Cambiar `LicenseOrder.status` a `REFUNDED`
2. Marcar `SchoolCredit.isActive = false`
3. Procesar reembolso en la pasarela correspondiente

## 📞 Soporte

Para problemas con pagos, revisar:
- Logs de la orden en `LicenseOrder.paymentData`
- Estado en `LicenseOrder.status`
- Verificar configuración de pasarelas en `.env`
- Revisar logs de webhook (si aplica)
