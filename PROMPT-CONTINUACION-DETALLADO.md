# PROMPT DE CONTINUACIÓN - PLATAFORMA QUANTUM MATTER (FRUTOS)

## CONTEXTO PARA NUEVA CONVERSACIÓN

Eres mi asistente de desarrollo. Estamos trabajando en una plataforma de transformación personal llamada **Quantum Matter** (internamente "Plataforma Frutos"). Es una aplicación Next.js 14 con App Router, Prisma ORM, PostgreSQL, NextAuth para autenticación, y desplegada en Vercel.

**IMPORTANTE**: Siempre que hagas correcciones, usa el formato "Buscar y Reemplazar Exacto":
- Dame el bloque de código exacto que debo buscar para borrar
- Dame el bloque exacto que debo pegar en su lugar
- Si es código nuevo, dime qué dice la línea completa de arriba y la de abajo donde debo pegarlo

---

## ARQUITECTURA TÉCNICA COMPLETA

### Stack Tecnológico
- **Frontend**: Next.js 14.2.20 (App Router), React 18, TailwindCSS
- **Backend**: API Routes de Next.js, Prisma 5.22.0
- **Base de Datos**: PostgreSQL (Neon)
- **Autenticación**: NextAuth.js con credenciales
- **Deployment**: Vercel
- **Almacenamiento**: Cloudinary (imágenes)

### Estructura de Carpetas Principal
```
/app
  /api                    # API Routes
  /auth                   # Páginas de autenticación
  /dashboard              # Dashboards por rol
    /admin                # Super administrador
    /school-admin         # Director de escuela
    /coordinador          # Coordinador general
    /coordinador-basico   # Coordinador nivel básico
    /coordinador-avanzado # Coordinador nivel avanzado
    /trainer              # Entrenador
    /mentor               # Mentor
    /lider                # Líder de Small Group
    /game-changer         # Game Changer (participante destacado)
    /gamechanger          # Alias del anterior
    /student              # Estudiante/Participante
/components
  /dashboard              # Widgets y componentes de dashboard
  /training-closure       # Sistema de cierre de entrenamientos
  /widgets                # Widgets reutilizables
/lib
  auth.ts                 # Configuración NextAuth
  prisma.ts               # Cliente Prisma
  utils.ts                # Utilidades (incluye helpers de fecha)
/prisma
  schema.prisma           # Esquema de base de datos
```

---

## SISTEMA DE ROLES Y PERMISOS

### Roles Disponibles (enum Rol)
```
ADMINISTRADOR      - Super admin de toda la plataforma
SCHOOL_ADMIN       - Director de escuela (organización)
COORDINADOR        - Coordinador general
COORDINATOR_BASIC  - Coordinador nivel básico
COORDINATOR_ADVANCED - Coordinador nivel avanzado
TRAINER            - Entrenador de grupos
MENTOR             - Mentor de participantes
LIDER              - Líder de Small Group
GAMECHANGER        - Game Changer (participante destacado)
PARTICIPANTE       - Participante regular
LOBO_SOLITARIO     - Usuario sin organización
```

### Tiers de Usuario (enum UserTier)
```
STANDARD  - Acceso básico
PREMIUM   - Acceso premium con beneficios adicionales
```

---

## MODELO DE DATOS COMPLETO (Prisma Schema)

### Entidades Principales

#### Usuario
```prisma
model Usuario {
  id                    Int       @id @default(autoincrement())
  nombre                String
  email                 String    @unique
  password              String
  telefono              String?
  imagen                String?
  rol                   Rol       @default(PARTICIPANTE)
  tier                  UserTier  @default(STANDARD)
  isActive              Boolean   @default(true)
  organizationId        Int?      // Escuela a la que pertenece
  assignedMentorId      Int?      // Mentor asignado
  requirePasswordChange Boolean   @default(false) // Forzar cambio de contraseña
  createdAt             DateTime  @default(now())
  updatedAt             DateTime  @updatedAt
}
```

#### Organization (Escuela)
```prisma
model Organization {
  id                Int       @id @default(autoincrement())
  name              String
  slug              String    @unique
  logoUrl           String?
  primaryColor      String?
  isActive          Boolean   @default(true)
  maxLicenses       Int       @default(100)
  usedLicenses      Int       @default(0)
}
```

#### Vision (Ciclo de Entrenamiento)
```prisma
model Vision {
  id                    Int       @id @default(autoincrement())
  nombre                String
  descripcion           String?
  organizationId        Int
  coordinadorId         Int?
  colorIdentificador    String?
  isActive              Boolean   @default(true)
  maxParticipantes      Int?
  enabledLevels         VisionLevel[] @default([PL])
  
  // Fechas Nivel Básico
  startDate             DateTime?
  endDate               DateTime?
  
  // Fechas Nivel Avanzado
  advancedStartDate     DateTime?
  advancedEndDate       DateTime?
  
  // Fechas PL (3 fines de semana)
  plWeekend1StartDate   DateTime?
  plWeekend1EndDate     DateTime?
  plWeekend2StartDate   DateTime?
  plWeekend2EndDate     DateTime?
  plWeekend3StartDate   DateTime?
  plWeekend3EndDate     DateTime?
}
```

#### SchoolProduct (Producto/Entrenamiento)
```prisma
model SchoolProduct {
  id                    Int       @id @default(autoincrement())
  name                  String
  type                  ProductType  // CORE_TRAINING, EXTRA_WORKSHOP
  levelType             LevelType?   // BASIC, ADVANCED, PL
  visionId              Int?
  organizationId        Int
  
  // Precios
  basePrice             Float
  promoPrice            Float?
  promoDeadline         DateTime?
  
  // Fechas
  startDate             DateTime?
  endDate               DateTime?
  
  // Control de entrenamiento
  trainingStartTime     String?      // Hora de inicio (ej: "09:00")
  trainingStatus        TrainingStatus @default(SCHEDULED)
  registrationOpenDate  DateTime?
  finishedAt            DateTime?
  
  // Fechas PL individuales (solo para levelType=PL)
  plWeekend1StartDate   DateTime?
  plWeekend1EndDate     DateTime?
  plWeekend1StartTime   String?      // Hora inicio fin de semana 1
  plWeekend2StartDate   DateTime?
  plWeekend2EndDate     DateTime?
  plWeekend2StartTime   String?      // Hora inicio fin de semana 2
  plWeekend3StartDate   DateTime?
  plWeekend3EndDate     DateTime?
  plWeekend3StartTime   String?      // Hora inicio fin de semana 3
  
  // Staff
  coordinatorId         Int?
  trainerId             Int?
  location              String?
}
```

#### VisionParticipante (Inscripciones)
```prisma
model VisionParticipante {
  id              Int       @id @default(autoincrement())
  visionId        Int
  participanteId  Int
  gameChangerId   Int?      // GC que lo invitó
  level           VisionLevel @default(BASIC)
  status          String    @default("ENROLLED")
  createdAt       DateTime  @default(now())
}
```

#### VisionGameChanger
```prisma
model VisionGameChanger {
  id            Int       @id @default(autoincrement())
  visionId      Int
  gameChangerId Int
  level         VisionLevel @default(BASIC)
  assignedAt    DateTime  @default(now())
}
```

#### SmallGroup (Grupos Pequeños)
```prisma
model SmallGroup {
  id          Int       @id @default(autoincrement())
  name        String
  leaderId    Int       // Líder del grupo
  visionId    Int
  isActive    Boolean   @default(true)
  maxMembers  Int       @default(12)
}
```

#### CallSlot (Slots de Llamadas)
```prisma
model CallSlot {
  id              Int       @id @default(autoincrement())
  mentorId        Int?
  leaderId        Int?
  studentId       Int?
  scheduledDate   DateTime
  scheduledTime   String    // "09:00"
  duration        Int       @default(30)
  status          CallStatus
  type            CallType  // DISCIPLINE, FOLLOW_UP, INITIAL
  visionId        Int?
}
```

### Enums Importantes
```prisma
enum Rol {
  ADMINISTRADOR
  SCHOOL_ADMIN
  COORDINADOR
  COORDINATOR_BASIC
  COORDINATOR_ADVANCED
  TRAINER
  MENTOR
  LIDER
  GAMECHANGER
  PARTICIPANTE
  LOBO_SOLITARIO
}

enum VisionLevel {
  BASIC
  ADVANCED
  PL
}

enum TrainingStatus {
  SCHEDULED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

enum CallStatus {
  PENDING
  CONFIRMED
  COMPLETED
  CANCELLED
  NO_SHOW
}
```

---

## PROBLEMA DE TIMEZONE - SOLUCIÓN IMPLEMENTADA

### El Problema
Cuando se guardaba una fecha como "2026-01-14" (solo fecha sin hora), JavaScript la interpretaba como medianoche UTC (00:00:00 UTC). En zonas horarias negativas como México (UTC-6), esto se convertía en el día anterior (2026-01-13 18:00:00 hora local).

### La Solución
Se crearon helpers que agregan `T12:00:00` (mediodía) a las fechas que solo tienen `YYYY-MM-DD`, evitando que al ajustar por timezone caigan en el día anterior.

#### Helper en Frontend (`lib/utils.ts`)
```typescript
/**
 * Convierte una fecha string a ISO string de forma segura, evitando problemas de timezone.
 */
export function toSafeISODate(dateStr: string | null | undefined): string | null {
  if (!dateStr) return null;
  // Si ya tiene hora (datetime-local), usarlo directamente
  if (dateStr.includes('T')) {
    return new Date(dateStr).toISOString();
  }
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de timezone
  return new Date(`${dateStr}T12:00:00`).toISOString();
}

/**
 * Formatea una fecha ISO a formato YYYY-MM-DD para inputs de tipo date
 */
export function formatDateForInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  return isoString.split('T')[0];
}

/**
 * Formatea una fecha ISO a formato YYYY-MM-DDTHH:MM para inputs de tipo datetime-local
 */
export function formatDateTimeForInput(isoString: string | null | undefined): string {
  if (!isoString) return '';
  const date = new Date(isoString);
  return date.toISOString().slice(0, 16);
}
```

#### Helper en Backend (APIs)
En cada API que maneja fechas, se agrega esta función al inicio:
```typescript
/**
 * Convierte una fecha string a Date de forma segura, evitando problemas de timezone.
 */
function toSafeDate(dateStr: string | null | undefined): Date | null {
  if (!dateStr) return null;
  // Si ya tiene hora, usarlo directamente
  if (dateStr.includes('T')) {
    return new Date(dateStr);
  }
  // Si es solo fecha (YYYY-MM-DD), agregar mediodía para evitar problemas de timezone
  return new Date(`${dateStr}T12:00:00`);
}
```

### Archivos Modificados para el Fix de Timezone

1. **`/lib/utils.ts`** - Agregados los helpers `toSafeISODate`, `formatDateForInput`, `formatDateTimeForInput`

2. **`/app/dashboard/school-admin/vision/[id]/manage/page.tsx`** - Función `handleSaveDates()` usa `toSafeISODate()`

3. **`/app/api/school-admin/visiones/[id]/route.ts`** - GET y PUT usan `toSafeDate()`

4. **`/app/api/school-admin/visiones/create-complete/route.ts`** - Usa `toSafeDate()` para todas las fechas

5. **`/app/dashboard/school-admin/productos/page.tsx`** - Importa y usa `toSafeISODate`

---

## FLUJO DE VISION BUILDER (Crear Visión Completa)

### Frontend: `/app/dashboard/school-admin/visiones/page.tsx`
El Vision Builder permite crear una visión con los 3 niveles (Básico, Avanzado, PL) en un solo flujo.

### API: `/api/school-admin/visiones/create-complete`
```typescript
// Estructura de datos que recibe:
{
  nombre: string,
  colorIdentificador: string,
  descripcion: string,
  maxParticipantes: number,
  enabledLevels: ['BASIC', 'ADVANCED', 'PL'],
  currency: string,
  
  basicConfig: {
    startDate: string,      // YYYY-MM-DD
    endDate: string,
    coordinatorId: number,
    trainerId: number,
    location: string,
    price: number
  },
  
  advancedConfig: {
    startDate: string,
    endDate: string,
    coordinatorId: number,
    trainerId: number,
    location: string,
    price: number
  },
  
  plConfig: {
    coordinatorId: number,
    price: number,
    weekends: [
      { name: 'Fin de Semana 1', startDate, endDate, trainerId, location },
      { name: 'Fin de Semana 2', startDate, endDate, trainerId, location },
      { name: 'Fin de Semana 3 (Graduación)', startDate, endDate, trainerId, location }
    ]
  }
}
```

---

## GESTIÓN DE VISION - PÁGINA MANAGE

### Archivo: `/app/dashboard/school-admin/vision/[id]/manage/page.tsx`

### Tabs Disponibles
1. **Básico** - Participantes y Game Changers nivel básico
2. **Avanzado** - Participantes y Game Changers nivel avanzado
3. **Liderato** - Participantes PL
4. **Fechas** - Configuración de fechas y horarios (solo editable por SCHOOL_ADMIN/ADMINISTRADOR)
5. **Coordinadores** - Asignación de staff

### Horarios por Defecto
- **Básico**: 09:00
- **Avanzado**: 15:00
- **PL Fin de Semana 1**: 18:00
- **PL Fin de Semana 2**: 18:00
- **PL Fin de Semana 3 (Graduación)**: 13:00

### Estado de Fechas
```typescript
const [dateData, setDateData] = useState({
  basicStartDate: '',
  basicEndDate: '',
  basicStartTime: '09:00',
  basicRegistrationOpenDate: '',
  advancedStartDate: '',
  advancedEndDate: '',
  advancedStartTime: '15:00',
  advancedRegistrationOpenDate: '',
  plWeekends: [
    { name: 'Fin de Semana 1', startDate: '', endDate: '', startTime: '18:00' },
    { name: 'Fin de Semana 2', startDate: '', endDate: '', startTime: '18:00' },
    { name: 'Graduación', startDate: '', endDate: '', startTime: '13:00' },
  ],
  plStartTime: '18:00',
  plRegistrationOpenDate: ''
});
```

---

## MODAL DE GAME CHANGER CON BÚSQUEDA

### Funcionalidad Implementada
1. **Búsqueda** por nombre, email o teléfono
2. **Selección** de usuario existente
3. **Creación** de nuevo usuario si no existe

### Estados del Modal
```typescript
const [showGameChangerModal, setShowGameChangerModal] = useState(false);
const [gcSearchQuery, setGcSearchQuery] = useState('');
const [gcSearchResults, setGcSearchResults] = useState<any[]>([]);
const [gcSearching, setGcSearching] = useState(false);
const [gcSelectedUser, setGcSelectedUser] = useState<any>(null);
const [gcShowCreateForm, setGcShowCreateForm] = useState(false);
const [gcNewUserData, setGcNewUserData] = useState({
  nombre: '',
  email: '',
  telefono: '',
});
const [gcSelectedLevel, setGcSelectedLevel] = useState('BASIC');
const [gcRegistering, setGcRegistering] = useState(false);
```

### API de Búsqueda: `/api/school-admin/search-users`
- Busca usuarios por nombre, email o teléfono
- Filtra por organización del director
- Excluye usuarios ya asignados como GC en esa visión

### API de Creación: `/api/school-admin/create-gamechanger`
- Si usuario existe: lo convierte a GAMECHANGER
- Si no existe: crea nuevo con contraseña `Quantum123` y `requirePasswordChange: true`

---

## APIS PRINCIPALES

### School Admin
- `GET/PUT /api/school-admin/visiones/[id]` - Obtener/actualizar visión
- `POST /api/school-admin/visiones/create-complete` - Crear visión completa
- `GET /api/school-admin/search-users` - Buscar usuarios
- `POST /api/school-admin/create-gamechanger` - Crear/convertir Game Changer
- `POST /api/school-admin/visiones/[id]/add-gamechangers` - Asignar GC a visión
- `GET /api/school-admin/visiones/[id]/basic-enrollments` - Inscritos básico
- `GET /api/school-admin/visiones/[id]/advanced-enrollments` - Inscritos avanzado
- `GET /api/school-admin/visiones/[id]/pl-enrollments` - Inscritos PL
- `GET /api/school-admin/survey-results` - Resultados de encuestas

### Coordinador
- `GET /api/coordinador/productos-activos` - Productos activos
- `GET /api/coordinador/training-stats` - Estadísticas de entrenamiento
- `GET /api/coordinador/participantes-lista` - Lista de participantes

### Trainer
- `GET /api/trainer/mis-entrenamientos` - Entrenamientos asignados
- `GET /api/trainer/pre-registros-lista` - Pre-registros
- `POST /api/trainer/finish-training` - Finalizar entrenamiento
- `POST /api/trainer/survey` - Encuesta del trainer

### Game Changer
- `GET /api/gc/pending-surveys` - Encuestas pendientes
- `POST /api/gc/survey` - Enviar encuesta
- `POST /api/gc-calls/post-entreno/schedule` - Agendar llamadas post-entreno

### Cron Jobs
- `/api/cron/training-lifecycle` - Ciclo de vida de entrenamientos
- `/api/cron/update-attendance` - Actualizar asistencia

---

## COMPONENTES IMPORTANTES

### Widgets de Dashboard
- `SurveyResultsWidget` - Muestra resultados de encuestas
- `GCCallsMonitorWidget` - Monitor de llamadas de GC
- `SquadManagerWidget` - Gestión de squads
- `VisionHistoryWidget` - Historial de visiones
- `DirectorPendingAuditBanner` - Banner de auditorías pendientes
- `GCPendingSurveyBanner` - Banner de encuestas pendientes

### Sistema de Cierre de Entrenamientos
- `TrainerSurveyModal` - Encuesta del trainer al finalizar
- `GCSurveyModal` - Encuesta del Game Changer
- `DirectorAuditModal` - Auditoría del director
- `GCLockScreen` - Pantalla de bloqueo para GC
- `SlideToConfirm` - Confirmación deslizante

---

## LO QUE FALTA POR DESARROLLAR

### Alta Prioridad
1. **Arreglar búsqueda de Game Changer** - El API no encuentra usuarios de la misma organización correctamente
2. **Sistema de notificaciones** - Push notifications para recordatorios
3. **Reportes financieros** - Dashboard de ingresos por visión

### Media Prioridad
4. **Sistema de pagos** - Integración con Stripe/PayPal
5. **Exportación de datos** - CSV/Excel de participantes
6. **Sistema de mensajería interna** - Chat entre roles

### Baja Prioridad
7. **App móvil** - React Native o PWA mejorada
8. **Integración WhatsApp** - API de WhatsApp Business
9. **Analytics avanzados** - Métricas de engagement

---

## CONFIGURACIÓN DE VERCEL

### Variables de Entorno Requeridas
```
DATABASE_URL=postgresql://...
NEXTAUTH_SECRET=...
NEXTAUTH_URL=https://quantummatter.app
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

### Archivo vercel.json
```json
{
  "framework": "nextjs",
  "buildCommand": "prisma generate && next build",
  "regions": ["iad1"]
}
```

---

## COMANDOS ÚTILES

```bash
# Desarrollo local
npm run dev

# Generar cliente Prisma
npx prisma generate

# Push schema a DB (sin migration)
npx prisma db push

# Crear migration
npx prisma migrate dev --name nombre_migration

# Ver DB en browser
npx prisma studio

# Build para producción
npm run build

# Verificar tipos TypeScript
npx tsc --noEmit
```

---

## NOTAS IMPORTANTES

1. **Siempre usar `toSafeDate()` o `toSafeISODate()`** al manejar fechas para evitar el bug de timezone

2. **El campo `requirePasswordChange`** se usa para forzar cambio de contraseña en usuarios creados desde admin

3. **Los Game Changers creados manualmente** tienen contraseña `Quantum123` por defecto

4. **Las fechas de PL tienen horarios individuales** por cada fin de semana (plWeekend1StartTime, plWeekend2StartTime, plWeekend3StartTime)

5. **Tabs de QR y Game Changers fueron removidos** de la página manage de visión

6. **Solo SCHOOL_ADMIN y ADMINISTRADOR** pueden editar fechas y coordinadores

---

## ÚLTIMO ESTADO DEL CÓDIGO

**Último commit**: `d523d07`
**Rama**: `main`
**Fecha**: 14 de enero de 2026

El código está desplegado en:
- **Producción**: https://quantummatter.app
- **Preview**: plataforma-frutos-produccion-f89i.vercel.app
