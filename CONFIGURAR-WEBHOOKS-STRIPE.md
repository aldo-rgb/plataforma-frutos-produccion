# Configuración de Webhooks de Stripe para Membresías

## 📋 Resumen

Este documento explica cómo configurar los webhooks de Stripe necesarios para el sistema de membresías anuales de mentores.

## 🔧 Variables de Entorno Necesarias

Agregar al archivo `.env`:

```bash
# Stripe Keys
STRIPE_SECRET_KEY=sk_test_... # o sk_live_... en producción
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_... # o pk_live_... en producción

# Webhooks Secrets
STRIPE_WEBHOOK_SECRET=whsec_... # Para solicitudes de mentor
STRIPE_WEBHOOK_SECRET_MEMBERSHIP=whsec_... # Para renovaciones de membresía

# Cron Secret (generado por Vercel automáticamente)
CRON_SECRET=<auto-generado-por-vercel>
```

## 🌐 Configurar Webhooks en Stripe Dashboard

### 1. Webhook para Solicitudes de Mentor
**URL:** `https://tu-dominio.com/api/mentor/application/webhook`

**Eventos a escuchar:**
- `checkout.session.completed` - Cuando se completa el pago inicial de solicitud

**Pasos:**
1. Ir a [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click en "Add endpoint"
3. Ingresar URL: `https://tu-dominio.com/api/mentor/application/webhook`
4. Seleccionar eventos: `checkout.session.completed`
5. Copiar el **Signing secret** y agregarlo como `STRIPE_WEBHOOK_SECRET` en `.env`

---

### 2. Webhook para Renovaciones de Membresía
**URL:** `https://tu-dominio.com/api/mentor/membership/webhook`

**Eventos a escuchar:**
- `checkout.session.completed` - Renovación manual completada
- `invoice.payment_succeeded` - Renovación automática exitosa
- `invoice.payment_failed` - Fallo en renovación automática
- `customer.subscription.deleted` - Cancelación de suscripción

**Pasos:**
1. En Stripe Dashboard → Developers → Webhooks
2. Click en "Add endpoint"
3. Ingresar URL: `https://tu-dominio.com/api/mentor/membership/webhook`
4. Seleccionar eventos:
   - `checkout.session.completed`
   - `invoice.payment_succeeded`
   - `invoice.payment_failed`
   - `customer.subscription.deleted`
5. Copiar el **Signing secret** y agregarlo como `STRIPE_WEBHOOK_SECRET_MEMBERSHIP` en `.env`

---

## 🧪 Pruebas en Local con Stripe CLI

### Instalar Stripe CLI
```bash
brew install stripe/stripe-cli/stripe
```

### Login
```bash
stripe login
```

### Forward webhooks para solicitudes
```bash
stripe listen --forward-to localhost:3000/api/mentor/application/webhook
```

### Forward webhooks para membresías
```bash
stripe listen --forward-to localhost:3000/api/mentor/membership/webhook \
  --events checkout.session.completed,invoice.payment_succeeded,invoice.payment_failed,customer.subscription.deleted
```

### Trigger evento de prueba
```bash
# Simular pago exitoso
stripe trigger checkout.session.completed

# Simular renovación automática
stripe trigger invoice.payment_succeeded

# Simular fallo en pago
stripe trigger invoice.payment_failed
```

---

## ⏰ Verificar Cron Jobs en Vercel

El archivo `vercel.json` ya está configurado con:

```json
{
  "crons": [
    {
      "path": "/api/cron/check-expired-memberships",
      "schedule": "0 0 * * *"
    }
  ]
}
```

**Nota:** Los cron jobs solo funcionan en proyectos **Pro** de Vercel.

Para verificar ejecución:
1. Ir a Vercel Dashboard → tu proyecto
2. Click en "Cron Jobs" en el menú lateral
3. Ver logs de ejecución y próximos triggers

---

## 🔐 Seguridad del Cron Endpoint

El endpoint `/api/cron/check-expired-memberships` está protegido por:

```typescript
const authHeader = req.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
```

El `CRON_SECRET` es generado automáticamente por Vercel y está disponible en las variables de entorno del proyecto.

---

## 📧 Sistema de Notificaciones (Pendiente)

Actualmente el sistema crea notificaciones en la base de datos. Para agregar emails:

### Opción 1: Resend (Recomendado)
```bash
npm install resend
```

```typescript
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@tu-dominio.com',
  to: mentor.usuario.email,
  subject: 'Membresía Renovada',
  html: '<p>Tu membresía ha sido renovada...</p>'
});
```

### Opción 2: SendGrid
```bash
npm install @sendgrid/mail
```

### Opción 3: Nodemailer
```bash
npm install nodemailer
```

---

## ✅ Checklist de Implementación

- [x] Webhook para solicitudes configurado
- [x] Webhook para membresías configurado
- [x] Cron job agregado a `vercel.json`
- [x] Endpoints de API creados
- [x] UI de membresía con auto-renovación
- [ ] Variables de entorno en producción
- [ ] Webhooks configurados en Stripe Dashboard (producción)
- [ ] Sistema de emails implementado
- [ ] Pruebas end-to-end completadas

---

## 🐛 Troubleshooting

### Webhook no funciona
1. Verificar que el signing secret sea correcto
2. Revisar logs en Stripe Dashboard → Developers → Webhooks → [tu endpoint]
3. Verificar que la URL sea accesible públicamente (no localhost en producción)

### Cron job no ejecuta
1. Verificar que el proyecto sea Pro en Vercel
2. Revisar logs en Vercel Dashboard → Cron Jobs
3. Asegurarse de que `CRON_SECRET` esté configurado

### Auto-renovación no procesa
1. Verificar que `stripeSubscriptionId` esté guardado en la base de datos
2. Revisar que el evento `invoice.payment_succeeded` llegue al webhook
3. Verificar metadata del checkout session

---

## 📞 Soporte

Para más información sobre webhooks de Stripe:
- [Documentación de Webhooks](https://stripe.com/docs/webhooks)
- [Testing Webhooks](https://stripe.com/docs/webhooks/test)
- [Stripe CLI](https://stripe.com/docs/stripe-cli)
