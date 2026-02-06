# 🚀 Plan de Producción - Plataforma Frutos del Espíritu

## Análisis Completo de Seguridad, Rendimiento y Estabilidad

**Fecha de análisis:** 5 de febrero de 2026  
**Proyecto:** Plataforma Frutos del Espíritu  
**Stack:** Next.js 16, Prisma, PostgreSQL (Supabase), Vercel

---

## 📊 RESUMEN EJECUTIVO

### ✅ Fortalezas Actuales
- NextAuth bien implementado para autenticación
- Middleware protegiendo rutas sensibles (/dashboard, /admin, /staff)
- .gitignore correctamente configurado (no expone .env)
- Webhooks de Stripe con verificación de firma
- Prisma ORM (evita SQL injection en la mayoría de casos)
- DOMPurify instalado para sanitización
- Crons protegidos con CRON_SECRET (implementado recientemente)

### ⚠️ Áreas de Mejora Críticas
1. **+100 console.log en APIs del servidor** - Exponen datos en logs
2. **+100 console.log en componentes del cliente** - Exponen datos en consola del navegador
3. **Sin Rate Limiting** - Vulnerable a ataques de fuerza bruta y DDoS
4. **Sin Headers de Seguridad** - No hay CSP, X-Frame-Options, HSTS
5. **Errores detallados en producción** - error.message y error.stack expuestos
6. **Sin validación Zod en APIs** - Entrada de datos no validada
7. **Passwords por defecto visibles en código** - 'Quantum123.'
8. **Muchos scripts .js de desarrollo en raíz** - 100+ archivos check-*.js, fix-*.js

---

## 🔐 FASE 1: SEGURIDAD CRÍTICA (Prioridad ALTA) ✅ COMPLETADA

### 1.1 Eliminar Console.logs de Producción ✅
**Estado:** COMPLETADO

- [x] Crear utilidad de logging condicional (`lib/logger.ts`) ✅
- [x] Reemplazar console.log en `/app/api/**/*.ts` (2427 reemplazados en 695 archivos) ✅
- [x] Script automatizado `scripts/clean-console-logs.js` ✅
- [x] Configurar NODE_ENV check para logging ✅

### 1.2 Implementar Headers de Seguridad ✅
**Estado:** COMPLETADO

- [x] Headers en `next.config.ts` ✅:
  - X-Frame-Options: SAMEORIGIN
  - X-Content-Type-Options: nosniff
  - Strict-Transport-Security (HSTS)
  - Referrer-Policy: strict-origin-when-cross-origin
  - Permissions-Policy
- [x] Configurar Content Security Policy (CSP) ✅
- [x] Configurar Permissions-Policy ✅

### 1.3 Implementar Rate Limiting
**Riesgo:** Ataques de fuerza bruta, DDoS, abuso de API

- [ ] Instalar `@upstash/ratelimit` o similar
### 1.3 Implementar Rate Limiting ✅
**Estado:** COMPLETADO

- [x] Crear `lib/rate-limit.ts` con presets ✅
- [x] `/api/auth/login` - 5 req/min ✅
- [x] `/api/auth/register` - 5 req/min ✅
- [x] `/api/checkout/create-payment` - 10 req/min ✅
- [x] `/api/quantum/coach` - 20 req/min ✅
- [x] `/api/quantum/sugerir-acciones` - 20 req/min ✅
- [x] `/api/quantum/sugerir-objetivos` - 20 req/min ✅
- [x] `/api/quantum/transcribe` - 20 req/min ✅
- [x] `/api/quantum/chat-voice` - 20 req/min ✅
- [x] `/api/quantum/speak` - 20 req/min ✅
- [x] `/api/quantum/unblocker/chat` - 20 req/min ✅
- [x] `/api/quantum/extract-carta` - 20 req/min ✅
- [x] `/api/quantum/generar-misiones` - 20 req/min ✅
- [x] `/api/public/search-referrals` - 30 req/min ✅
- [x] `/api/public/prices` - 30 req/min ✅
- [x] `/api/public/referral/[code]` - 30 req/min ✅
- [x] `/api/public/medical-form/users` - 5 req/min ✅
- [x] `/api/public/medical-form/submit` - 5 req/min ✅
- [x] `/api/codigos/canjear` - 5 req/min ✅
- [x] Headers X-RateLimit-* en respuestas ✅
- [x] Respuestas 429 con Retry-After header ✅

### 1.4 Ocultar Errores Detallados en Producción ✅
**Estado:** COMPLETADO

- [x] Crear `lib/api-utils.ts` para manejo de errores ✅
- [x] Mensajes genéricos en producción ✅

### 1.5 Mover Password por Defecto a Variable de Entorno ✅
**Estado:** COMPLETADO

- [x] Crear `DEFAULT_USER_PASSWORD` en `.env.example` ✅
- [x] Actualizar `/lib/auth.ts` para usar env var ✅

---

## 🛡️ FASE 2: SEGURIDAD MEDIA (Prioridad MEDIA) ✅ COMPLETADA

### 2.1 Implementar Validación con Zod ✅
**Estado:** COMPLETADO

- [x] Crear schemas Zod en `/lib/validations/index.ts` ✅
- [x] Validar body en APIs de:
  - [x] Login (`/api/auth/login`) ✅
  - [x] Registro de usuarios (`/api/auth/register`) ✅
  - [x] Checkout y pagos (`/api/checkout/create-payment`) ✅
  - [x] Transferencia de tickets (`/api/tickets/transfer`) ✅
- [x] Helper functions: validateData(), getValidationErrorMessage() ✅

**Schemas creados:**
- loginSchema, registerSchema, checkoutCreatePaymentSchema
- ticketTransferSchema, ticketDepositSchema, ticketCreatePaymentSchema
- quantumCoachSchema, quantumUnblockerSchema
- enrollmentSchema, addGamechangersSchema, assignMentorSchema
- codigoSchema, organizationSchema, strikeSchema, uploadSchema

### 2.2 Revisar APIs Públicas ✅
**Estado:** COMPLETADO

- [x] Auditar `/app/api/public/**` ✅
- [x] Rate limiting agregado a todas las APIs públicas ✅
- [x] `/api/public/medical-form/*` con rate limit estricto (5 req/min) ✅

**Nota:** Las APIs públicas exponen datos mínimos necesarios:
- `search-referrals`: solo id, nombre, referralCode
- `prices`: precios públicos de productos
- `medical-form`: requiere visionId válido

### 2.3 Proteger APIs sin Autenticación ✅
**Estado:** REVISADO

APIs sin autenticación (intencional):
- [x] `/api/og/*` - Open Graph para SEO ✅ (OK)
- [x] `/api/health` - Health check para monitoreo ✅ (OK)
- [x] `/api/public/*` - APIs públicas con rate limiting ✅

### 2.4 Limpiar Scripts de Desarrollo ✅
**Estado:** COMPLETADO

- [x] Mover 271 scripts a `/scripts/development/` ✅
- [x] README.md con documentación ✅
- [x] Solo `ecosystem.config.js` queda en raíz (PM2) ✅

---

## ⚡ FASE 3: RENDIMIENTO Y ESTABILIDAD

### 3.1 Optimización de Base de Datos ✅
**Estado:** YA CONFIGURADO

- [x] Connection pooling configurado en DATABASE_URL ✅
- [x] Prisma client singleton pattern ✅
- [ ] Revisar queries N+1 (mejora continua)
- [ ] Agregar índices a campos frecuentemente consultados (por demanda)

### 3.2 Caché y CDN
**Estado:** CONFIGURACIÓN BASE OK

- [x] Next.js built-in caching para assets estáticos ✅
- [x] next/image ya optimiza imágenes ✅
- [ ] ISR para páginas estáticas (opcional)
- [ ] Redis/Upstash para caché (escalar según demanda)

### 3.3 Manejo de Timeouts ✅
**Estado:** COMPLETADO

- [x] Crear `lib/api-resilience.ts` con timeouts configurados ✅
  - OpenAI: 30s
  - Stripe/MercadoPago/PayPal: 15s
  - WhatsApp/Resend: 10s
- [x] Retry logic con backoff exponencial ✅
- [x] Helper `fetchWithTimeout()` disponible ✅

### 3.4 Monitoreo y Observabilidad ✅
**Estado:** COMPLETADO

- [x] Configurar Vercel Analytics ✅
- [x] Implementar Sentry para error tracking ✅
- [x] Configurar alertas para errores críticos ✅

**Archivos creados:**
- `sentry.client.config.ts` - Configuración cliente
- `sentry.server.config.ts` - Configuración servidor
- `sentry.edge.config.ts` - Configuración edge
- `app/global-error.tsx` - Error boundary global
- `lib/sentry-alerts.ts` - Helper para alertas críticas

**Variables de entorno requeridas:**
- `SENTRY_DSN` / `NEXT_PUBLIC_SENTRY_DSN`
- `SENTRY_ORG`, `SENTRY_PROJECT`, `SENTRY_AUTH_TOKEN`

**Alertas configuradas:**
- `CriticalErrors.paymentFailed()` - Fallos de pago
- `CriticalErrors.databaseError()` - Errores de BD
- `CriticalErrors.aiServiceDown()` - Fallas de IA
- `CriticalErrors.authBypass()` - Alertas de seguridad
- `CriticalErrors.rateLimitAbuse()` - Abuso de rate limit

---

## 🌐 FASE 4: HOSTING Y ESCALABILIDAD

### 4.1 Configuración de Vercel ✅
**Estado:** CONFIGURADO (verificar post-deploy)

- [x] Límite de función serverless extendido (30s para IA) en rutas que lo necesitan ✅
- [x] Environment Variables documentadas ✅
- [ ] Verificar configuración de regiones (por defecto OK)

### 4.2 Base de Datos ✅
**Estado:** CONFIGURADO

- [x] Connection pooling con PgBouncer ✅
- [ ] Verificar backups automáticos en Supabase
- [ ] Considerar read replicas si hay mucho tráfico

### 4.3 Almacenamiento
**Estado:** CONFIGURACIÓN BASE OK

- [x] Supabase Storage configurado ✅
- [ ] Limpieza de archivos huérfanos (mejora continua)
- [ ] Compresión de imágenes (usar librerías como sharp)

### 4.4 Dominios y SSL ✅
**Estado:** AUTOMÁTICO EN VERCEL

- [x] SSL automático en Vercel ✅
- [x] HSTS configurado en headers ✅
- [x] Redirección HTTP → HTTPS (automático Vercel) ✅

---

## 📋 FASE 5: PREPARACIÓN FINAL

### 5.1 Pruebas Pre-Producción
**Estado:** RECOMENDADO (manual)

- [ ] Verificar flujos críticos manualmente:
  - [ ] Registro de usuario
  - [ ] Checkout con cada pasarela
  - [ ] Login/Logout
  - [ ] Quantum Coach
- [ ] Pruebas de carga opcionales (k6, Artillery)

### 5.2 Documentación ✅
**Estado:** COMPLETADO

- [x] Variables de entorno documentadas en `.env.example` ✅
- [x] Checklist de producción creado `docs/PRODUCTION-CHECKLIST.md` ✅
- [x] Procedimiento de rollback documentado ✅

### 5.3 Checklist Final
**Ver:** `docs/PRODUCTION-CHECKLIST.md`

- [ ] Variables de entorno en Vercel
- [ ] Webhooks de pago configurados
- [ ] CRON_SECRET configurado
- [ ] DEFAULT_USER_PASSWORD configurado

---

## 🎯 RECOMENDACIONES ADICIONALES (Best Practices)

### Seguridad Avanzada (Fase 2.0 - Post-Lanzamiento)
1. **Implementar 2FA** para roles administrativos
2. **Audit Logging** - Registrar acciones críticas
3. **Session Management** - Logout forzado y expiración

### Escalabilidad (Cuando lo necesites)
1. **Redis/Upstash** - Para rate limiting distribuido
2. **Message Queues** - Para operaciones pesadas
3. **Background Jobs** - Migrar crons pesados

### UX/Performance
1. **Skeleton Loaders** - Mejorar percepción de velocidad
2. **Prefetching** - Precargar datos de páginas probables
3. **Service Worker** - Para funcionamiento offline básico
4. **Web Vitals** - Monitorear Core Web Vitals

### Cumplimiento
1. **GDPR/Ley Federal de Protección de Datos** - Verificar cumplimiento
2. **Política de Privacidad** - Actualizar con prácticas actuales
3. **Términos de Servicio** - Revisar y actualizar
4. **Cookies** - Implementar banner de consentimiento si es necesario

---

## 📊 PRIORIZACIÓN SUGERIDA

| Fase | Prioridad | Tiempo Estimado | Impacto |
|------|-----------|-----------------|---------|
| 1.1 Console.logs | 🔴 CRÍTICA | 4-6 horas | Alto |
| 1.2 Headers Seguridad | 🔴 CRÍTICA | 1-2 horas | Alto |
| 1.3 Rate Limiting | 🔴 CRÍTICA | 3-4 horas | Alto |
| 1.4 Ocultar Errores | 🔴 CRÍTICA | 2-3 horas | Alto |
| 1.5 Password Env | 🔴 CRÍTICA | 30 min | Medio |
| 2.1 Validación Zod | 🟡 MEDIA | 6-8 horas | Alto |
| 2.2 APIs Públicas | 🟡 MEDIA | 2-3 horas | Medio |
| 2.4 Limpiar Scripts | 🟢 BAJA | 1-2 horas | Bajo |
| 3.1 DB Optimization | 🟡 MEDIA | 4-6 horas | Alto |
| 3.4 Monitoreo | 🟡 MEDIA | 2-3 horas | Alto |
| 4.1-4.4 Hosting | 🟡 MEDIA | 3-4 horas | Alto |
| 5.1-5.3 Final | 🟡 MEDIA | 4-6 horas | Alto |

**Tiempo total estimado:** 35-50 horas de trabajo

---

## 📝 NOTAS

- Este documento debe actualizarse conforme se completen las tareas
- Cada checkbox completado debe incluir fecha y responsable
- Las fases pueden ejecutarse en paralelo por diferentes desarrolladores
- Priorizar Fase 1 antes del lanzamiento a producción

---

*Generado por análisis de código - Plataforma Frutos del Espíritu*
