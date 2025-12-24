# 🏢 SISTEMA B2B COMPLETO - GESTIÓN DE ESCUELAS Y LICENCIAS

## 📊 Estado: 100% Backend Implementado | Frontend Pendiente

---

## 🎯 ARQUITECTURA DEL SISTEMA

### Flujo Completo B2B:
```
1. Super Admin → Crea Organización (Escuela/Empresa)
2. Super Admin → Genera Lote de Licencias
3. Director Escuela → Recibe código maestro (Ej: TEC-2025)
4. Director → Distribuye código a alumnos (WhatsApp, Email)
5. Alumno → Entra a plataforma → Llena wizard
6. Alumno → Al enviar carta → Ve modal de elección de plan
7. Alumno → Canjea código TEC-2025
8. Sistema → Auto-asigna: Tier, Organization, Visión (opcional)
9. Alumno → Accede con logo, color y ranking de su escuela
10. Director → Ve KPIs y gestiona alumnos desde su portal
```

---

## 🗄️ BASE DE DATOS

### Tabla `Organization`
```prisma
model Organization {
  id                Int      @id @default(autoincrement())
  name              String   // "Tec de Monterrey"
  slug              String   @unique // "tec-monterrey"
  logoUrl           String?  // URL del escudo
  brandColor        String   @default("#6366F1") // Color hex
  contactEmail      String   // admin@tec.mx
  status            OrganizationStatus @default(ACTIVE)
  
  // Geolocalización para NFC
  isGeofenced       Boolean  @default(false)
  campusLatitude    Float?
  campusLongitude   Float?
  geofenceRadius    Int      @default(100) // metros
  
  // Admin de la organización
  schoolAdminId     Int?     @unique
  
  // Métricas
  totalLicenses     Int      @default(0)
  activeLicenses    Int      @default(0)
  totalStudents     Int      @default(0)
  
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  
  // Relaciones
  Licenses          License[]
  Users             Usuario[] @relation("OrganizationUsers")
  SchoolAdmin       Usuario?  @relation("SchoolAdmins")
}
```

### Tabla `License` (Actualizada)
```prisma
model License {
  id               Int      @id @default(autoincrement())
  code             String   @unique // "TEC-2025"
  batchName        String?  // "Inscripciones Enero 2025"
  organizationId   Int?
  tierAssigned     UserTier @default(STANDARD)
  
  // Control de cupos
  maxUses          Int      @default(100)
  usedCount        Int      @default(0)
  
  // Código maestro vs único
  isMasterCode     Boolean  @default(true)
  
  // Vigencia
  expiresAt        DateTime?
  isActive         Boolean  @default(true)
  
  // Auto-asignación de grupo
  autoAssignVision String?  // "Aula A", "Generación 2025"
  
  createdAt        DateTime @default(now())
  updatedAt        DateTime @updatedAt
  
  Organization     Organization? @relation(fields: [organizationId], references: [id], onDelete: Cascade)
}
```

### Usuario (Actualizado)
```prisma
// Campos agregados:
organizationId     Int? // Relación con Organization
rol                Rol  // Nuevo: SCHOOL_ADMIN

// Relaciones:
Organization       Organization? @relation("OrganizationUsers")
ManagedOrganization Organization? @relation("SchoolAdmins")
```

### Enum `OrganizationStatus`
```prisma
enum OrganizationStatus {
  ACTIVE        // Organización activa
  INACTIVE      // Suspendida (no pueden canjear códigos)
  TRIAL         // Periodo de prueba
}
```

### Enum `Rol` (Actualizado)
```prisma
enum Rol {
  LIDER
  PARTICIPANTE
  MENTOR
  COORDINADOR
  ADMINISTRADOR
  GAMECHANGER
  SCHOOL_ADMIN  // ← NUEVO: Director de escuela
}
```

---

## 🚀 ENDPOINTS IMPLEMENTADOS

### 1. **CRUD de Organizaciones**
**Endpoint:** `/api/admin/organizations`

#### GET - Listar todas las organizaciones
```typescript
// Request
GET /api/admin/organizations

// Response
{
  "success": true,
  "organizations": [
    {
      "id": 1,
      "name": "Tec de Monterrey",
      "slug": "tec-monterrey",
      "logoUrl": "/logos/tec.png",
      "brandColor": "#003366",
      "status": "ACTIVE",
      "totalLicenses": 3,
      "activeLicenses": 2,
      "totalStudents": 450,
      "SchoolAdmin": {
        "id": 15,
        "nombre": "Dr. Juan Pérez",
        "email": "admin@tec.mx"
      },
      "_count": {
        "Licenses": 3,
        "Users": 450
      }
    }
  ]
}
```

#### POST - Crear organización
```typescript
// Request
POST /api/admin/organizations
{
  "name": "Universidad Alfa",
  "slug": "uni-alfa", // Opcional, se genera auto
  "logoUrl": "https://example.com/logo.png",
  "brandColor": "#FF5733",
  "contactEmail": "contacto@unialfa.edu",
  "isGeofenced": true,
  "campusLatitude": 25.651993,
  "campusLongitude": -100.289879,
  "geofenceRadius": 150,
  "schoolAdminEmail": "director@unialfa.edu" // Se crea automáticamente
}

// Response
{
  "success": true,
  "message": "Organización \"Universidad Alfa\" creada exitosamente",
  "organization": {
    "id": 2,
    "name": "Universidad Alfa",
    "slug": "uni-alfa",
    "logoUrl": "https://example.com/logo.png",
    "brandColor": "#FF5733",
    "status": "ACTIVE",
    "SchoolAdmin": {
      "id": 20,
      "nombre": "Admin Universidad Alfa",
      "email": "director@unialfa.edu"
    }
  }
}
```

---

### 2. **Generador de Licencias**
**Endpoint:** `/api/admin/organizations/[id]/licenses`

#### POST - Generar lote de licencias

**Opción A: Código Maestro Único** (Recomendado)
```typescript
POST /api/admin/organizations/1/licenses
{
  "batchName": "Inscripciones Enero 2025",
  "tierAssigned": "STANDARD",
  "codeType": "MASTER",
  "masterCode": "TEC-2025",
  "maxUses": 500,
  "expiresAt": "2025-12-31",
  "autoAssignVision": "Generación 2025" // Opcional
}

// Response
{
  "success": true,
  "message": "Lote \"Inscripciones Enero 2025\" generado exitosamente",
  "organization": "Tec de Monterrey",
  "licensesCreated": 1,
  "licenses": [
    {
      "code": "TEC-2025",
      "tier": "STANDARD",
      "maxUses": 500,
      "activationLink": "https://app.frutos.com/redeem?code=TEC-2025"
    }
  ]
}
```

**Opción B: Códigos Únicos** (Más seguro, difícil de distribuir)
```typescript
POST /api/admin/organizations/1/licenses
{
  "batchName": "Códigos Individuales Febrero",
  "tierAssigned": "PREMIUM",
  "codeType": "UNIQUE",
  "uniqueCount": 100,
  "expiresAt": "2025-12-31"
}

// Response
{
  "success": true,
  "message": "Lote \"Códigos Individuales Febrero\" generado exitosamente",
  "organization": "Tec de Monterrey",
  "licensesCreated": 100,
  "licenses": [
    { "code": "TEC-A8F3G2", "tier": "PREMIUM", "maxUses": 1, "activationLink": "..." },
    { "code": "TEC-K9D7H1", "tier": "PREMIUM", "maxUses": 1, "activationLink": "..." },
    // ... 98 más
  ]
}
```

---

### 3. **Canjear Licencia** (Actualizado)
**Endpoint:** `/api/redeem-license`

#### POST - Canjear código
```typescript
POST /api/redeem-license
{
  "code": "TEC-2025"
}

// Response (Exitoso)
{
  "success": true,
  "message": "¡Bienvenido a Tec de Monterrey! Tu plan STANDARD ha sido activado.",
  "user": {
    "tier": "STANDARD",
    "organization": "Tec de Monterrey",
    "vision": "Generación 2025",
    "puntosCuanticos": 500
  },
  "license": {
    "tier": "STANDARD",
    "usesRemaining": 499,
    "expiresAt": "2025-12-31T00:00:00.000Z"
  }
}

// Response (Error - Código agotado)
{
  "error": "Esta licencia ha alcanzado su límite de usos"
}

// Response (Error - Expirado)
{
  "error": "Esta licencia ha expirado"
}
```

**¿Qué hace el sistema al canjear?**
1. ✅ Actualiza `usuario.tier` → STANDARD/PREMIUM
2. ✅ Actualiza `usuario.subscriptionStatus` → ACTIVE_BY_LICENSE
3. ✅ Actualiza `usuario.licenseCode` → TEC-2025
4. ✅ Actualiza `usuario.organizationId` → ID de la escuela
5. ✅ Actualiza `usuario.suscripcion` → ACTIVO (legacy)
6. ✅ Asigna visión si está configurado
7. ✅ Otorga 500 PC de bienvenida
8. ✅ Incrementa `license.usedCount`
9. ✅ Actualiza métricas de la organización

---

### 4. **Portal del Director** (School Admin Dashboard)
**Endpoint:** `/api/school-admin/dashboard`

#### GET - Dashboard con KPIs
```typescript
GET /api/school-admin/dashboard

// Response
{
  "success": true,
  "organization": {
    "id": 1,
    "name": "Tec de Monterrey",
    "logoUrl": "/logos/tec.png",
    "brandColor": "#003366",
    "status": "ACTIVE"
  },
  "kpis": {
    "totalStudents": 450,
    "activeStudents": 425,
    "completionRate": 85, // % con streak > 0
    "totalCartasAprobadas": 380,
    "tierDistribution": {
      "FREE": 25,
      "STANDARD": 400,
      "PREMIUM": 25
    },
    "licenseCapacity": 500,
    "licenseUsage": 450,
    "licenseAvailable": 50
  },
  "topStudents": [
    {
      "nombre": "Ana López",
      "puntosCuanticos": 5420,
      "completionStreak": 45
    },
    // ... top 5
  ],
  "visionDistribution": {
    "Aula A": 150,
    "Aula B": 145,
    "Sin asignar": 155
  },
  "students": [
    {
      "id": 100,
      "nombre": "Carlos Ruiz",
      "email": "carlos@tec.mx",
      "tier": "STANDARD",
      "licenseCode": "TEC-2025",
      "vision": "Aula A",
      "puntosCuanticos": 1200,
      "completionStreak": 7,
      "cartasAprobadas": 1,
      "registeredAt": "2025-01-15T10:00:00.000Z",
      "status": "ACTIVE_BY_LICENSE"
    },
    // ... todos los alumnos
  ],
  "licenses": [
    {
      "code": "TEC-2025",
      "batchName": "Inscripciones Enero 2025",
      "tier": "STANDARD",
      "used": 450,
      "max": 500,
      "remaining": 50,
      "expiresAt": "2025-12-31T00:00:00.000Z"
    }
  ]
}
```

#### POST - Revocar licencia de alumno
```typescript
POST /api/school-admin/dashboard
{
  "action": "REVOKE_LICENSE",
  "studentId": 100
}

// Response
{
  "success": true,
  "message": "Licencia revocada. Carlos Ruiz ahora tiene plan FREE.",
  "student": {
    "id": 100,
    "nombre": "Carlos Ruiz",
    "tier": "FREE"
  }
}
```

**¿Qué hace el sistema al revocar?**
1. ✅ Cambia `usuario.tier` → FREE
2. ✅ Cambia `usuario.subscriptionStatus` → INACTIVE
3. ✅ Cambia `usuario.suscripcion` → INACTIVO
4. ✅ Limpia `usuario.licenseCode` → null
5. ✅ Decrementa `license.usedCount` (libera cupo)
6. ✅ Actualiza métricas de organización

---

## 🎨 COMPONENTES FRONTEND

### 1. **PlanSelectionModal** ✅
**Ubicación:** `/components/dashboard/PlanSelectionModal.tsx`

**¿Cuándo se muestra?**
- Al hacer clic en "Enviar Carta" en el wizard
- Solo si `usuario.tier === 'FREE'` o no tiene tier

**Funcionalidades:**
- ✅ Muestra 3 planes (FREE, STANDARD, PREMIUM)
- ✅ Sección "¿Tienes código de licencia?"
- ✅ Input para canjear código
- ✅ Validación en tiempo real
- ✅ Integración con `/api/redeem-license`
- ✅ Recarga automática después de canjear

**Cómo integrarlo:**
```typescript
// En CartaWizardRelacional.tsx
import PlanSelectionModal from '@/components/dashboard/PlanSelectionModal';

const [showPlanModal, setShowPlanModal] = useState(false);

// Antes de enviar carta:
const handleSubmit = async () => {
  // Si es FREE y primera vez, mostrar modal
  if (usuario.tier === 'FREE' && !hasSeenPlanModal) {
    setShowPlanModal(true);
    return;
  }
  
  // Continuar con envío normal...
};

// En el JSX:
<PlanSelectionModal
  isOpen={showPlanModal}
  onClose={() => setShowPlanModal(false)}
  onSelectPlan={async (tier) => {
    if (tier === 'FREE') {
      // Auto-aprobar y continuar
      await submitCarta();
    }
  }}
  userEmail={usuario.email}
/>
```

---

### 2. **Página de Gestión de Escuelas** ⏳ PENDIENTE
**Ubicación sugerida:** `/app/dashboard/admin/schools/page.tsx`

**Funcionalidades:**
- [ ] Tabla con todas las organizaciones
- [ ] Botón "➕ Crear Organización"
- [ ] Modal con formulario:
  * Input: Nombre
  * Uploader: Logo
  * Color Picker: Color institucional
  * Switch: ¿Habilitar NFC/Geofencing?
  * Mapa: Fijar coordenadas del campus
  * Input: Email del director
- [ ] Vista de detalle de cada organización
- [ ] Botón "Generar Lote de Licencias"

---

### 3. **Generador de Licencias** ⏳ PENDIENTE
**Ubicación sugerida:** `/app/dashboard/admin/schools/[id]/licenses/page.tsx`

**Funcionalidades:**
- [ ] Header con info de la organización
- [ ] Botón grande: "➕ Generar Lote de Licencias"
- [ ] Modal con formulario:
  * Input: Nombre del lote
  * Dropdown: Tier (STANDARD/PREMIUM)
  * Radio: Código Maestro vs Códigos Únicos
  * Input: Código maestro (si aplica)
  * Input: Cantidad de códigos únicos (si aplica)
  * Input: Cupo máximo
  * Datepicker: Fecha de expiración
  * Input: Auto-asignar visión (opcional)
- [ ] Resultado: Código generado + Link de activación
- [ ] Tabla con licencias existentes

---

### 4. **Portal del Director** ⏳ PENDIENTE
**Ubicación sugerida:** `/app/dashboard/school-admin/page.tsx`

**Acceso:** Solo usuarios con `rol === 'SCHOOL_ADMIN'`

**Funcionalidades:**
- [ ] Header con logo y color de la escuela
- [ ] Grid de KPIs:
  * 📊 450 Alumnos Activos
  * 🎯 85% Tasa de Cumplimiento
  * 📈 Top 3 Áreas trabajadas
  * 🎟️ 50 licencias disponibles
- [ ] Tabla de alumnos:
  * Columnas: Nombre, Email, Tier, Visión, PC, Streak, Estado
  * Botón: "Revocar Licencia"
  * Filtros: Por tier, por visión, por estado
- [ ] Sección de licencias:
  * Código, Batch, Usado/Max, Expira
- [ ] Botón: "📊 Descargar Informe PDF"

---

## 📋 CHECKLIST DE IMPLEMENTACIÓN

### Backend ✅ 100%
- [x] Tabla `Organization` en schema
- [x] Tabla `License` actualizada
- [x] Campo `organizationId` en Usuario
- [x] Enum `OrganizationStatus`
- [x] Rol `SCHOOL_ADMIN`
- [x] Endpoint GET `/api/admin/organizations`
- [x] Endpoint POST `/api/admin/organizations`
- [x] Endpoint POST `/api/admin/organizations/[id]/licenses`
- [x] Endpoint GET `/api/school-admin/dashboard`
- [x] Endpoint POST `/api/school-admin/dashboard` (revocar)
- [x] Actualización de `/api/redeem-license`

### Frontend ⏳ 20%
- [x] Componente `PlanSelectionModal`
- [ ] Página de gestión de escuelas
- [ ] Modal de crear organización
- [ ] Generador de licencias (UI)
- [ ] Portal del director (UI)
- [ ] Integración del modal en wizard de carta

---

## 🚀 PRÓXIMOS PASOS

### 1. Integrar Modal en Wizard de Carta (30 min)
```typescript
// Ubicación: /components/dashboard/CartaWizardRelacional.tsx
// Línea ~860 (función handleFinalSubmit)

// Agregar antes de enviar:
if (usuario.tier === 'FREE' && !usuario.licenseCode) {
  setShowPlanModal(true);
  return;
}
```

### 2. Crear Página de Gestión de Escuelas (2 horas)
- Tabla con react-table o similar
- Formulario con react-hook-form
- Uploader de logo (drag & drop)
- Color picker (react-color o similar)
- Mapa interactivo (react-leaflet o Google Maps)

### 3. Crear Generador de Licencias UI (1 hora)
- Formulario con validaciones
- Preview del código generado
- Copiar al portapapeles
- QR code para distribuir

### 4. Crear Portal del Director (3 horas)
- Dashboard con recharts o similar
- Tabla de alumnos con filtros
- Modal de confirmación para revocar
- Exportar PDF con jsPDF

---

## 🧪 TESTING

### Crear Organización de Prueba
```bash
# Opción 1: Desde API
curl -X POST http://localhost:3000/api/admin/organizations \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Universidad de Prueba",
    "contactEmail": "test@universidad.edu",
    "brandColor": "#FF6B6B",
    "schoolAdminEmail": "director@universidad.edu"
  }'

# Opción 2: Script Node.js
node -e "
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
(async () => {
  const org = await prisma.organization.create({
    data: {
      name: 'Universidad de Prueba',
      slug: 'uni-prueba',
      contactEmail: 'test@universidad.edu',
      brandColor: '#FF6B6B',
      status: 'ACTIVE'
    }
  });
  console.log('✅ Organización creada:', org);
  await prisma.\$disconnect();
})();
"
```

### Generar Licencia de Prueba
```bash
curl -X POST http://localhost:3000/api/admin/organizations/1/licenses \
  -H "Content-Type: application/json" \
  -d '{
    "batchName": "Prueba Enero",
    "tierAssigned": "STANDARD",
    "codeType": "MASTER",
    "masterCode": "TEST-2025",
    "maxUses": 10
  }'
```

### Canjear Código
```bash
curl -X POST http://localhost:3000/api/redeem-license \
  -H "Content-Type: application/json" \
  -d '{"code": "TEST-2025"}'
```

---

## 📞 SOPORTE

**Archivos de referencia:**
- `prisma/schema.prisma` - Modelos actualizados
- `/app/api/admin/organizations/route.ts` - CRUD de organizaciones
- `/app/api/admin/organizations/[id]/licenses/route.ts` - Generador de licencias
- `/app/api/school-admin/dashboard/route.ts` - Portal del director
- `/app/api/redeem-license/route.ts` - Canjear licencias (actualizado)
- `/components/dashboard/PlanSelectionModal.tsx` - Modal de planes

**Comandos útiles:**
```bash
# Ver organizaciones en Prisma Studio
npx prisma studio

# Consultar organizaciones
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const o=await p.organization.findMany({include:{_count:true}});console.table(o);await p.\$disconnect();})();"

# Ver licencias activas
node -e "const {PrismaClient}=require('@prisma/client');const p=new PrismaClient();(async()=>{const l=await p.license.findMany({where:{isActive:true}});console.table(l);await p.\$disconnect();})();"
```

---

**Última actualización:** Diciembre 2024  
**Estado:** Backend 100% | Frontend 20% | Testing Pendiente
