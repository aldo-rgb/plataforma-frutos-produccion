# 🎯 Sistema de Tiers y Modelo Freemium

## 📋 Resumen Ejecutivo

Sistema de 3 niveles (FREE, STANDARD, PREMIUM) que permite:
- ✅ Onboarding gratuito completo
- ✅ Wizard de carta sin pago
- ✅ Validación automática para usuarios FREE
- ✅ Monetización al finalizar wizard
- ✅ Licencias B2B para escuelas

## 🔧 Cambios Implementados

### 1. Schema de Base de Datos ✅

**Nuevos campos en Usuario:**
```prisma
tier                String          @default("FREE")     // FREE, STANDARD, PREMIUM
subscriptionStatus  String          @default("INACTIVE") // INACTIVE, ACTIVE, ACTIVE_BY_LICENSE
licenseCode         String?
schoolId            Int?
```

**Nueva tabla License:**
```prisma
model License {
  code          String   @unique
  schoolId      Int?
  schoolName    String?
  tierAssigned  UserTier @default(STANDARD)
  maxUses       Int      @default(100)
  usedCount     Int      @default(0)
  expiresAt     DateTime?
  isActive      Boolean  @default(true)
}
```

**Nuevo Enum:**
```prisma
enum UserTier {
  FREE      // Autogestión - Sin mentor
  STANDARD  // Accountability - Con mentor
  PREMIUM   // Coaching 1:1
}
```

### 2. Migración Aplicada ✅

```bash
npx prisma db push  # ✅ Ejecutado
npx prisma generate # ✅ Ejecutado
```

**Usuarios existentes:**
- Automáticamente asignados a `tier: FREE`
- `subscriptionStatus: INACTIVE`

## 🎨 Flujo del Usuario

### Paso 1: Registro (Sin Cambios)
```
Usuario se registra → Email verificado → Login exitoso
```

### Paso 2: Wizard (DESBLOQUEADO)
```
Usuario FREE puede:
✅ Acceder al Wizard completo
✅ Crear su Carta F.R.U.T.O.S.
✅ Ver todo el dashboard
✅ Navegar sidebar (con items bloqueados)
```

### Paso 3: Elección de Camino (NUEVO)
**Trigger:** Al hacer clic en "Enviar Carta a Autorización"

**Modal de 3 Opciones:**

#### Opción A: Autogestión (GRATIS)
```
🐺 "Soy un lobo solitario"

Features:
✅ Acceso total al dashboard
⚡ Autorización automática
🤖 Validación automática de evidencias
🚫 Sin puntos cuánticos
🚫 Sin mentor humano
🚫 Sin programa intensivo

Botón: "Activar Plan Gratuito"
```

#### Opción B: Standard ($1,200 MXN/año)
```
💪 "Quiero rendir cuentas"

Features:
✅ Todo lo de Gratis
👮 Revisión por mentor
📸 Validación real de evidencias
💎 Genera puntos cuánticos (500 PC bono)
📞 Llamadas grupales (Programa Intensivo)

Botón: "Suscribirme - $1,200/año"
```

#### Opción C: Premium ($5,000 MXN/año)
```
🚀 "Salto Cuántico"

Features:
✅ Todo lo de Standard
🤝 2 sesiones de coaching 1:1/mes
👑 Prioridad en soporte
⚡ Acceso early a features

Botón: "Suscribirme - $5,000/año"
```

#### Footer: Licencia Escolar
```
🏫 "Tengo código de licencia escolar"
Input: [Ingresa tu código]
Botón: "Validar Código"
```

## 🔐 Reglas de Negocio por Tier

### FREE (Autogestión)

**Carta:**
```typescript
if (user.tier === 'FREE') {
  carta.status = 'AUTHORIZED';
  carta.authorizedAt = new Date();
  // ⚠️ NO se envía a mentor
}
```

**Evidencias:**
```typescript
if (user.tier === 'FREE') {
  evidence.status = 'APPROVED_AUTO';
  evidence.pointsAwarded = 0; // ⚠️ SIN PUNTOS
}
```

**Wallet:**
```typescript
if (user.tier === 'FREE') {
  user.puntosCuanticos = 0; // Siempre en 0
  // No se otorgan 500 PC de bienvenida
}
```

**Restricciones:**
- ❌ No puede agendar llamadas
- ❌ No puede acceder a programa intensivo
- ❌ No puede participar en ranking
- ⚠️ Puede ver tareas extraordinarias pero sin reclamar PC

### STANDARD (Con Mentor)

**Carta:**
```typescript
if (user.tier === 'STANDARD') {
  carta.status = 'UNDER_REVIEW';
  notifyMentor(carta.mentorId);
  // ✅ Flujo normal de revisión
}
```

**Evidencias:**
```typescript
if (user.tier === 'STANDARD') {
  evidence.status = 'PENDING_REVIEW';
  // ✅ Mentor valida y otorga puntos
}
```

**Wallet:**
```typescript
if (user.tier === 'STANDARD') {
  user.puntosCuanticos = 500; // Bono de bienvenida
  // ✅ Gana PC por tareas y evidencias
}
```

**Acceso:**
- ✅ Llamadas grupales (Programa Intensivo)
- ✅ Revisión de mentor
- ✅ Puntos cuánticos
- ✅ Ranking global

### PREMIUM (Coaching)

Todo lo de STANDARD más:
- ✅ 2 sesiones de coaching 1:1 mensuales
- ✅ Prioridad en soporte
- ✅ Acceso early a features
- ✅ Mentor personal asignado

## 🏫 Sistema de Licencias B2B

### Crear Licencia (Admin)

```typescript
// POST /api/admin/licenses
const license = await prisma.license.create({
  data: {
    code: 'TECMILENIO-2025-BATCH1',
    schoolId: 1,
    schoolName: 'Tec de Monterrey',
    tierAssigned: 'STANDARD',
    maxUses: 100,
    expiresAt: new Date('2025-12-31')
  }
});
```

### Canjear Licencia (Usuario)

```typescript
// POST /api/redeem-license
const license = await prisma.license.findUnique({
  where: { code: inputCode }
});

if (!license || !license.isActive) {
  throw new Error('Código inválido');
}

if (license.usedCount >= license.maxUses) {
  throw new Error('Código agotado');
}

if (license.expiresAt && license.expiresAt < new Date()) {
  throw new Error('Código expirado');
}

// ✅ Activar licencia
await prisma.usuario.update({
  where: { id: userId },
  data: {
    tier: license.tierAssigned,
    subscriptionStatus: 'ACTIVE_BY_LICENSE',
    licenseCode: license.code,
    schoolId: license.schoolId,
    puntosCuanticos: { increment: 500 } // Bono
  }
});

await prisma.license.update({
  where: { code: inputCode },
  data: { usedCount: { increment: 1 } }
});
```

## 🎯 Items del Sidebar por Tier

### 🔓 DESBLOQUEADOS para TODOS:
- Dashboard
- Carta F.R.U.T.O.S. (Wizard)
- Guía de Inicio
- Mentor IA (Hook de venta)
- Solicitar Mentoría (Upsell)

### 🔒 BLOQUEADOS para FREE:
- Programa Intensivo
- Mis Sesiones
- Muro de la Excelencia (Ranking)
- The Vault (Puede ver pero sin PC)

## 📊 Estrategia de Conversión

### Hook 1: Mentor IA
```
Usuario FREE usa Mentor IA → Recibe sugerencias poderosas → 
CTA: "Con un mentor humano, tu progreso sería 3x más rápido"
```

### Hook 2: Tareas Extraordinarias
```
Usuario FREE ve tarea de 500 PC → Intenta reclamar →
Modal: "🔒 Actualiza a Standard para reclamar estos 500 PC"
```

### Hook 3: Validación Manual
```
Usuario FREE sube evidencia → Auto-aprobada sin feedback →
Banner: "Con un mentor, recibirías feedback personalizado"
```

### Hook 4: Ranking
```
Usuario FREE completa tareas → No aparece en ranking →
CTA: "Únete al ranking global con Standard"
```

## 🚀 Estado Actual de Implementación

### ✅ COMPLETADO:
1. Schema de base de datos actualizado
2. Migración aplicada
3. Tabla de licencias creada
4. Enum UserTier definido
5. z-index del modal de pago corregido

### 🔄 EN PROGRESO:
1. Desbloqueo del sidebar
2. Modal de elección de plan
3. Lógica de auto-aprobación
4. Endpoint de licencias
5. Restricciones por tier

### ⏳ PENDIENTE:
1. UI de licencias para admin
2. Analytics de conversión
3. Email marketing por tier
4. Upsells contextuales
5. A/B testing de precios

## 📝 Notas Importantes

### Migración de Usuarios Existentes
```sql
-- Todos los usuarios existentes son FREE por defecto
-- Para migrar usuarios pagos actuales:
UPDATE "Usuario" 
SET tier = 'STANDARD', 
    subscriptionStatus = 'ACTIVE',
    puntosCuanticos = 500
WHERE suscripcion = 'ACTIVO';
```

### Testing del Sistema
```typescript
// 1. Crear usuario nuevo → Debe ser FREE
// 2. Completar wizard → Debe ver modal de elección
// 3. Elegir FREE → Carta auto-aprobada
// 4. Subir evidencia → Auto-aprobada sin PC
// 5. Ver sidebar → Items bloqueados con 🔒
// 6. Intentar agendar llamada → Bloqueado con upsell
```

## 🔗 Enlaces Importantes

- **Archivo Schema:** `/prisma/schema.prisma`
- **Modal de Pago:** `/app/dashboard/suscripcion/page.tsx`
- **Wizard:** `/components/dashboard/CartaWizard.tsx`
- **Sidebar:** (Buscar componente Sidebar)

---

**Fecha:** 23 de diciembre de 2025  
**Status:** 🟡 En implementación  
**Prioridad:** 🔥 CRÍTICO - Bloqueante para launch
