# 🚀 Sistema de Onboarding con WhatsApp Gateway

## 📋 Resumen Ejecutivo

Sistema completo de automatización de onboarding que envía mensajes de WhatsApp personalizados según el origen del usuario y maneja todo el flujo de activación de cuenta con Magic Links.

---

## 🎯 Características Implementadas

### 1. **Base de Datos - Nuevos Campos**

Se agregaron los siguientes campos al modelo `Usuario` en Prisma:

```prisma
model Usuario {
  // ... campos existentes ...
  
  // 🆕 Campos de Onboarding
  wizardCompleted          Boolean    @default(false)
  onboardingOrigin         String?    @default("ORGANIC_SIGNUP")
  
  // 🆕 Magic Link Authentication
  magicLinkToken           String?    @unique
  magicLinkExpiry          DateTime?
  
  // 🆕 Contraseña Temporal
  temporaryPassword        String?
  
  // ✅ Ya existía
  requirePasswordChange    Boolean    @default(false)
}
```

**Migración requerida:**
```bash
npx prisma migrate dev --name add_onboarding_fields
```

---

### 2. **WhatsApp Gateway Service**

**Archivo:** `/lib/whatsapp.ts`

#### Funciones Principales:

##### `sendWhatsAppMessage(phoneNumber, templateName, variables)`
- Envía mensaje usando Meta Cloud API
- Maneja limpieza de números de teléfono
- Retorna `{ success, messageId, error }`

##### `sendVisionWelcomeMessage(phoneNumber, nombre, nombreVision, email, tempPassword)`
- **Plantilla A:** Usuario importado por Visión con contraseña temporal
- Variables: `[nombre, nombreVision, email, tempPassword, loginUrl]`

##### `sendVisionMagicLinkMessage(phoneNumber, nombre, nombreVision, magicLinkToken)`
- **Plantilla A (Alternativa):** Usuario importado con Magic Link
- Variables: `[nombre, nombreVision, magicLinkUrl]`
- **✅ RECOMENDADO:** Más seguro que enviar contraseñas por WhatsApp

##### `sendOrganicWelcomeMessage(phoneNumber, nombre)`
- **Plantilla B:** Usuario con registro orgánico
- Variables: `[nombre, wizardUrl]`

##### `generateMagicLinkToken()`
- Genera token seguro de 64 caracteres
- Solo letras y números (URL-safe)

##### `generateTemporaryPassword()`
- Genera contraseña temporal formato: `FrutosXXXXXX!`
- 6 caracteres alfanuméricos + 1 símbolo

---

### 3. **APIs Implementadas**

#### 🔐 `POST /api/auth/activate?token=xxx`

**Propósito:** Activar cuenta con Magic Link

**Flujo:**
1. Usuario da click en WhatsApp
2. Sistema valida token y expiración
3. Token se invalida (uso único)
4. Crea sesión temporal JWT en cookie `magic-session`
5. Redirige a `/auth/change-password?magic=true`

**Respuesta:**
- ✅ Redirect a `/auth/change-password?magic=true`
- ❌ Redirect a `/login?error=invalid_token`
- ❌ Redirect a `/login?error=expired_token`

---

#### 🔐 `POST /api/auth/change-password`

**Body:**
```json
{
  "newPassword": "NuevaPass123!",
  "isMagicLink": true,
  "currentPassword": "opcional"
}
```

**Lógica:**
- Si `isMagicLink = true`: Lee sesión desde cookie `magic-session`
- Si `isMagicLink = false`: Usa sesión normal de NextAuth
- Si `requirePasswordChange = false`: Requiere `currentPassword`

**Validaciones:**
- Mínimo 8 caracteres
- Al menos 1 mayúscula
- Al menos 1 minúscula
- Al menos 1 número

**Respuesta:**
```json
{
  "success": true,
  "email": "user@example.com",
  "redirectTo": "/wizard" // o "/dashboard" si wizardCompleted=true
}
```

**Limpieza:**
- Actualiza password
- `requirePasswordChange = false`
- `temporaryPassword = null`
- Elimina cookie `magic-session`

---

#### 📧 `POST /api/usuarios/crear`

**Cambios:**
- ✅ Agrega campo `telefono`
- ✅ Establece `onboardingOrigin = 'ORGANIC_SIGNUP'`
- ✅ Establece `wizardCompleted = false`
- ✅ Establece `requirePasswordChange = false` (usuario crea su propia pass)
- ✅ **Envía WhatsApp automáticamente** si tiene teléfono

**Flujo:**
```javascript
const nuevoUsuario = await prisma.usuario.create({
  data: {
    nombre,
    email,
    password: hashedPassword,
    telefono: telefono || null,
    rol,
    onboardingOrigin: 'ORGANIC_SIGNUP',
    wizardCompleted: false,
    requirePasswordChange: false
  }
});

// Enviar WhatsApp Plantilla B
if (telefono) {
  await sendOrganicWelcomeMessage(telefono, nombre);
}
```

---

#### 📧 `POST /api/school-admin/visiones/[id]/add-emails`

**Cambios:**
- ✅ Genera `magicLinkToken` único
- ✅ Establece `magicLinkExpiry = +7 días`
- ✅ Establece `onboardingOrigin = 'VISION_IMPORT'`
- ✅ Establece `requirePasswordChange = true`
- ✅ Guarda `temporaryPassword` (backup)
- ✅ **Envía WhatsApp con Magic Link** si tiene teléfono

**Flujo:**
```javascript
const magicToken = generateMagicLinkToken();
const tokenExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 días

const user = await prisma.usuario.create({
  data: {
    email,
    nombre: email.split('@')[0],
    password: hashed, // DEFAULT_PASSWORD hasheado
    rol: 'PARTICIPANTE',
    onboardingOrigin: 'VISION_IMPORT',
    wizardCompleted: false,
    requirePasswordChange: true,
    magicLinkToken: magicToken,
    magicLinkExpiry: tokenExpiry,
    temporaryPassword: DEFAULT_PASSWORD
  }
});

// Enviar WhatsApp Plantilla A (Magic Link)
if (user.telefono) {
  await sendVisionMagicLinkMessage(
    user.telefono,
    user.nombre,
    vision.nombre,
    magicToken
  );
}
```

---

#### 📧 `POST /api/school-admin/visiones/[id]/add-gamechangers`

**Cambios:** Idéntico a `add-emails` pero con `rol = 'GAMECHANGER'`

---

### 4. **Middleware de Autenticación**

**Archivo:** `/middleware.ts`

#### Lógica de Redirección (En Orden de Prioridad):

```javascript
// CASO 1: Usuario con contraseña temporal (PRIORIDAD MÁXIMA)
if (requirePasswordChange && path !== '/auth/change-password') {
  redirect('/auth/change-password')
}

// CASO 2: Usuario sin wizard completado
if (!requirePasswordChange && !wizardCompleted && !path.startsWith('/wizard')) {
  redirect('/wizard')
}

// CASO 3: Usuario ya completó todo y está en change-password
if (!requirePasswordChange && path === '/auth/change-password') {
  redirect('/dashboard')
}

// CASO 4: Usuario completó wizard y está en /wizard
if (wizardCompleted && path.startsWith('/wizard')) {
  redirect('/dashboard')
}
```

---

### 5. **Frontend - Página de Cambio de Contraseña**

**Archivo:** `/app/auth/change-password/page.tsx`

#### Características:

- ✅ Soporte para Magic Link (`?magic=true`)
- ✅ Validación en tiempo real de contraseña
- ✅ Indicadores visuales de requisitos
- ✅ Auto-login después de cambiar contraseña
- ✅ Redirección inteligente (wizard o dashboard)

#### Validaciones UI:
- 🟢 Mínimo 8 caracteres
- 🟢 Al menos una mayúscula
- 🟢 Al menos una minúscula
- 🟢 Al menos un número
- 🟢 Contraseñas coinciden

#### Estados:
- **Loading:** Mientras carga sesión
- **Form:** Formulario activo con validaciones
- **Success:** Mensaje de éxito + loader de redirección

---

### 6. **NextAuth JWT - Actualización**

**Archivo:** `/lib/auth.ts`

Se agregaron los siguientes campos al JWT y Session:

```typescript
// En authorize():
return {
  id: user.id,
  email: user.email,
  nombre: user.nombre,
  rol: user.rol,
  requirePasswordChange: user.requirePasswordChange || false,
  wizardCompleted: user.wizardCompleted || false,
  onboardingOrigin: user.onboardingOrigin || 'ORGANIC_SIGNUP',
}

// En jwt() callback:
token.requirePasswordChange = user.requirePasswordChange || false
token.wizardCompleted = user.wizardCompleted || false
token.onboardingOrigin = user.onboardingOrigin || 'ORGANIC_SIGNUP'

// En session() callback:
session.user.requirePasswordChange = token.requirePasswordChange
session.user.wizardCompleted = token.wizardCompleted
session.user.onboardingOrigin = token.onboardingOrigin
```

**Tipos TypeScript actualizados en:** `/types/next-auth.d.ts`

---

## 📱 Plantillas de WhatsApp en Meta Business Manager

### Requisitos:

Las siguientes plantillas deben ser **creadas y aprobadas** en Meta Business Manager antes de usar el sistema:

#### 1. `vision_magiclink_template` (RECOMENDADO)

**Categoría:** Account Update

**Idioma:** Español (es_MX)

**Cuerpo:**
```
¡Hola {{1}}! Bienvenido a tu transformación con {{2}}. 

🔐 Hemos creado tu cuenta en Quantum.

Activa tu cuenta de forma segura aquí:
👉 {{3}}

Este enlace expira en 7 días.
```

**Variables:**
1. `{{1}}`: Nombre del usuario
2. `{{2}}`: Nombre de la Visión
3. `{{3}}`: URL del Magic Link

---

#### 2. `vision_welcome_template` (Alternativa con contraseña)

**Categoría:** Account Update

**Idioma:** Español (es_MX)

**Cuerpo:**
```
¡Hola {{1}}! Bienvenido a tu transformación con {{2}}.

🔐 Tu acceso temporal:
📧 Usuario: {{3}}
🔑 Clave: {{4}}

Activa tu cuenta y asegura tu perfil aquí:
👉 {{5}}
```

**Variables:**
1. `{{1}}`: Nombre del usuario
2. `{{2}}`: Nombre de la Visión
3. `{{3}}`: Email
4. `{{4}}`: Contraseña temporal
5. `{{5}}`: URL de login

---

#### 3. `organic_welcome_template`

**Categoría:** Account Update

**Idioma:** Español (es_MX)

**Cuerpo:**
```
¡Bienvenido a la tribu, {{1}}! 🚀

Tu cuenta está lista. Es momento de diseñar tu vida.

Entra directo al Wizard de Planeación:
👉 {{2}}
```

**Variables:**
1. `{{1}}`: Nombre del usuario
2. `{{2}}`: URL del wizard

---

## 🔧 Configuración

### Variables de Entorno (`.env`)

```bash
# WhatsApp Business API
WHATSAPP_PHONE_NUMBER_ID="123456789012345"
WHATSAPP_ACCESS_TOKEN="EAAxxxxxxxxxx..."
WHATSAPP_API_VERSION="v18.0"

# NextAuth
NEXTAUTH_SECRET="tu-secreto-minimo-32-caracteres"
NEXT_PUBLIC_APP_URL="https://app.frutos.com"
```

### Obtener Credenciales de WhatsApp:

1. **Crear Business App en Meta:**
   - Ve a https://developers.facebook.com/
   - Create App → Business → WhatsApp

2. **Configurar WhatsApp Business:**
   - Agrega el producto "WhatsApp"
   - Verifica tu número de teléfono
   - Copia el `Phone Number ID`

3. **Generar Access Token:**
   - En el panel de WhatsApp
   - Settings → API Access
   - Generate Token (permanente)

4. **Crear Plantillas:**
   - WhatsApp Manager → Message Templates
   - Crear las 3 plantillas mencionadas
   - Esperar aprobación (24-48 horas)

---

## 🧪 Testing

### Test Manual - Magic Link:

```bash
# 1. Crear usuario importado
POST /api/school-admin/visiones/1/add-emails
Body: { "emails": "test@example.com" }

# 2. Verificar en base de datos
SELECT email, magicLinkToken, magicLinkExpiry, onboardingOrigin
FROM Usuario WHERE email = 'test@example.com';

# 3. Abrir Magic Link
GET /api/auth/activate?token=[magicLinkToken]

# 4. Cambiar contraseña
- UI redirige a /auth/change-password?magic=true
- Ingresar nueva contraseña
- Submit

# 5. Verificar redirección
- Si wizardCompleted=false → /wizard
- Si wizardCompleted=true → /dashboard
```

### Test Manual - WhatsApp (Sandbox):

```javascript
// En consola de desarrollo
import { sendVisionMagicLinkMessage } from '@/lib/whatsapp';

await sendVisionMagicLinkMessage(
  '+5215551234567', // Tu número de prueba
  'Juan Pérez',
  'Visión Empresarial 2025',
  'test-magic-token-12345'
);
```

---

## 🎯 Flujos de Usuario Completos

### FLUJO A: Usuario Importado (Magic Link)

1. **Director agrega usuario:**
   - Email: `juan@example.com`
   - Sistema genera token único
   - Guarda en BD con expiración 7 días

2. **Sistema envía WhatsApp:**
   - Plantilla: `vision_magiclink_template`
   - Link: `app.frutos.com/api/auth/activate?token=xxx`

3. **Usuario da click:**
   - Sistema valida token
   - Crea sesión temporal (1 hora)
   - Redirige a `/auth/change-password?magic=true`

4. **Usuario crea contraseña:**
   - Ingresa nueva contraseña
   - Sistema valida fortaleza
   - Actualiza BD: `requirePasswordChange = false`

5. **Auto-login:**
   - Sistema hace login automático
   - Redirige a `/wizard` (primer uso)

6. **Wizard de Onboarding:**
   - Usuario completa wizard
   - Sistema marca `wizardCompleted = true`
   - Redirige a `/dashboard`

---

### FLUJO B: Usuario Orgánico

1. **Usuario se registra:**
   - Llena formulario con email, pass, teléfono
   - POST `/api/usuarios/crear`
   - Sistema: `onboardingOrigin = 'ORGANIC_SIGNUP'`

2. **Sistema envía WhatsApp:**
   - Plantilla: `organic_welcome_template`
   - Link directo a `/wizard`

3. **Usuario hace login:**
   - Middleware detecta: `!wizardCompleted`
   - Redirige automáticamente a `/wizard`

4. **Usuario completa wizard:**
   - Sistema marca `wizardCompleted = true`
   - Redirige a `/dashboard`

5. **Siguientes logins:**
   - Middleware detecta: `wizardCompleted = true`
   - Va directo a `/dashboard`

---

## 🚨 Troubleshooting

### WhatsApp no se envía:

**Verificar:**
```bash
# 1. Logs del servidor
console.log('📱 WhatsApp enviado a...') # Debe aparecer

# 2. Variables de entorno
echo $WHATSAPP_PHONE_NUMBER_ID
echo $WHATSAPP_ACCESS_TOKEN

# 3. Plantillas aprobadas
- Ir a Meta Business Manager
- WhatsApp Manager → Message Templates
- Verificar status: "Approved"
```

**Error común:** `Template not found`
- Solución: Crear plantilla y esperar aprobación

---

### Magic Link expira inmediatamente:

**Verificar timezone del servidor:**
```javascript
// En API
console.log('Server time:', new Date());
console.log('Token expiry:', tokenExpiry);

// Debe ser: tokenExpiry > new Date()
```

---

### Redirect loop en middleware:

**Verificar orden de condiciones:**
- `requirePasswordChange` debe chequearse PRIMERO
- `wizardCompleted` debe chequearse SEGUNDO
- Excluir `/api/` de todos los checks

---

## 📊 Métricas Sugeridas

```sql
-- Usuarios por origen
SELECT onboardingOrigin, COUNT(*) 
FROM Usuario 
GROUP BY onboardingOrigin;

-- Tasa de completación de wizard
SELECT 
  COUNT(CASE WHEN wizardCompleted THEN 1 END) * 100.0 / COUNT(*) as completion_rate
FROM Usuario 
WHERE createdAt > NOW() - INTERVAL '30 days';

-- Usuarios con password temporal pendiente
SELECT COUNT(*) 
FROM Usuario 
WHERE requirePasswordChange = true;

-- Magic Links expirados sin usar
SELECT COUNT(*) 
FROM Usuario 
WHERE magicLinkToken IS NOT NULL 
AND magicLinkExpiry < NOW();
```

---

## 🔐 Seguridad

### Magic Link:
- ✅ Token único de 64 caracteres
- ✅ Expira en 7 días
- ✅ Uso único (se invalida después de usar)
- ✅ Sesión temporal de 1 hora
- ✅ No requiere contraseña por WhatsApp

### Contraseñas:
- ✅ Bcrypt con 10 rounds
- ✅ Validación de fortaleza
- ✅ Sin contraseñas en logs
- ✅ Temporary password como backup

### WhatsApp:
- ⚠️ No enviar contraseñas por WhatsApp (usar Magic Link)
- ✅ Plantillas aprobadas por Meta
- ✅ Solo números verificados pueden recibir

---

## 📚 Referencias

- [Meta Cloud API Docs](https://developers.facebook.com/docs/whatsapp/cloud-api)
- [WhatsApp Template Guidelines](https://developers.facebook.com/docs/whatsapp/message-templates/guidelines)
- [NextAuth.js JWT Strategy](https://next-auth.js.org/configuration/options#jwt)
- [Prisma Migrations](https://www.prisma.io/docs/concepts/components/prisma-migrate)

---

## ✅ Checklist de Deployment

- [ ] Migrar base de datos: `npx prisma migrate deploy`
- [ ] Configurar variables de entorno en producción
- [ ] Crear y aprobar plantillas de WhatsApp en Meta
- [ ] Verificar número de teléfono en WhatsApp Business
- [ ] Test de envío de WhatsApp en producción
- [ ] Test de Magic Link end-to-end
- [ ] Test de middleware redirects
- [ ] Configurar domain whitelist en Meta
- [ ] Configurar NEXTAUTH_URL en producción
- [ ] Test de auto-login después de cambio de password

---

**Última actualización:** 26 de diciembre de 2025
**Versión:** 1.0.0
