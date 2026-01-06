# 🚀 Sistema Multi-Nivel - Implementación Completa

## ✅ Componentes Implementados

### 1. API Endpoints

#### Visiones Multi-Nivel
- **POST `/api/visiones/create-multilevel`** - Crear visión con niveles
- **GET `/api/visiones/my-visions`** - Obtener visiones del usuario

#### Códigos de Acceso (Pagos en Efectivo)
- **POST `/api/access-codes/generate`** - Generar código de acceso
- **GET `/api/access-codes/generate?visionId={id}`** - Listar códigos generados
- **POST `/api/access-codes/redeem`** - Canjear código de acceso

#### Graduaciones
- **POST `/api/students/graduate`** - Graduar estudiante entre niveles
- **GET `/api/students/graduate?userId={id}&visionId={id}`** - Historial de graduaciones

#### Stripe Connect
- **POST `/api/stripe/connect`** - Iniciar onboarding de Stripe Connect
- **GET `/api/stripe/connect`** - Estado de configuración de Stripe

#### Organización
- **GET `/api/organization/me`** - Obtener organización del usuario

### 2. Componentes de UI

#### Dashboards
- **`DashboardDiscovery`** - Dashboard para Coordinadores de Nivel Básico
  - Control de asistencia con QR
  - Generación de códigos de acceso
  - Registro de pagos en efectivo
  - Gestión de backlogs y drops

- **`DashboardBreakthrough`** - Dashboard para Coordinadores de Nivel Avanzado
  - Gestión de dinámicas
  - Asignación de staff (Capitanes)
  - Creación y gestión de equipos
  - Asignación de Buddies

- **`FinancialPanel`** - Panel Financiero para Directores
  - Conexión con Stripe Connect
  - Gestión de productos/tickets
  - Visualización de ingresos
  - Configuración de comisiones

#### Wizards y Formularios
- **`VisionWizard`** - Wizard para crear visiones multi-nivel
  - Selección de niveles (BASIC, ADVANCED, PL)
  - Configuración financiera
  - Creación de productos
  - Asignación de staff

#### Páginas
- **`/dashboard/multi-level`** - Página principal del sistema multi-nivel
  - Navegación entre vistas
  - Gestión de visiones
  - Acceso a todos los dashboards

### 3. Sistema de Traducciones

**Archivo**: `lib/i18n/multi-level.ts`

Traducciones completas en español e inglés para:
- Nombres de niveles
- Estados de estudiantes
- Roles de coordinadores
- Mensajes del wizard
- Panel financiero
- Dashboards específicos
- Graduaciones

**Uso**:
```tsx
import { useMultiLevelTranslations } from '@/lib/i18n/multi-level';

const t = useMultiLevelTranslations('es'); // o 'en'
```

## 🗄️ Base de Datos

### Nuevos Modelos

1. **VisionTicket** - Productos/Tickets por nivel
2. **TicketPurchase** - Registro de compras
3. **AccessCode** - Códigos para pagos en efectivo
4. **StudentGraduation** - Historial de graduaciones
5. **StripeConnectConfig** - Configuración de Stripe Connect

### Campos Agregados

**Vision**:
- `enabledLevels` - Array de niveles habilitados
- `financialConfigId` - Stripe Account ID
- `platformFeePercent` - Comisión de plataforma

**Usuario**:
- `studentStatus` - Estado del estudiante
- `currentVisionLevel` - Nivel actual
- `graduatedFromBasic` - Fecha graduación básico
- `graduatedFromAdvanced` - Fecha graduación avanzado

### Enums

- **VisionLevel**: BASIC, ADVANCED, PL
- **StudentStatus**: BASIC_STUDENT, ADVANCED_CANDIDATE, etc.
- **Rol**: Agregados COORDINATOR_BASIC, COORDINATOR_ADVANCED, COORDINATOR_PL

## 🔄 Flujos de Trabajo

### Flujo 1: Creación de Visión Multi-Nivel

```
Director → Click "Nueva Visión Multi-Nivel"
       → Wizard: Seleccionar niveles (🟦 🟪 🟨)
       → Configurar Stripe Connect
       → Crear productos/tickets
       → Asignar coordinadores
       → Crear Visión
```

### Flujo 2: Pago en Efectivo

```
Coordinador Básico → Dashboard Discovery
                  → Tab "Pagos"
                  → Click "Generar Código de Acceso"
                  → Llenar formulario (monto, nombre, teléfono)
                  → Generar código (ej: ABC-DEF-GHI)
                  → Entregar código al estudiante

Estudiante → Ir a página de registro/canjear
          → Ingresar código
          → Sistema valida y activa acceso
          → Estado cambia a BASIC_STUDENT
```

### Flujo 3: Graduación de Estudiante

```
Coordinador → Ver lista de estudiantes nivel básico
           → Seleccionar estudiante completado
           → Click "Graduar"
           → Confirmar graduación a ADVANCED
           → Sistema:
              - Crea registro en StudentGraduation
              - Actualiza studentStatus a ADVANCED_CANDIDATE
              - Guarda fecha en graduatedFromBasic
              - Envía notificación al estudiante
           
Estudiante → Recibe notificación
          → Puede pagar para acceder a nivel ADVANCED
          → Al pagar: studentStatus → ADVANCED_STUDENT
```

### Flujo 4: Stripe Connect

```
Director → Panel Financiero
        → Click "Conectar con Stripe"
        → Redirige a Stripe Onboarding
        → Completa formulario de Stripe
        → Stripe verifica información
        → Redirige de vuelta a plataforma
        → Sistema guarda configuración:
           - stripeAccountId
           - chargesEnabled
           - payoutsEnabled
        → Director puede crear productos
        → Estudiantes pagan → Dinero va directo al Director
        → Plataforma cobra comisión automática (1%)
```

## 🎯 Casos de Uso

### Caso 1: Visión Solo Nivel Básico (Discovery)

**Configuración**:
- enabledLevels: [BASIC]
- Coordinador: COORDINATOR_BASIC

**Experiencia**:
- Estudiantes se registran para fin de semana básico
- Pagan ticket básico
- Coordinador controla asistencia con QR
- Al completar: Coordinador los gradúa manualmente
- Sistema les marca como ADVANCED_CANDIDATE
- No tienen acceso a niveles superiores aún

### Caso 2: Visión Completa (3 Niveles)

**Configuración**:
- enabledLevels: [BASIC, ADVANCED, PL]
- Coordinadores: Uno por cada nivel

**Experiencia**:
- Estudiante empieza en BASIC
- Completa → Graduado a ADVANCED_CANDIDATE
- Paga ticket ADVANCED → ADVANCED_STUDENT
- Completa → Graduado a PL_CANDIDATE
- Paga ticket PL → PL_STUDENT (acceso completo a app)

### Caso 3: Visión Legacy (Solo PL)

**Configuración**:
- enabledLevels: [PL]
- Coordinador: COORDINATOR_PL o COORDINADOR

**Experiencia**:
- Sistema actual sin cambios
- Estudiantes van directo a PL_STUDENT
- Acceso a mentores, cartas, gamificación completa

## 💻 Instalación y Setup

### 1. Aplicar Migración

```bash
# Ejecutar el SQL en Supabase SQL Editor
# Archivo: MIGRATION-MULTI-LEVEL-SYSTEM.sql
```

### 2. Variables de Entorno

Agregar a `.env`:

```env
# Stripe Connect
STRIPE_SECRET_KEY=sk_test_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Instalar Dependencias

```bash
npm install react-qr-reader framer-motion
```

### 4. Generar Cliente Prisma

```bash
npx prisma generate
```

### 5. Reiniciar Servidor

```bash
npm run dev
```

## 🔐 Permisos y Seguridad

### Roles con Acceso

- **SCHOOL_ADMIN**: Acceso completo, puede crear visiones
- **COORDINATOR_BASIC**: Solo Dashboard Discovery
- **COORDINATOR_ADVANCED**: Solo Dashboard Breakthrough
- **COORDINATOR_PL**: Solo Dashboard Quantum Leap (sistema actual)
- **SUPER_ADMIN**: Acceso total

### Validaciones

Todos los endpoints validan:
1. Sesión activa
2. Rol apropiado
3. Permisos específicos
4. Ownership de recursos

## 📊 Reportes y Analytics

### Métricas Disponibles

**Dashboard Discovery**:
- Total de registros
- Ingresos en efectivo
- Asistencia diaria
- Backlog (pendientes)
- Drops (abandonos)

**Dashboard Breakthrough**:
- Total de participantes
- Staff asignado
- Capitanes activos
- Equipos formados

**Panel Financiero**:
- Ingresos totales del mes
- Pagos pendientes
- Tickets vendidos
- Comisiones generadas

## 🚨 Consideraciones Importantes

1. **Códigos de Acceso**:
   - Expiran en 30 días por defecto
   - Solo pueden usarse una vez
   - Se registran en reportes financieros

2. **Graduaciones**:
   - Irreversibles
   - Solo coordinadores pueden graduar
   - Se guarda historial completo

3. **Stripe Connect**:
   - Requiere verificación de identidad
   - Comisión configurable por organización
   - Pagos van directo al Director

4. **Estados de Estudiante**:
   - CANDIDATE = Graduado pero no pagó siguiente nivel
   - STUDENT = Pagó y tiene acceso activo

## 📝 Próximos Desarrollos

- [ ] QR Scanner funcional para check-in
- [ ] Notificaciones push para graduaciones
- [ ] Reportes financieros descargables (PDF/Excel)
- [ ] Dashboard analítico para SUPER_ADMIN
- [ ] App móvil para coordinadores
- [ ] Sistema de pagos recurrentes
- [ ] Integración con Zoom para sesiones
- [ ] Gamificación por nivel

## 🆘 Troubleshooting

### Error: "Código inválido o expirado"
- Verificar que el código existe en BD
- Revisar campo `expiresAt`
- Validar estado = 'ACTIVE'

### Error: "Stripe Connect no disponible"
- Verificar STRIPE_SECRET_KEY en .env
- Confirmar que cuenta Stripe tiene Connect habilitado
- Revisar logs de Stripe Dashboard

### Error: "No se puede graduar estudiante"
- Confirmar que estudiante está en nivel inferior
- Validar permisos del coordinador
- Revisar que visionId es correcto

---

**Fecha de implementación**: 5 de enero de 2026  
**Versión**: 1.0.0  
**Desarrollado para**: Plataforma F.R.U.T.O.S.
