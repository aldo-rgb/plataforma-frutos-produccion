# 🎓 Panel Maestro de Gestión de Talentos (Admin Side)

## Descripción General

Sistema completo de administración de mentores para la plataforma Frutos del Campo. Permite dar de alta, editar y gestionar perfiles completos de mentores que luego aparecen en el catálogo público.

---

## 📋 Flujo Completo del Usuario (User Journey)

### Para Clientes (User Side):

```
1. CATÁLOGO → Cliente entra a /dashboard/mentorias
   └─ Ve grilla con todos los mentores disponibles
   └─ Filtros: TODOS / JUNIOR / SENIOR / MASTER
   └─ Tarjetas atractivas con biografía corta y precio

2. INTERÉS → Cliente da click en "Ver Perfil Completo"
   └─ Si solo hay 1 mentor: MODO HÉROE (vista directa)
   └─ Si hay 2+: Abre modal con perfil completo

3. DETALLE → Cliente lee biografía completa, logros, experiencia
   └─ Ve opciones de servicios (1:1, Paquete, Express)
   └─ Selecciona fecha, hora y agrega notas

4. CONVERSIÓN → Click en "Pagar y Agendar"
   └─ Se crea solicitud en DB
   └─ Se divide pago (85% mentor / 15% plataforma)
   └─ Confirmación inmediata
```

### Para Administradores (Admin Side):

```
1. ACCESO → Admin entra a /dashboard/admin/mentores
   └─ Ve tabla con todos los mentores registrados
   └─ Estadísticas: Total, Disponibles, Destacados, Sesiones

2. CREAR → Admin da click en "Agregar Nuevo Mentor"
   └─ Formulario maestro con 4 secciones (A, B, C, D)
   └─ Completa datos básicos, perfil público, finanzas y visibilidad
   └─ Submit → Mentor creado en DB

3. EDITAR → Admin da click en botón "Editar"
   └─ Carga datos actuales del mentor
   └─ Modifica campos necesarios
   └─ Submit → Cambios guardados

4. GESTIONAR → Admin puede:
   └─ Toggle disponibilidad (Activo/Inactivo)
   └─ Toggle destacado (aparece primero en catálogo)
   └─ Eliminar mentor (solo si no tiene solicitudes)
```

---

## 🏗️ Arquitectura del Sistema

### Base de Datos (Prisma Schema)

```prisma
model PerfilMentor {
  id                     Int       @id @default(autoincrement())
  usuarioId              Int       @unique
  usuario                Usuario   @relation(...)
  
  // Clasificación
  nivel                  NivelMentor @default(JUNIOR)
  titulo                 String?   // "Senior Marketing Strategist"
  
  // Especialidades
  especialidad           String    // Principal
  especialidadesSecundarias String[] @default([]) // Tags adicionales
  
  // Biografías (dos versiones)
  biografiaCorta         String?   @db.Text // 150-200 chars (catálogo)
  biografiaCompleta      String?   @db.Text // Descripción larga (perfil)
  
  // Logros destacados
  logros                 String[]  @default([]) // Array de bullets
  
  // Métricas
  experienciaAnios       Int       @default(0)
  totalSesiones          Int       @default(0)
  calificacionPromedio   Float     @default(0)
  totalResenas           Int       @default(0)
  
  // Visibilidad
  disponible             Boolean   @default(true)
  destacado              Boolean   @default(false)
  
  // Comisiones
  comisionMentor         Int       @default(85)
  comisionPlataforma     Int       @default(15)
}
```

### APIs REST

#### 1. GET `/api/admin/mentores` - Listar Todos
- **Auth:** Solo ADMIN
- **Response:**
```json
{
  "success": true,
  "mentores": [
    {
      "id": 1,
      "usuario": { "nombre": "Roberto", "email": "...", "imagen": "..." },
      "nivel": "SENIOR",
      "titulo": "Senior Marketing Strategist",
      "especialidad": "Estrategia de Negocios",
      "especialidadesSecundarias": ["Marketing Digital", "SEO"],
      "biografiaCorta": "Experto en...",
      "biografiaCompleta": "Con más de 10 años...",
      "logros": ["500+ emprendedores asesorados", "..."],
      "experienciaAnios": 10,
      "totalSesiones": 45,
      "disponible": true,
      "destacado": false,
      "comisionMentor": 85,
      "comisionPlataforma": 15,
      "servicios": [...],
      "precioBase": 1000,
      "totalSolicitudes": 25
    }
  ]
}
```

#### 2. POST `/api/admin/mentores` - Crear Mentor
- **Auth:** Solo ADMIN
- **Body:**
```json
{
  "usuarioId": 5,
  "nivel": "SENIOR",
  "titulo": "Senior Marketing Strategist",
  "especialidad": "Marketing Digital",
  "especialidadesSecundarias": ["SEO", "Branding"],
  "biografiaCorta": "Experto en...",
  "biografiaCompleta": "Con más de 10 años...",
  "logros": ["500+ emprendedores", "..."],
  "experienciaAnios": 10,
  "comisionMentor": 85,
  "comisionPlataforma": 15,
  "disponible": true,
  "destacado": false
}
```

#### 3. GET `/api/admin/mentores/[id]` - Obtener Mentor
- **Auth:** Solo ADMIN
- **Response:** Objeto completo del mentor

#### 4. PUT `/api/admin/mentores/[id]` - Actualizar Mentor
- **Auth:** Solo ADMIN
- **Body:** Campos a actualizar (parciales)

#### 5. DELETE `/api/admin/mentores/[id]` - Eliminar Mentor
- **Auth:** Solo ADMIN
- **Validación:** Solo si `totalSolicitudes === 0`
- **Error:** Si tiene solicitudes → "No se puede eliminar, desactiva en lugar"

#### 6. GET `/api/mentorias/mentores` - Catálogo Público
- **Auth:** Usuario autenticado
- **Filtro:** Solo mentores con `disponible: true`
- **Orden:** Destacados primero → Nivel DESC → Rating DESC

---

## 🎨 Interfaz de Usuario

### 1. Panel de Gestión (Tabla)
**Ruta:** `/dashboard/admin/mentores`

**Componentes:**
- Header con título y botón "Agregar Nuevo Mentor"
- 4 Cards de estadísticas:
  - Total Mentores
  - Disponibles
  - Destacados
  - Total Sesiones
- Tabla con columnas:
  - Mentor (foto + nombre + título)
  - Nivel (badge JUNIOR/SENIOR/MASTER)
  - Especialidad (+ secundarias)
  - Tarifa Base ($)
  - Comisión (% plataforma / % mentor)
  - Rating (estrellas + reseñas)
  - Estado (toggle Activo/Inactivo + badge Destacado)
  - Acciones (Editar / Eliminar)

**Funcionalidades:**
- Click en toggle disponibilidad → PUT request
- Click en Editar → Navega a `/dashboard/admin/mentores/[id]/editar`
- Click en Eliminar → Muestra modal de confirmación
- Si tiene solicitudes → Alerta "No se puede eliminar"

---

### 2. Formulario Maestro (Creación/Edición)
**Ruta:** `/dashboard/admin/mentores/crear`

**Estructura en 4 Secciones:**

#### **A. Datos Básicos** (User icon)
- Usuario (select dropdown - solo usuarios sin perfil de mentor)
- Nivel (3 botones: JUNIOR / SENIOR / MASTER)
- Título/Cargo Profesional (text input)
- Especialidad Principal (text input) *Requerido
- Especialidades Secundarias (array dinámico de inputs)
  - Botón "Agregar especialidad"
  - Botón "Eliminar" por cada una
- Años de Experiencia (number input)

#### **B. Perfil Público** (FileText icon)
- Biografía Corta (textarea, max 200 chars)
  - Para tarjetas del catálogo
  - Contador de caracteres
- Biografía Completa (textarea grande, sin límite)
  - Para perfil detallado en Modo Héroe/Modal
- Logros Destacados (array dinámico de inputs)
  - Botón "Agregar logro"
  - Botón "Eliminar" por cada uno
  - Se muestran como bullets en el perfil

#### **C. Configuración Financiera** (DollarSign icon)
- Comisión Plataforma (number input, %)
- Comisión Mentor (number input, %)
- Info box: "Precios de servicios se configurarán después"

#### **D. Visibilidad y Estado** (Eye icon)
- Checkbox "Disponible"
  - Activo → Aparece en catálogo público
  - Inactivo → Oculto
- Checkbox "Destacado"
  - Badge especial en tarjeta
  - Aparece primero en el catálogo

**Botones de Acción:**
- Cancelar (gris)
- Crear Mentor (purple, con loading spinner)

---

### 3. Catálogo de Mentores (Mejorado)
**Ruta:** `/dashboard/mentorias`

**Vista de Tarjetas (Grid 3 columnas):**

```
┌─────────────────────────────────┐
│ [DESTACADO]        [SENIOR] 🏅  │
│                                  │
│      📸 Foto Grande             │
│                                  │
│ Roberto Martínez                 │
│ Senior Marketing Strategist      │
│ Estrategia de Negocios           │
│                                  │
│ "Experto en ayudar empresas..."  │ ← Biografía corta
│                                  │
│ [Marketing Digital] [SEO] +2     │ ← Tags
│                                  │
│ ┌──────────┬──────────┐          │
│ │ 10 años  │ ⭐ 4.9   │          │
│ │          │ (45)     │          │
│ └──────────┴──────────┘          │
│                                  │
│ Precio desde                     │
│ $1,000 / sesión                  │
│                                  │
│ [Ver Perfil Completo] ←────────  │ ← CTA mejorado
└─────────────────────────────────┘
```

**Mejoras Visuales:**
- Badge "DESTACADO" en amarillo si `destacado: true`
- Ring dorado en borde de tarjeta destacada
- Biografía corta visible (line-clamp-2)
- Tags de especialidades secundarias (max 2 visibles + "más")
- Stats en grid 2x2 con iconos
- Precio destacado en box gradient
- Botón llamativo "Ver Perfil Completo" (en lugar de "Agendar")

---

### 4. Modo Héroe (Actualizado)
**Activación:** Automática cuando `mentores.length === 1`

**Vista 2 Columnas:**

**Columna Izquierda (Perfil):**
- Foto grande (h-64)
- Badge nivel + Badge destacado (si aplica)
- Nombre + Título profesional
- Especialidad principal
- Tags de especialidades secundarias (todas visibles)
- 5 estrellas + calificación
- **Biografía Completa** (prioridad sobre biografía corta)
- Sección "Logros Destacados" con:
  - Si hay logros en DB → Lista de bullets
  - Si no → Logros por defecto (años, sesiones, rating)

**Columna Derecha (Formulario):**
- (Sin cambios - ya funcional)

---

## 🔄 Integración de Datos

### Prioridad de Campos en Frontend

#### Biografía (en Modo Héroe):
```javascript
const biografia = mentor.biografiaCompleta 
  || mentor.biografiaCorta 
  || mentor.biografia // compatibilidad
```

#### Logros (en Modo Héroe):
```javascript
if (mentor.logros && mentor.logros.length > 0) {
  // Mostrar logros personalizados desde DB
  mentor.logros.map(logro => <li>{logro}</li>)
} else {
  // Mostrar logros por defecto
  <li>{mentor.experienciaAnios} años de experiencia</li>
  <li>+{mentor.totalSesiones} sesiones exitosas</li>
  <li>Rating {mentor.calificacionPromedio}/5</li>
}
```

#### Especialidades en Tarjeta:
```javascript
{mentor.especialidadesSecundarias.slice(0, 2).map(tag => (
  <span className="badge">{tag}</span>
))}
{mentor.especialidadesSecundarias.length > 2 && (
  <span>+{mentor.especialidadesSecundarias.length - 2} más</span>
)}
```

---

## 🎯 Casos de Uso

### Caso 1: Agregar Primer Mentor
```bash
1. Admin navega a /dashboard/admin/mentores
2. Click en "Agregar Nuevo Mentor"
3. Completa formulario:
   - Usuario: Roberto (rol: MENTOR)
   - Nivel: SENIOR
   - Título: "Senior Marketing Strategist"
   - Especialidad: "Estrategia de Negocios"
   - Tags: ["Marketing Digital", "SEO"]
   - Biografía corta: "Experto en ayudar empresas a escalar..."
   - Biografía completa: "Con más de 10 años de experiencia..."
   - Logros: ["500+ emprendedores asesorados", "Empresas de $0 a $1M"]
   - Experiencia: 10 años
   - Comisiones: 15% plataforma / 85% mentor
   - ✓ Disponible
   - ✓ Destacado
4. Click "Crear Mentor"
5. Mentor creado → Redirige a tabla
6. Cliente visita /dashboard/mentorias → Ve MODO HÉROE automáticamente
```

### Caso 2: Editar Mentor Existente
```bash
1. Admin en tabla de mentores
2. Click botón "Editar" en fila de Roberto
3. Formulario carga con datos actuales
4. Admin modifica:
   - Biografía completa (agrega más detalles)
   - Agrega nuevo logro: "Speaker en 20+ conferencias"
5. Click "Guardar Cambios"
6. Cambios aplicados → Cliente ve info actualizada inmediatamente
```

### Caso 3: Destacar Mentor
```bash
1. Admin en tabla
2. Click en checkbox "Destacado" de Ana Sofía
3. PUT request → destacado: true
4. Recarga tabla → Ana tiene badge amarillo
5. Cliente visita catálogo:
   - Ana aparece PRIMERO en el grid
   - Tarjeta tiene ring dorado
   - Badge "DESTACADO" visible
```

### Caso 4: Desactivar Mentor Temporalmente
```bash
1. Roberto va de vacaciones
2. Admin click toggle "Disponible" → OFF
3. PUT request → disponible: false
4. Cliente visita catálogo:
   - Solo ve Ana y Carlos
   - Si solo queda 1 disponible → MODO HÉROE se activa
```

### Caso 5: Intentar Eliminar Mentor con Solicitudes
```bash
1. Admin click botón "Eliminar" en Roberto
2. Modal de confirmación:
   "⚠️ Este mentor tiene 25 solicitudes asociadas"
3. Si admin confirma:
   - DELETE request
   - API responde: "No se puede eliminar, desactiva en lugar"
4. Admin usa toggle "Disponible" en lugar de eliminar
```

---

## 📊 Flujo de Revenue Share

### División Automática de Pagos

```javascript
// En API /api/mentorias/solicitar

const montoTotal = servicio.precioTotal; // ej. $1,000
const comisionPlataforma = perfilMentor.comisionPlataforma; // 15
const comisionMentor = perfilMentor.comisionMentor; // 85

const montoPagadoPlataforma = (1000 * 15) / 100; // $150
const montoPagadoMentor = (1000 * 85) / 100; // $850

// Se crea SolicitudMentoria con estos montos
// Se crea Transaccion vinculada
```

### Ejemplo Real:
```
Cliente paga: $1,000 por sesión 1:1
├─ $150 (15%) → Plataforma
└─ $850 (85%) → Roberto Martínez
```

### Personalización por Mentor:
```
// Admin puede configurar comisiones personalizadas:

Mentor Junior: 80% mentor / 20% plataforma
Mentor Senior: 85% mentor / 15% plataforma (default)
Mentor Master: 90% mentor / 10% plataforma (prémium)
```

---

## 🚀 Comandos Útiles

### Desarrollo
```bash
# Iniciar servidor
npm run dev

# Regenerar Prisma Client (después de cambios en schema)
npx prisma generate

# Ver base de datos en navegador
npx prisma studio
```

### Migraciones
```bash
# Ver última migración
ls -la prisma/migrations/ | tail -1

# Aplicar migraciones pendientes (producción)
npx prisma migrate deploy
```

### Testing
```bash
# Probar Panel Admin (como ADMINISTRADOR)
# URL: http://localhost:3000/dashboard/admin/mentores
# Login: admin@frutos.com / admin123

# Probar Catálogo (como CLIENTE)
# URL: http://localhost:3000/dashboard/mentorias
# Login: participante@frutos.com / participante123

# Modo Héroe (cuando solo hay 1 mentor disponible)
npm run toggle-modo heroe
# Recarga navegador

# Modo Catálogo (cuando hay 2+ mentores)
npm run toggle-modo catalogo
# Recarga navegador
```

---

## 📁 Estructura de Archivos

```
plataforma-frutos-FINAL/
│
├── app/
│   ├── api/
│   │   ├── admin/
│   │   │   └── mentores/
│   │   │       ├── route.ts           ← GET /POST (lista + crear)
│   │   │       └── [id]/
│   │   │           └── route.ts       ← GET /PUT /DELETE (individual)
│   │   │
│   │   └── mentorias/
│   │       └── mentores/
│   │           └── route.ts           ← GET (catálogo público)
│   │
│   └── dashboard/
│       ├── admin/
│       │   └── mentores/
│       │       ├── page.tsx           ← Tabla de gestión
│       │       ├── crear/
│       │       │   └── page.tsx       ← Formulario maestro (crear)
│       │       └── [id]/
│       │           └── editar/
│       │               └── page.tsx   ← Formulario maestro (editar)
│       │
│       └── mentorias/
│           └── page.tsx               ← Catálogo + Modo Héroe
│
├── components/
│   └── dashboard/
│       └── Sidebar.tsx                ← Enlace "Gestión de Mentores"
│
├── prisma/
│   ├── schema.prisma                  ← Modelo PerfilMentor extendido
│   └── migrations/
│       └── 20251212190342_add_rich_mentor_profile_fields/
│           └── migration.sql          ← Migración con nuevos campos
│
└── PANEL-MAESTRO-MENTORES.md         ← Esta documentación
```

---

## 🎨 Mejoras Visuales Implementadas

### Catálogo (Tarjetas)
✅ Badge "DESTACADO" en amarillo  
✅ Ring dorado en tarjetas destacadas  
✅ Foto más grande (h-40 en lugar de h-32)  
✅ Biografía corta visible con line-clamp-2  
✅ Tags de especialidades secundarias  
✅ Stats en grid 2x2 con fondo  
✅ Precio en box gradient destacado  
✅ Botón "Ver Perfil Completo" más llamativo  

### Modo Héroe
✅ Título profesional visible en header  
✅ Badge destacado en foto (si aplica)  
✅ Tags de especialidades secundarias (todas)  
✅ Biografía completa con formato (whitespace-pre-line)  
✅ Logros personalizados desde DB  
✅ Fallback a logros por defecto  

### Panel Admin
✅ Cards de estadísticas con iconos  
✅ Tabla responsive con hover effects  
✅ Badges de nivel con colores distintos  
✅ Toggle inline para disponibilidad  
✅ Modal de confirmación para eliminar  
✅ Validación de solicitudes antes de eliminar  

---

## 🔮 Próximas Mejoras (Futuro)

### Fase 2: Servicios de Mentoría
- [ ] Crear API para CRUD de servicios
- [ ] Formulario para agregar servicios al perfil
- [ ] Edición inline de precios en tabla
- [ ] Paquetes personalizados por mentor

### Fase 3: Panel del Mentor
- [ ] `/dashboard/mentor` para que mentores vean sus solicitudes
- [ ] Aceptar/Rechazar solicitudes
- [ ] Ver historial de sesiones
- [ ] Dashboard de earnings

### Fase 4: Sistema de Reseñas
- [ ] Formulario post-sesión para clientes
- [ ] Moderación de reseñas por admin
- [ ] Display de testimonios en perfil

### Fase 5: Disponibilidad en Tiempo Real
- [ ] Calendario integrado
- [ ] Bloques horarios configurables
- [ ] Sincronización con Google Calendar
- [ ] Recordatorios automáticos

---

## ✅ Checklist de Implementación Completa

- [x] Extender schema Prisma con campos ricos
- [x] Crear migración de base de datos
- [x] Implementar API admin CRUD completa
- [x] Crear página de tabla de gestión
- [x] Crear formulario maestro de creación
- [x] Actualizar catálogo con tarjetas mejoradas
- [x] Actualizar Modo Héroe con biografía completa
- [x] Agregar enlace en Sidebar admin
- [x] Actualizar API pública con nuevos campos
- [x] Documentación completa

**Estado:** ✅ Sistema completamente funcional y listo para producción

---

**Versión:** 1.0  
**Fecha:** 12 de diciembre de 2025  
**Autor:** GitHub Copilot con Claude Sonnet 4.5  
**Licencia:** Privado - Plataforma Frutos del Campo
