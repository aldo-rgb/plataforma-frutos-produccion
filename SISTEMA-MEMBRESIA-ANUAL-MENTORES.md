# Sistema de Membresía Anual para Mentores

## Resumen del Sistema

El sistema implementa una membresía anual de $999 MXN para mentores con las siguientes características:

### 1. Flujo de Afiliación

1. **Solicitud Inicial**: Usuario completa formulario en `/dashboard/solicitar-mentor`
2. **Pago Único**: $999 MXN vía Stripe
3. **Revisión Admin**: Aplicación queda en estado `PENDING`
4. **Aprobación**: Admin aprueba y activa membresía por 1 año
5. **Activación**: Se crea `PerfilMentor` con `membershipActive = true`

### 2. Cambios en Base de Datos

#### PerfilMentor - Nuevos Campos
```prisma
membershipActive          Boolean    @default(false)
membershipStartDate       DateTime?
membershipExpiryDate      DateTime?
membershipApprovedAt      DateTime?
membershipApprovedBy      Int?
autoRenewalEnabled        Boolean    @default(true)
stripeSubscriptionId      String?
stripeCustomerId          String?
lastRenewalAttempt        DateTime?
renewalFailureReason      String?
```

#### Nuevo Modelo: MentorMembershipRenewal
```prisma
model MentorMembershipRenewal {
  id                    Int          @id @default(autoincrement())
  mentorId              Int
  renewalDate           DateTime
  expiryDate            DateTime
  amount                Float
  stripePaymentIntentId String?
  status                String       @default("ACTIVE")
  autoRenewed           Boolean      @default(false)
  createdAt             DateTime     @default(now())
  
  PerfilMentor          PerfilMentor @relation(fields: [mentorId], references: [id])
}
```

### 3. Archivos a Crear/Modificar

#### API Endpoints Necesarios

1. **`/app/api/admin/mentor-applications/route.ts`**
   - GET: Lista aplicaciones PENDING
   - Incluye datos del usuario y documentos

2. **`/app/api/admin/mentor-applications/[id]/approve/route.ts`**
   - POST: Aprueba aplicación
   - Crea PerfilMentor
   - Activa membresía por 1 año
   - Agrega rol MENTOR al usuario

3. **`/app/api/admin/mentor-applications/[id]/reject/route.ts`**
   - POST: Rechaza aplicación
   - Guarda razón de rechazo

4. **`/app/api/cron/check-expired-memberships/route.ts`**
   - GET: Ejecutado diariamente
   - Desactiva mentores con membresía expirada
   - Envía notificaciones previas (30, 7, 1 días antes)

5. **`/app/api/mentor/membership/renew/route.ts`**
   - POST: Procesa renovación manual
   - Crea sesión Stripe para pago

6. **`/app/api/mentor/membership/status/route.ts`**
   - GET: Consulta estado de membresía
   - Días restantes, renovación automática, etc.

#### Modificaciones en Queries

**`/app/api/mentorias/mentores/route.ts`** (YA EXISTE)
```typescript
// Agregar filtro de membresía activa
const mentores = await prisma.perfilMentor.findMany({
  where: {
    disponible: true,
    acceptingNewClients: true,
    membershipActive: true, // NUEVO
    membershipExpiryDate: {
      gte: new Date() // NUEVO
    },
    Usuario: {
      rol: 'MENTOR',
      isActive: true
    }
  }
});
```

**Queries de Discipline** - Agregar mismo filtro en:
- `/app/api/discipline/available-mentors/route.ts`
- Cualquier query que liste mentores

### 4. Panel de Administración

**`/app/admin/mentor-applications/page.tsx`** (NUEVO)
- Lista aplicaciones PENDING con filtros
- Muestra datos completos + documentos
- Botones: Aprobar / Rechazar
- Modal para feedback de rechazo

### 5. Panel de Mentor

**`/app/dashboard/mi-membresia/page.tsx`** (NUEVO)
- Estado actual de membresía
- Fecha de expiración
- Historial de renovaciones
- Toggle auto-renovación
- Botón renovar manualmente

### 6. Sistema de Renovación Automática

#### Stripe Subscription Setup
```javascript
// Al aprobar mentor
const subscription = await stripe.subscriptions.create({
  customer: stripeCustomerId,
  items: [{ price: 'price_mentor_annual' }],
  payment_behavior: 'default_incomplete',
  payment_settings: {
    payment_method_types: ['card']
  },
  expand: ['latest_invoice.payment_intent']
});
```

#### Webhook Handler
**`/app/api/mentor/membership/webhook/route.ts`**
```typescript
// Eventos:
// - invoice.payment_succeeded: Renovación exitosa
// - invoice.payment_failed: Renovación fallida
// - customer.subscription.deleted: Cancelación
```

### 7. Cron Jobs (Vercel Cron)

**`vercel.json`**
```json
{
  "crons": [{
    "path": "/api/cron/check-expired-memberships",
    "schedule": "0 0 * * *"
  }, {
    "path": "/api/cron/send-renewal-reminders",
    "schedule": "0 8 * * *"
  }]
}
```

### 8. Notificaciones

#### Emails a Enviar
1. **Aplicación Aprobada**
   - Bienvenida como mentor
   - Fecha de expiración
   - Siguiente pasos

2. **Recordatorios de Renovación**
   - 30 días antes
   - 7 días antes
   - 1 día antes

3. **Renovación Exitosa**
   - Confirmación de pago
   - Nueva fecha de expiración

4. **Renovación Fallida**
   - Notificación del problema
   - Link para actualizar método de pago

5. **Membresía Expirada**
   - Cuenta desactivada
   - Instrucciones para renovar

### 9. Lógica de Desactivación

Cuando membresía expira:
```typescript
await prisma.perfilMentor.update({
  where: { id: mentorId },
  data: {
    membershipActive: false,
    disponible: false,
    acceptingNewClients: false
  }
});
```

**Efectos:**
- ✅ No aparece en `/mentorias`
- ✅ No aparece en listas de discipline
- ✅ No puede agendar nuevas llamadas
- ✅ Llamadas agendadas existentes se mantienen
- ✅ Puede renovar para reactivar

### 10. Proceso de Renovación

#### Manual:
1. Mentor va a `/dashboard/mi-membresia`
2. Click "Renovar Membresía"
3. Redirige a Stripe Checkout
4. Pago exitoso → Activación inmediata

#### Automática:
1. Stripe cobra automáticamente
2. Webhook actualiza BD
3. Email de confirmación
4. Membresía extendida 1 año más

### 11. Variables de Entorno Necesarias

```env
# Stripe
STRIPE_SECRET_KEY=sk_live_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
STRIPE_WEBHOOK_SECRET_MEMBERSHIP=whsec_...

# Precio de membresía
STRIPE_PRICE_ID_MENTOR_ANNUAL=price_...

# URL base
NEXTAUTH_URL=https://tudominio.com
```

### 12. Testing Checklist

- [ ] Aprobar aplicación crea PerfilMentor con membresía activa
- [ ] Membresía expira después de 1 año
- [ ] Mentor desaparece de listas al expirar
- [ ] Renovación manual funciona
- [ ] Renovación automática procesa correctamente
- [ ] Emails de notificación se envían
- [ ] Cron job ejecuta diariamente
- [ ] Webhook procesa eventos correctamente

### 13. Métricas a Trackear

- Total de mentores activos
- Membresías por expirar (próximos 30 días)
- Tasa de renovación (manual vs automática)
- Ingresos mensuales de renovaciones
- Razones de cancelación

## Próximos Pasos

1. ✅ Schema actualizado
2. ⏳ Crear API endpoints
3. ⏳ Crear panel admin
4. ⏳ Crear panel mentor
5. ⏳ Configurar Stripe subscriptions
6. ⏳ Implementar webhooks
7. ⏳ Configurar cron jobs
8. ⏳ Implementar sistema de emails
9. ⏳ Testing end-to-end
10. ⏳ Deploy y monitoreo
