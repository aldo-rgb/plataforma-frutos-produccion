# ✅ Checklist de Producción - Plataforma Frutos

## Variables de Entorno Requeridas en Vercel

### 🔴 Críticas (la app no funciona sin estas)

| Variable | Descripción | Ejemplo |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...?pgbouncer=true` |
| `NEXTAUTH_SECRET` | Secret para JWT (mínimo 32 chars) | `openssl rand -base64 32` |
| `NEXTAUTH_URL` | URL de producción | `https://tudominio.com` |
| `CRON_SECRET` | Protege endpoints de cron | `openssl rand -hex 32` |
| `DEFAULT_USER_PASSWORD` | Password para usuarios creados | `Quantum123.` |

### 🟡 Funcionalidades Principales

| Variable | Funcionalidad | Requerido |
|----------|--------------|-----------|
| `OPENAI_API_KEY` | Quantum Coach IA | Sí para IA |
| `STRIPE_SECRET_KEY` | Pagos con Stripe | Si usas Stripe |
| `MERCADOPAGO_ACCESS_TOKEN` | Pagos con MP | Si usas MP |
| `RESEND_API_KEY` | Envío de emails | Sí para emails |
| `WHATSAPP_ACCESS_TOKEN` | Notificaciones WA | Opcional |

### 🟢 Opcionales

| Variable | Funcionalidad |
|----------|--------------|
| `PAYPAL_CLIENT_ID` | Pagos PayPal |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe frontend |
| `NEXT_PUBLIC_MERCADOPAGO_PUBLIC_KEY` | MP frontend |

---

## Verificaciones Pre-Deploy

### Base de Datos
- [ ] Connection pooling configurado (`pgbouncer=true`)
- [ ] Backups automáticos activos en Supabase
- [ ] Índices en campos frecuentes

### Seguridad
- [x] Headers de seguridad en `next.config.ts`
- [x] CSP configurado
- [x] Rate limiting en endpoints críticos
- [x] Validación Zod en APIs
- [x] Logs limpios (no console.log en prod)
- [x] Password no hardcodeado

### Webhooks
- [ ] Stripe webhook configurado en dashboard
- [ ] MercadoPago webhook configurado
- [ ] URLs de webhook actualizadas a producción

### Cron Jobs
- [ ] Vercel Cron configurado en `vercel.json`
- [ ] CRON_SECRET configurado
- [ ] Jobs funcionando:
  - `/api/cron/expire-tasks`
  - `/api/cron/expire-licenses`
  - `/api/cron/process-abandoned-checkouts`
  - `/api/cron/welcome-automation`

---

## Monitoreo Recomendado

### Errores
- Vercel Logs (incluido)
- Sentry (opcional pero recomendado)

### Analytics
- Vercel Analytics (incluido en algunos planes)
- Google Analytics (opcional)

### Uptime
- Vercel Status
- UptimeRobot o similar (free tier disponible)

---

## Flujos Críticos a Verificar

1. **Registro de Usuario**
   - [ ] Formulario funciona
   - [ ] Email de bienvenida se envía
   - [ ] Usuario aparece en dashboard

2. **Checkout/Pago**
   - [ ] Stripe funciona
   - [ ] MercadoPago funciona
   - [ ] Webhooks procesan correctamente
   - [ ] Tickets se crean

3. **Login/Logout**
   - [ ] NextAuth funciona
   - [ ] Sesiones persisten
   - [ ] Logout limpia sesión

4. **Quantum Coach**
   - [ ] OpenAI responde
   - [ ] Rate limit funciona
   - [ ] Declaraciones se guardan

---

## Rollback Procedure

Si algo falla después del deploy:

1. En Vercel Dashboard → Deployments
2. Encontrar el deployment anterior (verde)
3. Click en ⋮ → Promote to Production
4. Confirmar rollback

---

## Contactos de Emergencia

| Servicio | Dashboard | Soporte |
|----------|-----------|---------|
| Vercel | vercel.com/dashboard | support@vercel.com |
| Supabase | app.supabase.com | Dashboard tickets |
| Stripe | dashboard.stripe.com | Chat en dashboard |
| OpenAI | platform.openai.com | Chat en dashboard |

---

*Última actualización: 5 de febrero de 2026*
