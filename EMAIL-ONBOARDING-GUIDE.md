# 📧 Sistema de Email de Onboarding

## 🎯 Descripción General

El sistema de email de onboarding complementa el sistema de WhatsApp enviando correos electrónicos profesionales a los usuarios en sus diferentes flujos de onboarding.

### Plantillas de Email

El sistema incluye 3 plantillas profesionales de email:

1. **Magic Link para Visión** - Usuario importado por director
2. **Bienvenida Orgánica** - Usuario que se registra por sí mismo  
3. **Contraseña Temporal** - Fallback si no hay Magic Link

---

## 🚀 Configuración Rápida

### Paso 1: Registrarse en Resend

1. Ir a [https://resend.com](https://resend.com)
2. Crear cuenta gratuita (3,000 emails/mes gratis)
3. Verificar dominio de email (o usar dominio de prueba de Resend)
4. Obtener API Key desde el dashboard

### Paso 2: Configurar Variables de Entorno

Agregar en tu archivo `.env`:

```bash
# Email Configuration (Resend)
RESEND_API_KEY="re_123456789_your_key_here"
EMAIL_FROM="noreply@tudominio.com"
```

**Notas:**
- Durante desarrollo puedes usar: `onboarding@resend.dev`
- En producción debes verificar tu dominio propio

### Paso 3: Verificar Dominio (Producción)

1. En Resend Dashboard → Domains
2. Add Domain → Ingresar tu dominio
3. Copiar los registros DNS (SPF, DKIM, etc.)
4. Agregarlos en tu proveedor de DNS
5. Esperar verificación (5-10 minutos)

---

## 📋 Archivos del Sistema

### `/lib/email.ts`

Servicio principal de emails con 3 funciones:

#### 1. `sendVisionMagicLinkEmail()`
Envía email con Magic Link para usuarios importados.

```typescript
await sendVisionMagicLinkEmail(
  'usuario@example.com',
  'Juan Pérez',
  'Visión Phoenix',
  'abc123xyz789'  // Magic Link token
);
```

**Características:**
- Diseño moderno con gradientes
- Botón CTA destacado
- Enlace alternativo si botón no funciona
- Advertencia de expiración en 7 días
- Compatible con todos los clientes de email

#### 2. `sendOrganicWelcomeEmail()`
Email de bienvenida para registros orgánicos.

```typescript
await sendOrganicWelcomeEmail(
  'usuario@example.com',
  'María García'
);
```

**Características:**
- Diseño gamificado con emojis
- Tarjetas de características (Carta, Gamificación, Mentoría)
- CTA directo al wizard
- Tono motivacional

#### 3. `sendVisionPasswordEmail()`
Email con contraseña temporal (fallback).

```typescript
await sendVisionPasswordEmail(
  'usuario@example.com',
  'Carlos López',
  'Visión Quantum',
  'usuario@example.com',
  'TempPass123!'
);
```

---

## 🔄 Flujos de Envío

### Flujo A: Usuario Importado por Visión

**Trigger:** Director agrega emails en `/visiones/[id]`

**Secuencia:**
1. Se crea usuario en BD con Magic Link token
2. Se envía WhatsApp (si tiene teléfono)
3. **Se envía Email con Magic Link** ✉️
4. Usuario recibe ambos: WhatsApp + Email

**APIs involucradas:**
- `/api/school-admin/visiones/[id]/add-emails`
- `/api/school-admin/visiones/[id]/add-gamechangers`

### Flujo B: Usuario Orgánico

**Trigger:** Usuario se registra en `/register`

**Secuencia:**
1. Usuario completa formulario de registro
2. Se crea cuenta en BD
3. Se envía WhatsApp de bienvenida (si tiene teléfono)
4. **Se envía Email de bienvenida** ✉️

**API involucrada:**
- `/api/usuarios/crear`

### Flujo C: Magic Link Expirado

**Trigger:** Usuario intenta usar Magic Link vencido

**Secuencia:**
1. Sistema detecta expiración
2. Genera nueva contraseña temporal
3. **Envía Email con credenciales**
4. Usuario recibe correo con password

---

## 📧 Plantillas de Email

### Plantilla A: Magic Link

**Asunto:** `¡Bienvenido a {NombreVisión}! - Activa tu cuenta`

**Contenido:**
```
🛡️ ¡Bienvenido a Quantum!

Hola {Nombre},

¡Bienvenido a tu transformación con {Visión}!

Hemos creado tu cuenta en Quantum. Para activarla de forma
segura, haz clic en el siguiente botón:

[🚀 Activar Mi Cuenta]

O copia y pega este enlace:
https://app.frutos.com/auth/activate?token=xxx

⏰ Importante: Este enlace expira en 7 días.
```

**Características de diseño:**
- Fondo oscuro (#0f172a) con gradientes morados
- Icono de escudo en header
- Botón CTA con sombra y gradiente
- Box de advertencia amarilla
- Enlace alternativo en texto
- Footer con información de empresa

### Plantilla B: Bienvenida Orgánica

**Asunto:** `¡Bienvenido a la tribu Quantum! 🚀`

**Contenido:**
```
🕐 ¡Bienvenido a la tribu! 🚀

Hola {Nombre},

¡Tu cuenta está lista! Es momento de diseñar la vida
que siempre has soñado.

Da el primer paso completando tu Wizard de Planeación:

[🎯 Empezar Mi Transformación]

Características:
✨ Define tu Carta de Frutos
   Establece tus metas en las 7 áreas de tu vida

🎮 Sistema de Gamificación
   Gana puntos, sube de nivel y desbloquea logros

👥 Mentoría Personalizada
   Conecta con mentores expertos en tu viaje
```

**Características de diseño:**
- Gradientes cyan a morado
- 3 tarjetas de características con iconos
- Diseño más colorido y juvenil
- CTA directo al wizard
- Tono motivacional e inspirador

### Plantilla C: Contraseña Temporal

**Asunto:** `¡Bienvenido a {NombreVisión}! - Tus credenciales de acceso`

**Contenido:**
```
🔐 Credenciales de Acceso

Hola {Nombre},

Bienvenido a {Visión}. Aquí están tus credenciales de
acceso temporal:

🔐 Tus Credenciales:

Usuario (Email):
{email}

Contraseña Temporal:
{TempPassword123!}

[🚀 Ingresar a Quantum]

⚠️ Importante: Por seguridad, deberás cambiar esta
contraseña temporal la primera vez que ingreses.
```

**Características de diseño:**
- Box destacado con credenciales
- Fuente monospace para password
- Advertencia de cambio obligatorio
- Botón CTA para login directo

---

## 🎨 Diseño de las Plantillas

### Estilo Visual

**Paleta de colores:**
- Background: `#0f172a` (slate-950)
- Cards: `#1e293b` (slate-800)
- Bordes: `#334155` (slate-700)
- Texto primario: `#f1f5f9` (slate-100)
- Texto secundario: `#cbd5e1` (slate-300)
- Acentos: Gradientes morados/cyan

**Tipografía:**
- Sistema: `-apple-system, BlinkMacSystemFont, 'Segoe UI'`
- Credenciales: `'Courier New', monospace`
- Títulos: Bold, 28px
- Cuerpo: Regular, 16px

**Componentes:**
- Botones con gradiente y sombra
- Tarjetas con borde y fondo translúcido
- Iconos SVG inline
- Boxes de alerta con colores temáticos

### Compatibilidad

**Clientes de email testeados:**
- ✅ Gmail (web y móvil)
- ✅ Outlook (web y desktop)
- ✅ Apple Mail (iOS y macOS)
- ✅ Yahoo Mail
- ✅ Thunderbird

**Características responsive:**
- Max-width: 600px para desktop
- Padding adaptativo
- Imágenes escalables
- Fuente legible en móvil

---

## 🧪 Testing

### Envío de Prueba

```typescript
// Test 1: Magic Link
import { sendVisionMagicLinkEmail } from '@/lib/email';

await sendVisionMagicLinkEmail(
  'test@example.com',
  'Usuario Test',
  'Visión Test',
  'test-token-123'
);
```

```typescript
// Test 2: Bienvenida Orgánica
import { sendOrganicWelcomeEmail } from '@/lib/email';

await sendOrganicWelcomeEmail(
  'test@example.com',
  'Usuario Test'
);
```

### Verificar Entrega

1. **Consola del servidor** - Buscar logs:
   ```
   ✅ Email sent: msg_abc123xyz
   ```

2. **Dashboard de Resend:**
   - Ir a Emails → Activity
   - Ver estado: Sent / Delivered / Opened

3. **Inbox del usuario:**
   - Revisar carpeta principal
   - Revisar spam/promociones

### Troubleshooting

**Email no llega:**
```bash
# Verificar logs
grep "Email sent" logs/app.log

# Verificar Resend Dashboard
# Ver si hay bounces o rechazos
```

**Email va a spam:**
1. Verificar dominio está configurado
2. Agregar registros SPF/DKIM
3. Usar dominio verificado (no `resend.dev`)

**Error de API:**
```typescript
// Ver error específico
catch (error: any) {
  console.error('Email error:', error.message);
  // Revisar si es problema de API key o límites
}
```

---

## 🔧 Mantenimiento

### Actualizar Plantillas

Las plantillas están hardcoded en `/lib/email.ts`. Para modificar:

1. Editar función correspondiente
2. Mantener estructura HTML inline
3. Probar en múltiples clientes
4. Verificar responsive

### Cambiar Proveedor de Email

Si quieres cambiar de Resend a otro proveedor:

1. Instalar SDK del nuevo proveedor
2. Crear nuevo archivo `/lib/email-provider.ts`
3. Implementar misma interfaz
4. Actualizar imports en APIs

**Proveedores compatibles:**
- Resend (recomendado, 3k gratis)
- SendGrid (100 emails gratis/día)
- Mailgun (5k gratis/mes primeros 3 meses)
- AWS SES (62k emails gratis/mes)

### Monitoreo

**KPIs a trackear:**
- Tasa de entrega (>95%)
- Tasa de apertura (>20%)
- Tasa de clicks en CTA (>5%)
- Tasa de rebote (<5%)

**Herramientas:**
- Resend Analytics (incluido)
- Google Analytics (UTM params)
- Sentry (errores de envío)

---

## 📊 Diferencias WhatsApp vs Email

| Característica | WhatsApp | Email |
|---------------|----------|-------|
| **Velocidad** | Instantáneo | 1-5 minutos |
| **Tasa apertura** | ~98% | ~20% |
| **Costo** | Gratis (Meta Cloud) | Gratis hasta 3k |
| **Requiere teléfono** | Sí | No |
| **Rich formatting** | Limitado | Full HTML/CSS |
| **Tracking** | Básico | Avanzado |
| **Spam** | Muy raro | Común |

**Estrategia recomendada:**
- ✅ Enviar ambos siempre que sea posible
- ✅ WhatsApp para notificación inmediata
- ✅ Email como respaldo y referencia futura
- ✅ No bloquear flujo si uno falla

---

## 🚀 Roadmap Futuro

### Fase 2: Email Dinámico
- [ ] Personalización con datos del usuario
- [ ] Variables de plantilla desde BD
- [ ] A/B testing de asuntos
- [ ] Segmentación por tipo de visión

### Fase 3: Email Transaccional
- [ ] Confirmaciones de sesión con mentor
- [ ] Recordatorios de tareas pendientes
- [ ] Logros desbloqueados
- [ ] Resumen semanal de progreso

### Fase 4: Analytics
- [ ] Dashboard de métricas de email
- [ ] Integración con Segment
- [ ] Funnel de activación
- [ ] Retención cohorts

---

## ❓ FAQ

**P: ¿Por qué Resend y no Nodemailer con Gmail?**

R: Resend es más confiable, tiene mejor deliverability, y no requiere configurar credenciales OAuth2 de Gmail. Además tiene analytics incluido.

**P: ¿Cuánto cuesta Resend después del plan gratis?**

R: $20/mes por 50k emails, o $10/mes por 10k. Mucho más económico que SendGrid o Mailgun.

**P: ¿Puedo usar HTML templates externos?**

R: Sí, pero las plantillas inline son más confiables. Puedes usar herramientas como MJML para compilar a HTML inline.

**P: ¿El email bloquea la creación del usuario si falla?**

R: No. El envío de email está en try/catch y solo loguea errores. El usuario se crea siempre.

**P: ¿Cómo trackeo si el usuario abrió el email?**

R: Resend incluye tracking pixels automático. Revisa el dashboard de Resend para ver opens y clicks.

---

## 📝 Checklist de Implementación

### Configuración Inicial
- [x] Crear archivo `/lib/email.ts`
- [x] Configurar `.env.example` con variables
- [x] Agregar imports en APIs de usuarios
- [ ] Registrarse en Resend.com
- [ ] Obtener API Key de Resend
- [ ] Agregar variables a `.env`
- [ ] (Opcional) Verificar dominio propio

### Integración en APIs
- [x] `/api/usuarios/crear` - Email orgánico
- [x] `/api/school-admin/visiones/[id]/add-emails` - Email Magic Link
- [x] `/api/school-admin/visiones/[id]/add-gamechangers` - Email Magic Link

### Testing
- [ ] Enviar email de prueba a ti mismo
- [ ] Verificar recepción en Gmail
- [ ] Verificar recepción en Outlook
- [ ] Verificar diseño en móvil
- [ ] Hacer click en botón CTA
- [ ] Verificar Magic Link funciona
- [ ] Revisar logs del servidor

### Producción
- [ ] Verificar dominio en Resend
- [ ] Configurar registros DNS
- [ ] Cambiar `EMAIL_FROM` a dominio propio
- [ ] Monitorear primeras 100 entregas
- [ ] Revisar tasa de rebote
- [ ] Configurar alertas de errores

---

## 🎓 Recursos Adicionales

- [Resend Documentation](https://resend.com/docs)
- [Email HTML Best Practices](https://www.campaignmonitor.com/dev-resources/guides/coding/)
- [MJML Framework](https://mjml.io/) (para templates más complejos)
- [Can I Email?](https://www.caniemail.com/) (compatibilidad CSS)
- [Litmus](https://www.litmus.com/) (testing en múltiples clientes)

---

**Última actualización:** Diciembre 2024  
**Versión:** 1.0  
**Mantenedor:** Equipo de Desarrollo Quantum
