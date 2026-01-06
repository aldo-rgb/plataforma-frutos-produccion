# 🚀 Sistema Multi-Nivel & Independencia Financiera

## 📋 Resumen Ejecutivo

Este sistema permite a las organizaciones (SCHOOL_ADMIN) crear experiencias educativas con múltiples niveles de progresión:

- **NIVEL 1: DISCOVERY (Básico)** 🟦 - Control de accesos, Pagos, Staff logístico
- **NIVEL 2: BREAKTHROUGH (Avanzado)** 🟪 - Logística compleja, Buddies
- **NIVEL 3: QUANTUM LEAP (Liderato/PL)** 🟨 - Mentores, Cartas F.R.U.T.O.S., Gamificación

## 🎯 Características Principales

### 1. Arquitectura Multi-Nivel
- Visiones pueden habilitar 1, 2 o 3 niveles
- Progresión secuencial: Básico → Avanzado → Liderato
- Sistema de graduación entre niveles

### 2. Roles de Coordinadores
- **COORDINATOR_BASIC**: Gestiona Discovery (logística, pagos, asistencia)
- **COORDINATOR_ADVANCED**: Gestiona Breakthrough (dinámicas, staff)
- **COORDINATOR_PL**: Gestiona Quantum Leap (mentores, cartas, métricas) - LEGACY

### 3. Sistema Financiero Independiente
- Integración con Stripe Connect
- Director cobra directamente
- Comisión configurable de plataforma (1% por defecto)
- Pagos en efectivo mediante códigos de acceso

### 4. Estados de Estudiante
```
BASIC_STUDENT → graduación → ADVANCED_CANDIDATE → pago → ADVANCED_STUDENT
                                                           ↓
                                            ALUMNI ← PL_STUDENT ← pago ← PL_CANDIDATE
```

## 📁 Estructura de Archivos Creados

```
/lib/i18n/
  └── multi-level.ts                    # Traducciones ES/EN

/src/components/multi-level/
  └── VisionWizard.tsx                  # Wizard de creación de visiones

/prisma/
  └── schema.prisma                     # Schema actualizado con nuevos modelos

MIGRATION-MULTI-LEVEL-SYSTEM.sql       # Script de migración SQL
```

## 🗄️ Modelos de Base de Datos

### Nuevos Modelos

1. **VisionTicket**: Productos/Tickets del Director
   - Precio, cupo, nivel
   - Nombres en español e inglés
   - Control de ventas

2. **TicketPurchase**: Registro de compras
   - Vinculado a Stripe payments
   - Múltiples métodos de pago
   - Estado de transacción

3. **AccessCode**: Códigos para pagos en efectivo
   - Generados por coordinadores
   - Monto y fecha de uso
   - Suma a reportes financieros

4. **StudentGraduation**: Registro de graduaciones
   - Historial de progresión
   - Notas del coordinador
   - Fechas de graduación

5. **StripeConnectConfig**: Configuración de Stripe Connect
   - Account ID de organización
   - Estado de onboarding
   - Comisión de plataforma

### Campos Agregados

**Vision**:
- `enabledLevels`: Array de niveles habilitados
- `financialConfigId`: Stripe Connect Account ID
- `platformFeePercent`: % de comisión

**Usuario**:
- `studentStatus`: Estado del estudiante
- `currentVisionLevel`: Nivel actual
- `graduatedFromBasic`: Fecha de graduación del básico
- `graduatedFromAdvanced`: Fecha de graduación del avanzado

## 🔧 Instalación

### 1. Aplicar Migración

```bash
# Opción A: Usando Prisma
npx prisma db push

# Opción B: SQL directo (Supabase SQL Editor)
# Copiar y ejecutar MIGRATION-MULTI-LEVEL-SYSTEM.sql
```

### 2. Generar Cliente Prisma

```bash
npx prisma generate
```

### 3. Reiniciar Servidor

```bash
npm run dev
```

## 🎨 Uso del Wizard

```tsx
import VisionWizard from '@/src/components/multi-level/VisionWizard';

function CreateVisionPage() {
  const [showWizard, setShowWizard] = useState(false);

  const handleComplete = async (data: VisionWizardData) => {
    // Enviar a API
    const response = await fetch('/api/visiones/create', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    
    if (response.ok) {
      // Visión creada exitosamente
    }
  };

  return (
    <div>
      <button onClick={() => setShowWizard(true)}>
        Crear Nueva Visión
      </button>
      
      {showWizard && (
        <VisionWizard
          onComplete={handleComplete}
          onCancel={() => setShowWizard(false)}
          locale="es"
        />
      )}
    </div>
  );
}
```

## 🌐 Traducciones

Las traducciones están disponibles en español e inglés:

```tsx
import { useMultiLevelTranslations } from '@/lib/i18n/multi-level';

function Component() {
  const t = useMultiLevelTranslations('es'); // o 'en'
  
  return <h1>{t.wizard.title}</h1>;
}
```

## 📊 Dashboards por Coordinador

### Dashboard Discovery (COORDINATOR_BASIC)
- Control de asistencia (QR + Foto)
- Generación de códigos de acceso
- Registro de pagos en efectivo
- Gestión de backlogs y drops

### Dashboard Breakthrough (COORDINATOR_ADVANCED)
- Gestión de staff (Capitanes)
- Asignación de equipos
- Dinámicas y actividades
- Asignación de Buddies

### Dashboard Quantum Leap (COORDINATOR_PL)
- Sistema actual completo
- Mentores y cartas F.R.U.T.O.S.
- Gamificación y strikes
- Métricas y seguimiento

## 💰 Flujo Financiero

### 1. Configuración Stripe Connect

```tsx
// Botón en dashboard de Director
<button onClick={handleStripeConnect}>
  Conectar con Stripe
</button>
```

### 2. Creación de Tickets

```tsx
const ticket = {
  visionId: 1,
  level: 'BASIC',
  nombre: 'Ticket Básico Generación 40',
  nombreEn: 'Basic Ticket Generation 40',
  precio: 5000,
  cupo: 100,
};

await prisma.visionTicket.create({ data: ticket });
```

### 3. Pagos en Efectivo

```tsx
// Coordinador genera código
const code = await fetch('/api/access-codes/generate', {
  method: 'POST',
  body: JSON.stringify({
    ticketId: 1,
    amount: 5000,
    metadata: { nombre: 'Juan Pérez', telefono: '5551234567' }
  })
});

// Estudiante canjea código
await fetch('/api/access-codes/redeem', {
  method: 'POST',
  body: JSON.stringify({ code: 'ABC-123456' })
});
```

## 🎓 Sistema de Graduación

```tsx
// Coordinador gradúa a estudiante
await fetch('/api/students/graduate', {
  method: 'POST',
  body: JSON.stringify({
    userId: 123,
    fromLevel: 'BASIC',
    toLevel: 'ADVANCED',
    notes: 'Excelente desempeño en el fin de semana básico'
  })
});
```

## 🔐 Permisos y Acceso

### Validación de Nivel

```tsx
function canAccessLevel(user, requiredLevel) {
  const levelOrder = { BASIC: 1, ADVANCED: 2, PL: 3 };
  const userLevel = levelOrder[user.currentVisionLevel];
  const required = levelOrder[requiredLevel];
  
  return userLevel >= required;
}
```

### Bloqueo de Features

```tsx
if (user.currentVisionLevel !== 'PL') {
  return <LevelLockedMessage level="PL" />;
}

// Mostrar app de metas solo en PL
return <MetasApp />;
```

## 📈 Reportes Financieros

Los pagos en efectivo (AccessCode) se suman automáticamente al reporte financiero del Director:

```sql
SELECT 
  SUM(amount) as total_cash,
  COUNT(*) as transactions
FROM "AccessCode"
WHERE "visionId" = $1 
  AND "status" = 'USED';
```

## 🚨 Consideraciones Importantes

1. **Migración**: Ejecutar el SQL antes de usar el sistema
2. **Stripe Connect**: Requiere cuenta de Stripe con Connect habilitado
3. **Comisiones**: Configurar el % de comisión en el panel de admin
4. **Graduaciones**: Solo coordinadores pueden graduar estudiantes
5. **Códigos de Acceso**: Expiran si se configura `expiresAt`

## 🔄 Próximos Pasos

1. **API Routes**: Crear endpoints para:
   - `/api/visiones/create` - Crear visión multi-nivel
   - `/api/tickets/create` - Crear productos
   - `/api/access-codes/generate` - Generar códigos
   - `/api/access-codes/redeem` - Canjear códigos
   - `/api/students/graduate` - Graduar estudiantes
   - `/api/stripe/connect` - Onboarding Stripe Connect

2. **Componentes UI**: Crear dashboards específicos para cada coordinador

3. **Notificaciones**: Sistema de notificaciones para graduaciones

4. **QR Scanner**: Implementar escaneo de QR para check-in

5. **Reportes**: Panel de reportes financieros para Director

## 📞 Soporte

Para preguntas o issues, contactar al equipo de desarrollo.

---

**Última actualización**: 5 de enero de 2026
**Versión**: 1.0.0
