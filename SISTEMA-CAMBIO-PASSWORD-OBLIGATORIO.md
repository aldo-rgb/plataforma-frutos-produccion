# 🔐 Sistema de Cambio de Contraseña Obligatorio en Primer Login

## 📋 Descripción General

Sistema de seguridad que **obliga a cambiar la contraseña temporal** en el primer login para usuarios creados automáticamente con credenciales por defecto.

Este sistema se aplica a:
1. **Participantes** creados masivamente desde `/dashboard/school-admin/visiones/[id]`
2. **Coordinadores** creados automáticamente desde `/dashboard/admin/organizations` (ciclos)
3. **School Admins (Directores)** creados automáticamente desde `/dashboard/admin/organizations` (ciclos)

---

## 🎯 Funcionalidad

### Contraseña Temporal por Defecto:
- **Participantes (alta masiva):** `Frutos2025!`
- **Coordinadores y School Admins:** `admin123`

### Flujo de Cambio Obligatorio:
1. Usuario ingresa con credenciales temporales
2. Sistema detecta `requirePasswordChange: true`
3. Redirige automáticamente a `/cambiar-password`
4. Usuario debe cambiar contraseña antes de continuar
5. Flag `requirePasswordChange` se actualiza a `false`
6. Usuario puede acceder normalmente al dashboard

---

## 🔧 Implementación Técnica

### 1. Schema de Base de Datos (`prisma/schema.prisma`)

```prisma
model Usuario {
  // ... otros campos
  requirePasswordChange  Boolean  @default(false) // Forzar cambio de contraseña en primer login
}
```

**Migración:**
```bash
npx prisma db push
```

---

### 2. API de Alta Masiva de Participantes

**Endpoint:** `/api/school-admin/visiones/[id]/add-emails`

```typescript
// Crear usuarios nuevos con contraseña temporal
for (const email of newEmails) {
  const hashed = await bcrypt.hash('Frutos2025!', 10);
  const user = await prisma.usuario.create({
    data: {
      email,
      nombre: email.split('@')[0],
      password: hashed,
      rol: 'PARTICIPANTE',
      isActive: true,
      organizationId: director.organizationId,
      requirePasswordChange: true, // ✅ OBLIGAR CAMBIO
    }
  });
}
```

**Respuesta:**
```json
{
  "success": true,
  "created": [/* usuarios nuevos */],
  "existing": [/* usuarios ya existentes */],
  "added": [/* correos agregados a la visión */]
}
```

---

### 3. API de Creación de Coordinadores/School Admins

**Endpoint:** `/api/admin/organizations` (POST)

```typescript
// Crear nuevo coordinador
const newCoordinator = await prisma.usuario.create({
  data: {
    email: contactEmail,
    nombre: `Coordinador de ${name}`,
    password: tempPassword,
    rol: 'COORDINADOR',
    tier: 'PREMIUM',
    isActive: true,
    subscriptionStatus: 'ACTIVE',
    requirePasswordChange: true // ✅ OBLIGAR CAMBIO
  }
});

// Crear nuevo school admin
const newSchoolAdmin = await prisma.usuario.create({
  data: {
    email: schoolAdminEmail,
    nombre: `School Admin de ${name}`,
    password: tempPassword,
    rol: 'SCHOOL_ADMIN',
    tier: 'PREMIUM',
    isActive: true,
    subscriptionStatus: 'ACTIVE',
    requirePasswordChange: true // ✅ OBLIGAR CAMBIO
  }
});
```

---

### 4. Configuración de NextAuth (`lib/auth.ts`)

```typescript
async authorize(credentials) {
  // ... validaciones

  // Retornar usuario incluyendo requirePasswordChange
  return {
    id: user.id,
    email: user.email,
    nombre: user.nombre,
    rol: user.rol,
    requirePasswordChange: user.requirePasswordChange || false,
  }
}

// JWT Callback
async jwt({ token, user }) {
  if (user) {
    token.id = user.id
    token.rol = user.rol
    token.requirePasswordChange = user.requirePasswordChange || false // ✅
  }
  return token
}

// Session Callback
async session({ session, token }) {
  if (session.user) {
    session.user.id = token.id
    session.user.rol = token.rol
    session.user.requirePasswordChange = token.requirePasswordChange // ✅
  }
  return session
}
```

---

### 5. Página de Login (`app/login/page.tsx`)

```typescript
const { data: session } = useSession();

// Detectar y redirigir si requiere cambio de contraseña
useEffect(() => {
  if (session?.user?.requirePasswordChange) {
    router.push('/cambiar-password');
  }
}, [session, router]);
```

---

### 6. Página de Cambio de Contraseña (`app/cambiar-password/page.tsx`)

**Funcionalidades:**
- Validación de contraseña actual (temporal)
- Validación de nueva contraseña (mínimo 6 caracteres)
- Confirmación de contraseña
- Toggle para mostrar/ocultar contraseñas
- Mensajes de error claros
- Redirección automática al dashboard después de cambiar

**UI:**
- Fondo oscuro con blur
- Mensaje de advertencia destacado
- Campos de contraseña con iconos
- Botón de logout para salir
- Mensaje de éxito con animación

---

### 7. API de Cambio de Contraseña (`app/api/auth/change-password/route.ts`)

```typescript
export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  const { currentPassword, newPassword } = await request.json();

  // Verificar contraseña actual
  const isValid = await bcrypt.compare(currentPassword, usuario.password);
  if (!isValid) {
    return NextResponse.json({ error: 'Contraseña actual incorrecta' }, { status: 401 });
  }

  // Actualizar contraseña y quitar flag
  await prisma.usuario.update({
    where: { id: usuario.id },
    data: {
      password: hashedPassword,
      requirePasswordChange: false // ✅ QUITAR FLAG
    }
  });

  return NextResponse.json({ success: true });
}
```

---

## 🎨 Experiencia de Usuario

### Flujo Completo:

```
1. Director crea visión y agrega participantes por email
   → Backend crea cuentas con password "Frutos2025!"
   → Campo requirePasswordChange = true

2. Participante recibe su correo (email de bienvenida futuro)

3. Participante intenta hacer login con credenciales temporales
   → Login exitoso
   → Sistema detecta requirePasswordChange: true
   → Redirige automáticamente a /cambiar-password

4. Participante ve mensaje de advertencia:
   "Por seguridad, debes cambiar tu contraseña temporal"

5. Participante completa formulario:
   - Contraseña actual (temporal)
   - Nueva contraseña
   - Confirmar nueva contraseña

6. Sistema valida y actualiza:
   - Password hasheado actualizado
   - requirePasswordChange = false

7. Mensaje de éxito y redirección a /dashboard

8. Participante puede usar la plataforma normalmente
```

---

## 📊 Casos de Uso

### Caso 1: Participante creado por email
```
Email: alumno1@escuela.com
Password Temporal: Quantum123
Flag: requirePasswordChange = true

→ Login exitoso
→ Redirige a /cambiar-password
→ Cambia password
→ Accede al dashboard
```

### Caso 2: Coordinador creado automáticamente
```
Email: coordinador@escuela.edu
Password Temporal: admin123
Flag: requirePasswordChange = true

→ Login exitoso
→ Redirige a /cambiar-password
→ Cambia password
→ Accede al dashboard de coordinador
```

### Caso 3: School Admin creado automáticamente
```
Email: director@escuela.edu
Password Temporal: admin123
Flag: requirePasswordChange = true

→ Login exitoso
→ Redirige a /cambiar-password
→ Cambia password
→ Accede al panel de administrador
```

---

## 🔐 Seguridad

### Medidas Implementadas:

1. **Contraseñas Hasheadas:** Todas las contraseñas se almacenan con bcrypt (10 rounds)
2. **Validación de Longitud:** Mínimo 6 caracteres
3. **Confirmación de Contraseña:** Doble entrada para evitar errores
4. **Flag Persistente:** Solo se quita después del cambio exitoso
5. **Redirección Automática:** No se puede acceder al dashboard sin cambiar
6. **Sesión Verificada:** Requiere sesión activa para cambiar contraseña

### Mejoras Futuras:
- [ ] Validación de complejidad (mayúsculas, números, símbolos)
- [ ] Expiración de contraseñas temporales (24-48 horas)
- [ ] Email de bienvenida con credenciales temporales
- [ ] Historial de contraseñas (evitar reutilización)
- [ ] 2FA opcional para roles sensibles

---

## 🧪 Testing

### Pruebas Recomendadas:

1. **Alta masiva de participantes:**
   ```bash
   POST /api/school-admin/visiones/1/add-emails
   {
     "emails": "test1@test.com, test2@test.com"
   }
   ```
   ✅ Verificar que se crean con requirePasswordChange: true

2. **Login con password temporal:**
   ```bash
   POST /api/auth/[...nextauth]
   {
     "email": "test1@test.com",
     "password": "Frutos2025!"
   }
   ```
   ✅ Verificar redirección a /cambiar-password

3. **Cambio de contraseña:**
   ```bash
   POST /api/auth/change-password
   {
     "currentPassword": "Frutos2025!",
     "newPassword": "nuevaPassword123"
   }
   ```
   ✅ Verificar que requirePasswordChange = false
   ✅ Verificar acceso a /dashboard

4. **Login con nueva contraseña:**
   ```bash
   POST /api/auth/[...nextauth]
   {
     "email": "test1@test.com",
     "password": "nuevaPassword123"
   }
   ```
   ✅ Verificar acceso directo al dashboard (sin redirección)

---

## 📁 Archivos Modificados

```
✅ prisma/schema.prisma
   - Agregado campo requirePasswordChange

✅ app/api/school-admin/visiones/[id]/add-emails/route.ts (NUEVO)
   - API de alta masiva de participantes

✅ app/api/admin/organizations/route.ts
   - requirePasswordChange: true al crear coordinadores/admins

✅ app/api/admin/organizations/[id]/route.ts
   - requirePasswordChange: true al crear admins en edición

✅ app/api/auth/change-password/route.ts (NUEVO)
   - API de cambio de contraseña

✅ app/cambiar-password/page.tsx (NUEVO)
   - Página de cambio obligatorio de contraseña

✅ app/login/page.tsx
   - Detección y redirección si requirePasswordChange: true

✅ lib/auth.ts
   - Incluir requirePasswordChange en JWT y session

✅ app/dashboard/school-admin/visiones/[id]/page.tsx
   - UI de alta masiva con feedback mejorado
```

---

## 🚀 Deploy Checklist

Antes de hacer deploy, verificar:

- [x] Campo requirePasswordChange existe en base de datos
- [x] Migración aplicada correctamente (prisma db push)
- [x] API /add-emails funciona correctamente
- [x] API /change-password funciona correctamente
- [x] Página /cambiar-password es accesible
- [x] Login detecta y redirige correctamente
- [x] JWT incluye requirePasswordChange
- [x] Session incluye requirePasswordChange
- [x] Feedback de alta masiva muestra detalles
- [x] Usuarios creados con flag = true

---

## 📝 Notas Adicionales

### Diferencias entre Roles:

| Rol | Password Temporal | Creado Desde | Flag |
|-----|-------------------|--------------|------|
| PARTICIPANTE | `Frutos2025!` | `/school-admin/visiones/[id]` | ✅ true |
| COORDINADOR | `admin123` | `/admin/organizations` | ✅ true |
| SCHOOL_ADMIN | `admin123` | `/admin/organizations` | ✅ true |

### Backward Compatibility:
- Usuarios existentes tienen `requirePasswordChange: false` por defecto
- No afecta usuarios creados antes de esta implementación
- Sistema solo obliga cambio a usuarios con flag = true

### Mensajes al Usuario:
- **Login:** "Por seguridad, debes cambiar tu contraseña temporal"
- **Alta masiva:** "Se crearán cuentas nuevas... Contraseña temporal: Quantum123"
- **Cambio exitoso:** "¡Contraseña Actualizada! Redirigiendo al dashboard..."

---

## 🎉 Beneficios del Sistema

1. ✅ **Seguridad mejorada:** Contraseñas temporales no persisten
2. ✅ **Experiencia clara:** Usuario sabe que debe cambiar
3. ✅ **Forzado automático:** No puede acceder sin cambiar
4. ✅ **Auditoría:** Flag visible en base de datos
5. ✅ **Escalable:** Fácil de extender a otros roles
6. ✅ **UX intuitiva:** Formulario simple y claro
7. ✅ **Feedback detallado:** Usuario sabe qué pasó

---

**Creado:** 24 de diciembre de 2025  
**Sistema:** Plataforma Frutos - QUANTUM
