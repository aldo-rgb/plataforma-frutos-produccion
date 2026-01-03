# 🎯 IMPLEMENTACIÓN FINAL - Sistema de Tiers

## ✅ Ya Completado

1. Schema de base de datos actualizado
2. Tabla `License` creada
3. Enum `UserTier` (FREE, STANDARD, PREMIUM)
4. Endpoint `/api/redeem-license` creado
5. Script de migración `scripts/migrate-tiers.js`
6. z-index del modal de pago corregido

## 🔧 Pasos Pendientes CRÍTICOS

### 1. EJECUTAR MIGRACIÓN (AHORA)

```bash
cd /Users/aldokmps/plataforma-frutos-FINAL
node scripts/migrate-tiers.js
```

Esto actualizará los usuarios existentes con suscripción activa a STANDARD.

---

### 2. BUSCAR Y MODIFICAR EL SIDEBAR

**Ubicación probable:**
- `components/Sidebar.tsx`
- `components/Layout.tsx`
- `components/dashboard/Sidebar.tsx`
- `app/(dashboard)/layout.tsx`

**Buscar esta condición:**
```typescript
if (!user.hasPlan) return null;
// o
if (user.suscripcion !== 'ACTIVO') return null;
```

**ELIMINAR esa condición completamente.**

**Agregar lógica de candados:**

```typescript
'use client';

import { Lock } from 'lucide-react';
import { useSession } from 'next-auth/react';

// ... tu código del sidebar

const SidebarItem = ({ href, icon, label, requiredTier }: { 
  href: string;
  icon: React.ReactNode;
  label: string;
  requiredTier?: 'FREE' | 'STANDARD' | 'PREMIUM';
}) => {
  const { data: session } = useSession();
  const userTier = session?.user?.tier || 'FREE';
  
  const tierLevel = {
    'FREE': 1,
    'STANDARD': 2,
    'PREMIUM': 3
  };
  
  const isBlocked = requiredTier && tierLevel[userTier] < tierLevel[requiredTier];
  
  return (
    <Link 
      href={isBlocked ? '#' : href}
      onClick={(e) => {
        if (isBlocked) {
          e.preventDefault();
          // Modal de upsell
          alert('🔒 Actualiza a ' + requiredTier + ' para desbloquear esta función');
        }
      }}
      className={`sidebar-item ${isBlocked ? 'opacity-50' : ''}`}
    >
      {icon}
      <span>{label}</span>
      {isBlocked && <Lock size={16} className="ml-auto text-orange-500" />}
    </Link>
  );
};

// Usar así:
<SidebarItem href="/dashboard" icon={<Home />} label="Dashboard" />
<SidebarItem href="/dashboard/carta" icon={<FileText />} label="Mi Carta" />
<SidebarItem href="/dashboard/mentor-ia" icon={<Bot />} label="Mentor IA" />

{/* BLOQUEADOS PARA FREE */}
<SidebarItem 
  href="/dashboard/programa" 
  icon={<Calendar />} 
  label="Programa Intensivo" 
  requiredTier="STANDARD" 
/>
<SidebarItem 
  href="/dashboard/sesiones" 
  icon={<Video />} 
  label="Mis Sesiones" 
  requiredTier="STANDARD" 
/>
<SidebarItem 
  href="/dashboard/ranking" 
  icon={<Trophy />} 
  label="Ranking Global" 
  requiredTier="STANDARD" 
/>
```

---

### 3. MODIFICAR EL WIZARD (Al enviar carta)

**Archivo:** Buscar donde se envía la carta (probablemente `CartaWizard.tsx` o un endpoint)

**Buscar:**
```typescript
// Función que envía la carta al backend
const handleSubmit = async () => {
  // ... código actual
  await fetch('/api/carta/submit', { ... });
};
```

**MODIFICAR para mostrar modal ANTES de enviar:**

```typescript
const [showPlanModal, setShowPlanModal] = useState(false);
const [selectedTier, setSelectedTier] = useState<'FREE' | 'STANDARD' | 'PREMIUM' | null>(null);

const handleInitialSubmit = () => {
  // En lugar de enviar directamente, mostrar modal
  setShowPlanModal(true);
};

const handleConfirmPlan = async (tier: 'FREE' | 'STANDARD' | 'PREMIUM') => {
  setSelectedTier(tier);
  
  if (tier === 'FREE') {
    // Usuario gratis: Enviar carta directamente
    await fetch('/api/carta/submit', {
      method: 'POST',
      body: JSON.stringify({ ...cartaData, autoApprove: true })
    });
    
    setShowPlanModal(false);
    router.push('/dashboard?welcome=free');
    
  } else {
    // Usuario de pago: Redirigir a checkout
    router.push(`/dashboard/suscripcion?tier=${tier}&returnTo=/dashboard/carta/submit`);
  }
};

// JSX del modal
{showPlanModal && (
  <div className="fixed inset-0 z-40 bg-black/90 flex items-center justify-center p-4">
    <div className="bg-slate-900 rounded-2xl max-w-6xl w-full p-8">
      <h2 className="text-3xl font-bold text-white mb-4 text-center">
        🎯 Has diseñado tu vida. Ahora, elige quién te acompañará.
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {/* Opción FREE */}
        <div className="border-2 border-gray-700 rounded-xl p-6 hover:border-blue-500 transition-all">
          <h3 className="text-2xl font-bold mb-2">🐺 Autogestión</h3>
          <p className="text-gray-400 text-sm mb-4">"Soy un lobo solitario"</p>
          <p className="text-4xl font-black text-white mb-6">GRATIS</p>
          
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Acceso al Dashboard
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Autorización Inmediata
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Validación Automática
            </li>
            <li className="flex items-center gap-2 text-red-400">
              <X size={16} /> Sin Puntos Cuánticos
            </li>
            <li className="flex items-center gap-2 text-red-400">
              <X size={16} /> Sin Mentor Humano
            </li>
          </ul>
          
          <button
            onClick={() => handleConfirmPlan('FREE')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 rounded-lg font-bold"
          >
            Activar Plan Gratuito
          </button>
        </div>

        {/* Opción STANDARD */}
        <div className="border-2 border-purple-500 rounded-xl p-6 bg-purple-500/5 transform scale-105">
          <div className="bg-purple-500 text-white text-xs font-bold px-3 py-1 rounded-full inline-block mb-2">
            RECOMENDADO
          </div>
          <h3 className="text-2xl font-bold mb-2">💪 Standard</h3>
          <p className="text-gray-400 text-sm mb-4">"Quiero rendir cuentas"</p>
          <p className="text-4xl font-black text-white mb-1">$1,200</p>
          <p className="text-gray-400 text-sm mb-4">/año</p>
          
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Todo lo de Gratis
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Revisión por Mentor
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Puntos Cuánticos (500 PC bono)
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Llamadas Grupales
            </li>
          </ul>
          
          <button
            onClick={() => handleConfirmPlan('STANDARD')}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white py-3 rounded-lg font-bold"
          >
            Suscribirme - $1,200/año
          </button>
        </div>

        {/* Opción PREMIUM */}
        <div className="border-2 border-orange-500 rounded-xl p-6">
          <h3 className="text-2xl font-bold mb-2">🚀 Premium</h3>
          <p className="text-gray-400 text-sm mb-4">"Salto Cuántico"</p>
          <p className="text-4xl font-black text-white mb-1">$5,000</p>
          <p className="text-gray-400 text-sm mb-4">/año</p>
          
          <ul className="space-y-2 mb-6 text-sm">
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Todo lo de Standard
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> 2 Sesiones Coaching 1:1/mes
            </li>
            <li className="flex items-center gap-2 text-green-400">
              <Check size={16} /> Prioridad en Soporte
            </li>
          </ul>
          
          <button
            onClick={() => handleConfirmPlan('PREMIUM')}
            className="w-full bg-orange-600 hover:bg-orange-700 text-white py-3 rounded-lg font-bold"
          >
            Suscribirme - $5,000/año
          </button>
        </div>
      </div>

      {/* Footer: Código de licencia */}
      <div className="mt-8 pt-6 border-t border-gray-800 text-center">
        <p className="text-gray-400 text-sm mb-3">🏫 ¿Tienes código de licencia escolar?</p>
        <div className="flex gap-3 max-w-md mx-auto">
          <input
            type="text"
            placeholder="Ingresa tu código"
            className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            value={licenseCode}
            onChange={(e) => setLicenseCode(e.target.value.toUpperCase())}
          />
          <button
            onClick={handleRedeemLicense}
            className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold"
          >
            Validar
          </button>
        </div>
      </div>
    </div>
  </div>
)}
```

**Agregar función de canjear licencia:**

```typescript
const [licenseCode, setLicenseCode] = useState('');

const handleRedeemLicense = async () => {
  try {
    const res = await fetch('/api/redeem-license', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: licenseCode })
    });
    
    const data = await res.json();
    
    if (res.ok) {
      alert(`✅ ${data.message}\n\n🎁 Bonus: ${data.bonusPoints} PC`);
      
      // Enviar carta automáticamente (ya tiene tier)
      await fetch('/api/carta/submit', {
        method: 'POST',
        body: JSON.stringify(cartaData)
      });
      
      setShowPlanModal(false);
      router.push('/dashboard?welcome=license');
      
    } else {
      alert(`❌ ${data.error}`);
    }
  } catch (error) {
    alert('Error al validar código');
  }
};
```

---

### 4. MODIFICAR ENDPOINT DE APROBAR CARTA

**Archivo:** `app/api/mentor/carta/[id]/aprobar/route.ts` o similar

**Buscar la función que aprueba cartas:**

```typescript
// ANTES (código actual)
await prisma.cartaFrutos.update({
  where: { id: cartaId },
  data: {
    estado: 'AUTORIZADA',
    autorizadoMentor: true,
    autorizadoPorId: mentorId
  }
});
```

**MODIFICAR a:**

```typescript
// Obtener tier del usuario
const carta = await prisma.cartaFrutos.findUnique({
  where: { id: cartaId },
  include: {
    Usuario: { select: { tier: true } }
  }
});

// Si es FREE, ya debería estar auto-aprobada, pero por seguridad:
if (carta?.Usuario.tier === 'FREE') {
  // Usuario FREE - Ya debe estar auto-aprobada
  return NextResponse.json({ 
    success: true,
    message: 'Carta de usuario gratuito' 
  });
}

// Si es STANDARD o PREMIUM - Flujo normal de aprobación
await prisma.cartaFrutos.update({
  where: { id: cartaId },
  data: {
    estado: 'AUTORIZADA',
    autorizadoMentor: true,
    autorizadoPorId: mentorId,
    fechaActualizacion: new Date()
  }
});

// Crear ciclo de 63 días (solo si no existe)
const cicloExistente = await prisma.programEnrollment.findFirst({
  where: { userId: carta.usuarioId, status: 'ACTIVE' }
});

if (!cicloExistente) {
  const hoy = new Date();
  const fechaFin = new Date(hoy);
  fechaFin.setDate(fechaFin.getDate() + 63);
  
  await prisma.programEnrollment.create({
    data: {
      userId: carta.usuarioId,
      mentorId: carta.usuarioId,
      cycleType: 'SOLO',
      cycleStartDate: hoy,
      cycleEndDate: fechaFin,
      totalWeeks: 9,
      status: 'ACTIVE'
    }
  });
}

// Notificar usuario
// ... tu código de notificación
```

---

### 5. MODIFICAR ENDPOINT DE ENVIAR CARTA

**Archivo:** `app/api/carta/submit/route.ts` o dentro del wizard

**AGREGAR lógica de auto-aprobación:**

```typescript
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    const body = await request.json();
    const { autoApprove, ...cartaData } = body;
    
    // Obtener usuario con tier
    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, tier: true }
    });
    
    // Crear carta
    const carta = await prisma.cartaFrutos.create({
      data: {
        usuarioId: usuario.id,
        ...cartaData,
        // AUTO-APROBAR si es FREE
        estado: usuario.tier === 'FREE' ? 'AUTORIZADA' : 'PENDIENTE',
        autorizadoMentor: usuario.tier === 'FREE',
        fechaCreacion: new Date(),
        fechaActualizacion: new Date()
      }
    });
    
    // Si es FREE, auto-aprobar inmediatamente
    if (usuario.tier === 'FREE') {
      console.log('✅ Usuario FREE: Carta auto-aprobada');
      
      // NO crear ciclo para usuarios FREE
      // NO enviar notificación a mentor
      
      return NextResponse.json({
        success: true,
        message: 'Tu carta ha sido activada. ¡Comienza tu transformación!',
        carta,
        autoApproved: true
      });
    }
    
    // Si es STANDARD o PREMIUM, enviar a revisión
    // Notificar al mentor asignado
    console.log('📨 Enviando carta a revisión de mentor');
    
    return NextResponse.json({
      success: true,
      message: 'Tu carta ha sido enviada a revisión. Te notificaremos cuando sea aprobada.',
      carta,
      autoApproved: false
    });
    
  } catch (error) {
    console.error('Error submitting carta:', error);
    return NextResponse.json({ error: 'Error al enviar carta' }, { status: 500 });
  }
}
```

---

### 6. MODIFICAR SUBIDA DE EVIDENCIAS

**Archivo:** Buscar endpoint que aprueba evidencias

**AGREGAR:**

```typescript
// Al aprobar evidencia
const usuario = await prisma.usuario.findUnique({
  where: { id: evidencia.usuarioId },
  select: { tier: true, id: true }
});

if (usuario.tier === 'FREE') {
  // Auto-aprobar sin puntos
  await prisma.evidenciaAccion.update({
    where: { id: evidenciaId },
    data: {
      status: 'APPROVED_AUTO',
      reviewedAt: new Date()
    }
  });
  
  // ⚠️ NO otorgar puntos cuánticos
  console.log('⚠️ Usuario FREE: Evidencia auto-aprobada sin puntos');
  
  return NextResponse.json({
    success: true,
    message: 'Evidencia registrada',
    pointsAwarded: 0
  });
}

// Si es STANDARD o PREMIUM: Flujo normal con puntos
// ... código actual de aprobación y otorgar puntos
```

---

## 🎯 Verificación Final

### Checklist de Testing:

```
[ ] 1. Crear usuario nuevo → ¿Es FREE por defecto?
[ ] 2. Ver sidebar → ¿Está desbloqueado?
[ ] 3. Items bloqueados tienen candado 🔒?
[ ] 4. Completar wizard → ¿Muestra modal de elección?
[ ] 5. Elegir FREE → ¿Carta auto-aprobada?
[ ] 6. Subir evidencia → ¿Auto-aprobada sin PC?
[ ] 7. Intentar agendar llamada → ¿Bloqueado?
[ ] 8. Ver tareas extraordinarias → ¿Muestra upsell al intentar reclamar?
[ ] 9. Canjear código licencia → ¿Funciona?
[ ] 10. Usuario STANDARD → ¿Tiene mentor y PC?
```

### Comandos Útiles:

```bash
# Ejecutar migración
node scripts/migrate-tiers.js

# Ver usuarios por tier
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { const free = await prisma.usuario.count({ where: { tier: 'FREE' } }); const standard = await prisma.usuario.count({ where: { tier: 'STANDARD' } }); const premium = await prisma.usuario.count({ where: { tier: 'PREMIUM' } }); console.log('FREE:', free, 'STANDARD:', standard, 'PREMIUM:', premium); await prisma.\$disconnect(); })();"

# Crear licencia de prueba
node -e "const { PrismaClient } = require('@prisma/client'); const prisma = new PrismaClient(); (async () => { await prisma.license.create({ data: { code: 'TEST-2025', schoolName: 'Escuela de Prueba', tierAssigned: 'STANDARD', maxUses: 10 } }); console.log('✅ Licencia TEST-2025 creada'); await prisma.\$disconnect(); })();"
```

---

## 🚨 IMPORTANTE

Este sistema es **CRÍTICO** para el modelo de negocio. Prioriza:

1. ✅ Experiencia del usuario FREE (debe ser fluida)
2. ✅ Claridad en los upsells (no agresivos)
3. ✅ Validación de licencias (no permitir duplicados)
4. ✅ Testing exhaustivo antes de producción

**Fecha límite sugerida:** 24-48 horas para implementación completa.

---

**Creado:** 23 de diciembre de 2025  
**Status:** 🟡 Instrucciones listas para implementar  
**Prioridad:** 🔥 CRÍTICO
