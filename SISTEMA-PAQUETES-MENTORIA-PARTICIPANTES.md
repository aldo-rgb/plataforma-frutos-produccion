# 💼 Sistema de Compra de Paquetes de Mentoría - Participantes

## 📋 Descripción General

Sistema completo para que los participantes puedan seleccionar un mentor y comprar un paquete de 18 sesiones personalizadas con integración de pasarelas de pago (PayPal, Stripe, MercadoPago).

## 🎯 Flujo Completo

### 1. Usuario sin Mentor Asignado

El participante accede a `/dashboard/program/enroll` y el sistema detecta que no tiene mentor asignado:

```
Usuario → Dashboard → Program Enroll
  ↓
Sistema detecta: assignedMentorId === null
  ↓
Muestra mensaje con dos opciones:
  - Ver Licencias (planes STANDARD/PREMIUM)
  - Seleccionar Mentor (comprar paquete 18 sesiones)
```

### 2. Selección de Mentor

Al hacer clic en "Seleccionar Mentor":

```
Redirige a: /dashboard/participante/seleccionar-mentor/[visionId]
  ↓
Carga catálogo de mentores certificados disponibles
  ↓
Muestra:
  - Foto del mentor
  - Nombre y especialidad
  - Calificación y reseñas
  - Sesiones completadas
  - Nivel (JUNIOR/SENIOR/MASTER)
  - Precio del paquete (18 sesiones)
```

### 3. Proceso de Compra

```
Usuario selecciona mentor
  ↓
Se muestra pantalla de confirmación con:
  - Resumen del mentor seleccionado
  - Detalle del paquete (18 sesiones)
  - Precio total
  - Métodos de pago disponibles
  ↓
Usuario selecciona método de pago:
  - Stripe (Tarjeta de crédito/débito)
  - PayPal
  - Mercado Pago
  ↓
Click en "Proceder al Pago Seguro"
  ↓
Sistema crea orden (MentorPackageOrder)
  ↓
Genera URL de pasarela de pago
  ↓
Redirige a pasarela externa
  ↓
Usuario completa el pago
  ↓
Pasarela redirige a: /api/participante/payment-success
  ↓
Sistema verifica pago
  ↓
Actualiza orden a COMPLETED
  ↓
Asigna mentor al usuario (assignedMentorId)
  ↓
Crea/actualiza ProgramEnrollment
  ↓
Redirige a dashboard con mensaje de éxito
```

## 🗂️ Estructura de Archivos

### Páginas

- **`/app/dashboard/participante/seleccionar-mentor/[visionId]/page.tsx`**
  - Catálogo de mentores disponibles
  - Pantalla de confirmación y pago
  - Selección de método de pago

### APIs

- **`/app/api/participante/mentores-disponibles/route.ts`**
  - GET: Obtiene lista de mentores certificados
  - Filtra por disponibilidad y estado activo
  - Ordena por calificación

- **`/app/api/participante/crear-orden-paquete/route.ts`**
  - POST: Crea orden de compra
  - Valida datos del mentor y visión
  - Genera registro en MentorPackageOrder

- **`/app/api/participante/procesar-pago-paquete/route.ts`**
  - POST: Procesa el pago según método seleccionado
  - Integración con PayPal, Stripe, MercadoPago
  - Genera URL de checkout

- **`/app/api/participante/payment-success/route.ts`**
  - GET: Endpoint de callback después del pago
  - Verifica el pago con la pasarela
  - Actualiza orden a COMPLETED
  - Asigna mentor al usuario

## 💾 Base de Datos

### Modelo: MentorPackageOrder

```prisma
model MentorPackageOrder {
  id                  String                @id @default(cuid())
  usuarioId           Int                   // Participante
  mentorId            Int                   // Mentor seleccionado
  visionId            Int                   // Visión asociada
  organizationId      Int?                  
  cantidad            Int                   // 18 sesiones
  precioUnitario      Int                   
  precioTotal         Int                   
  currency            String                @default("MXN")
  metodoPago          String                
  status              PackageOrderStatus    @default(PENDING)
  externalPaymentId   String?               
  paymentUrl          String?               
  paidAt              DateTime?             
  paymentData         Json?                 
  sessionScheduled    Boolean               @default(false)
  sessionsScheduledAt DateTime?
  createdAt           DateTime              @default(now())
  updatedAt           DateTime              @updatedAt
  
  Usuario             Usuario               @relation(...)
  Mentor              Usuario               @relation(...)
  Vision              Vision                @relation(...)
  Organization        Organization?         @relation(...)
}

enum PackageOrderStatus {
  PENDING       // Orden creada, esperando pago
  PROCESSING    // Procesando pago
  COMPLETED     // Pago exitoso, mentor asignado
  FAILED        // Pago fallido
  CANCELLED     // Orden cancelada
  REFUNDED      // Reembolsado
}
```

## 💰 Configuración de Precios

El precio del paquete de 18 sesiones se calcula automáticamente:

```javascript
// Obtiene precio por sesión desde /api/admin/precios
const precioPorSesion = data.disciplina?.mxn?.llamada || 150;

// Calcula precio del paquete
const precio18Sesiones = precioPorSesion * 18; // = 2,700 MXN
```

**Administrador puede modificar el precio base en:**
- `/dashboard/admin/precios` → Sección "Disciplina" → Precio por Llamada

## 🔐 Pasarelas de Pago

### PayPal

```javascript
// Variables de entorno requeridas
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=sandbox // o production

// URL de retorno
NEXTAUTH_URL/api/participante/payment-success?orderId={id}
```

### Stripe

```javascript
// Variables de entorno requeridas
STRIPE_SECRET_KEY=sk_test_...

// Webhook para notificaciones asíncronas (opcional)
STRIPE_WEBHOOK_SECRET=
```

### Mercado Pago

```javascript
// Variables de entorno requeridas
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=

// URL de retorno
NEXTAUTH_URL/api/participante/payment-success?orderId={id}
```

## 🔄 Estados de la Orden

| Estado | Descripción | Acciones Permitidas |
|--------|-------------|---------------------|
| `PENDING` | Orden creada, esperando pago | Pagar, Cancelar |
| `PROCESSING` | Pago en proceso | Solo consultar |
| `COMPLETED` | Pago exitoso y confirmado | Ver detalles, Agendar sesiones |
| `FAILED` | Pago rechazado | Reintentar, Cancelar |
| `CANCELLED` | Orden cancelada por usuario/admin | Ver historial |
| `REFUNDED` | Dinero devuelto | Ver detalles |

## 📊 Panel de Administración

### Gestión de Precios

El administrador puede modificar precios desde:
```
/dashboard/admin/precios
```

Configuraciones disponibles:
- Precio por sesión de disciplina (afecta paquetes)
- Planes STANDARD y PREMIUM
- Licencias institucionales

### Monitoreo de Órdenes

Para ver órdenes de paquetes:
```sql
-- Consulta todas las órdenes
SELECT 
  mpo.id,
  u.nombre as participante,
  m.nombre as mentor,
  v.nombre as vision,
  mpo.cantidad,
  mpo.precioTotal,
  mpo.status,
  mpo.createdAt,
  mpo.paidAt
FROM "MentorPackageOrder" mpo
JOIN "Usuario" u ON mpo."usuarioId" = u.id
JOIN "Usuario" m ON mpo."mentorId" = m.id
JOIN "Vision" v ON mpo."visionId" = v.id
ORDER BY mpo."createdAt" DESC;
```

## 🚀 Deployment

### 1. Aplicar Migración de Base de Datos

```bash
# Generar cliente de Prisma
npx prisma generate

# Aplicar migración
npx prisma db push

# O crear migración
npx prisma migrate dev --name add_mentor_package_order
```

### 2. Variables de Entorno

Asegúrate de configurar en producción:

```env
# Base de datos
DATABASE_URL=
DIRECT_URL=

# Next Auth
NEXTAUTH_URL=https://tudominio.com
NEXTAUTH_SECRET=

# PayPal (producción)
PAYPAL_CLIENT_ID=
PAYPAL_SECRET=
PAYPAL_MODE=production

# Stripe (producción)
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Mercado Pago (producción)
MERCADOPAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY=
```

### 3. Configurar Webhooks

#### Stripe Webhooks
```bash
# Obtener eventos de pago asíncrono
1. Ir a Dashboard de Stripe
2. Webhooks → Add endpoint
3. URL: https://tudominio.com/api/webhooks/stripe
4. Eventos: checkout.session.completed
```

#### PayPal IPN/Webhooks
```bash
# Configurar en PayPal Dashboard
1. Webhooks → Create webhook
2. URL: https://tudominio.com/api/webhooks/paypal
3. Eventos: PAYMENT.CAPTURE.COMPLETED
```

#### Mercado Pago Notifications
```bash
# IPN/Webhooks en panel de Mercado Pago
1. Configurar URL de notificaciones
2. https://tudominio.com/api/webhooks/mercadopago
```

## 🧪 Testing

### Modo Sandbox/Test

Todas las pasarelas funcionan en modo test por defecto:

1. **PayPal Sandbox**
   - Usar cuentas de prueba de developer.paypal.com
   - PAYPAL_MODE=sandbox

2. **Stripe Test**
   - Usar tarjetas de prueba
   - 4242 4242 4242 4242 (éxito)
   - 4000 0000 0000 9995 (fallo)

3. **Mercado Pago Test**
   - Usar credenciales de prueba
   - Tarjetas de test disponibles en documentación

### Flujo de Prueba Completo

```bash
1. Crear usuario participante sin mentor
2. Navegar a /dashboard/program/enroll
3. Click en "Seleccionar Mentor"
4. Seleccionar un mentor del catálogo
5. Elegir método de pago de prueba
6. Completar checkout en pasarela
7. Verificar asignación de mentor
8. Verificar creación de enrollment
```

## 📈 Métricas y Analytics

### Queries Útiles

```sql
-- Total de paquetes vendidos
SELECT COUNT(*) FROM "MentorPackageOrder" WHERE status = 'COMPLETED';

-- Ingresos totales
SELECT SUM("precioTotal") FROM "MentorPackageOrder" WHERE status = 'COMPLETED';

-- Mentores más populares
SELECT 
  m.nombre,
  COUNT(*) as paquetes_vendidos,
  SUM(mpo."precioTotal") as ingresos
FROM "MentorPackageOrder" mpo
JOIN "Usuario" m ON mpo."mentorId" = m.id
WHERE mpo.status = 'COMPLETED'
GROUP BY m.id, m.nombre
ORDER BY paquetes_vendidos DESC;

-- Tasa de conversión
SELECT 
  COUNT(*) FILTER (WHERE status = 'COMPLETED') * 100.0 / COUNT(*) as conversion_rate
FROM "MentorPackageOrder";
```

## 🐛 Troubleshooting

### Error: "Orden no encontrada"
- Verificar que el orderId en la URL sea válido
- Revisar logs de la API

### Error: "Pago no verificado"
- Verificar credenciales de pasarela
- Revisar logs de respuesta de la API externa
- Confirmar que webhook/callback fue recibido

### Error: "Mentor no disponible"
- Verificar que mentor.PerfilMentor.disponible === true
- Confirmar que mentor tiene rol === 'MENTOR'
- Revisar isActive del usuario

## 📞 Soporte

Para problemas o preguntas sobre este sistema:

1. Revisar logs del servidor
2. Verificar configuración de variables de entorno
3. Consultar documentación de pasarelas de pago
4. Revisar estado de la base de datos

## 🔄 Próximas Mejoras

- [ ] Panel de administrador para ver órdenes de paquetes
- [ ] Sistema de cupones/descuentos
- [ ] Paquetes con diferentes cantidades de sesiones
- [ ] Programación automática de las 18 sesiones después del pago
- [ ] Notificaciones por email al completar compra
- [ ] Dashboard del mentor con ventas de paquetes
- [ ] Sistema de reembolsos
- [ ] Reportes financieros detallados
