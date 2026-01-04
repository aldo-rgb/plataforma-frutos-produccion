# 📊 Sistema de Reportes y Control - Documentación Completa

## 🎯 Visión General

Sistema administrativo de reportes financieros y operativos diseñado para dar al equipo de administración **visibilidad total** sobre la salud económica de la plataforma y el desempeño de los mentores.

---

## 🏗️ Arquitectura del Sistema

### 📂 Estructura de Navegación (Sidebar)

Nueva sección agregada al menú del administrador:

```
📊 REPORTES Y CONTROL
├── 📈 Resumen Financiero (/dashboard/admin/reports/financial)
├── 📅 Control de Reservas (/dashboard/admin/reports/bookings)
└── 📦 Paquetes y Mentores (/dashboard/admin/reports/packages)
```

**Acceso:** Solo usuarios con rol `ADMIN` o `ADMINISTRADOR`

---

## 📈 SECCIÓN 1: Resumen Financiero

### Ruta
`/dashboard/admin/reports/financial`

### Descripción
Dashboard de "Alto Nivel" que muestra la salud económica de la plataforma.

### 🎯 KPIs Principales (Tarjetas)

#### 1. Ventas Brutas Totales (Gross Revenue)
- **Color:** 🔵 Cyan
- **Descripción:** Dinero total que ha entrado (Suscripciones + Paquetes)
- **Cálculo:** `SUM(LicenseOrder.amount) + SUM(MentorPackageOrder.totalAmount)` donde status = 'COMPLETED'

#### 2. Revenue Neto Quantum
- **Color:** 🟢 Verde Neón
- **Descripción:** Lo que realmente es de la plataforma (Ventas - Comisiones pagadas)
- **Cálculo:** `Gross Revenue - SUM(MentorPayrollItem.totalAmount)` donde status = 'PAID'

#### 3. En Custodia (Escrow)
- **Color:** 🟡 Ámbar (Alerta: "No gastar esto")
- **Descripción:** Dinero cobrado pero que "pertenece" a los mentores (aún no ejecutado)
- **Cálculo:** `(SchoolCredit.totalPurchased - totalAllocated) * 90`
- **⚠️ Advertencia:** Este dinero NO está disponible para gastos operativos

#### 4. Comisiones por Pagar
- **Color:** 🔴 Rojo (Pasivo circulante)
- **Descripción:** Dinero de sesiones YA ejecutadas que se debe transferir esta semana
- **Cálculo:** `COUNT(CallBooking)` donde status IN ('COMPLETED', 'MISSED_BY_USER') y no pagado × $90

### 📊 Gráfico de Flujo de Dinero

**Tipo:** Gráfico de líneas comparativo (Últimos 30 días)

- **Eje X:** Días del mes (últimos 30 días)
- **Eje Y:** Dinero ($)
- **Líneas:**
  - 🟢 Verde: Ingresos Totales
  - 🔴 Roja: Pagos a Mentores

**Objetivo:** Visualizar tendencias y detectar anomalías en el flujo de efectivo.

### 📌 Estadísticas Adicionales

- Total de Mentores
- Mentores Activos (disponibles y aceptando clientes)
- Total de Organizaciones
- Visiones Activas

### 🔌 API Endpoint

**GET** `/api/admin/stats/financial`

**Autenticación:** Requiere sesión con rol ADMIN/ADMINISTRADOR

**Response:**
```typescript
{
  success: true,
  kpis: {
    grossRevenue: number,
    netRevenue: number,
    escrowAmount: number,
    commissionsToPay: number
  },
  chartData: Array<{
    date: string,
    revenue: number,
    payouts: number
  }>,
  stats: {
    totalMentors: number,
    activeMentors: number,
    totalOrganizations: number,
    activeVisions: number
  }
}
```

---

## 📅 SECCIÓN 2: Control de Reservas

### Ruta
`/dashboard/admin/reports/bookings`

### Descripción
Torre de Control Operativa - Actividad en tiempo real de todas las reservaciones.

### 🎯 Funcionalidades

#### Tabla Maestra de Reservas

**Columnas:**
- **Fecha/Hora** - Cuándo está programada la llamada
- **Tipo** - [ 📞 Disciplina ] o [ 🎓 Mentoría 1:1 ]
- **Mentor** - Nombre + Avatar del mentor
- **Alumno** - Nombre + Organización a la que pertenece
- **Estado** - Badge con icono y color según estado
- **Valor** - Costo de la llamada (si genera pago)

#### Estados de Llamadas

| Estado | Icon | Color | Genera Pago |
|--------|------|-------|-------------|
| SCHEDULED | 🕐 | Azul | No (pendiente) |
| COMPLETED | ✅ | Verde | **Sí ($90)** |
| MISSED_BY_USER | ⚠️ | Naranja | **Sí ($90)** |
| MISSED_BY_MENTOR | ❌ | Rojo | **No** |
| CANCELLED | ⚫ | Gris | **No** |

#### Filtros Avanzados

1. **Por Estado** - Ver solo programadas, completadas, etc.
2. **Por Tipo** - Disciplina o Mentoría 1:1
3. **Por Mentor** - "¿Qué tiene agendado Juan Pérez esta semana?"
4. **Búsqueda** - Por nombre de mentor o alumno

#### Paginación
- 50 registros por página
- Navegación con botones Previous/Next
- Indicador de "Mostrando X-Y de Z"

### 📊 Resumen Superior

Dos tarjetas que muestran:
- **Total de Reservas** (en la vista actual)
- **Valor Total** (suma de llamadas pagables)

### 🔌 API Endpoint

**GET** `/api/admin/reports/bookings`

**Query Parameters:**
- `page` - Número de página (default: 1)
- `limit` - Registros por página (default: 50)
- `mentorId` - Filtrar por mentor específico
- `status` - Filtrar por estado
- `type` - Filtrar por tipo (DISCIPLINE/MENTORSHIP)

**Response:**
```typescript
{
  success: true,
  bookings: Array<{
    id: string,
    date: string,
    type: 'DISCIPLINE' | 'MENTORSHIP',
    mentor: { id, name, avatar },
    student: { id, name, organization },
    vision: { id, name } | null,
    status: string,
    value: number,
    notes: string | null
  }>,
  pagination: {
    page: number,
    limit: number,
    total: number,
    totalPages: number
  },
  summary: {
    totalValue: number,
    totalBookings: number
  }
}
```

---

## 📦 SECCIÓN 3: Paquetes y Mentores

### Ruta
`/dashboard/admin/reports/packages`

### Descripción
Auditoría de Ventas por Mentor - Responde: "¿Quién le compró qué a cada mentor?"

### 🎯 Vista de Acordeón por Mentor

#### Encabezado del Mentor (Siempre Visible)

**Información mostrada:**
- Avatar/Foto
- Nombre del mentor
- Badge de disponibilidad (🟢 Disponible)
- Email

**KPIs del Mentor:**
- 👥 **Alumnos Activos** - Estudiantes actuales
- 💰 **Ventas/Mes** - Ingresos generados este mes
- 📈 **Tasa de Retención** - % de alumnos que continúan

#### Contenido Expandible (Al hacer click)

**Sub-tabla de Clientes:**

| Cliente | Paquete | Progreso | Fecha Compra | Valor Total |
|---------|---------|----------|--------------|-------------|
| Escuela Alfa | Paquete Disciplina | 📊 14/32 llamadas | 01/Ene/2026 | $50,000 |
| Pedro Páramo | Mentoría Premium | 📊 2/52 sesiones | 15/Feb/2026 | $25,000 |

**Barra de Progreso Visual:**
- 🟢 Verde: 0-49% consumido (mucho tiempo restante)
- 🟡 Amarillo: 50-79% consumido (a la mitad)
- 🔴 Rojo: 80-100% consumido (próximo a renovar)

### 📊 Resumen Superior

Tres tarjetas globales:
- **Total de Mentores** - Cuántos mentores hay en el sistema
- **Alumnos Activos (Total)** - Suma de todos los alumnos activos
- **Ventas del Mes** - Suma de todas las ventas mensuales

### 🔌 API Endpoint

**GET** `/api/admin/reports/packages`

**Autenticación:** Requiere sesión con rol ADMIN/ADMINISTRADOR

**Response:**
```typescript
{
  success: true,
  mentors: Array<{
    mentor: {
      id: number,
      name: string,
      email: string,
      avatar: string | null,
      available: boolean,
      acceptingClients: boolean,
      rating: number
    },
    summary: {
      activeStudents: number,
      monthlySales: number,
      retentionRate: number,
      totalPackages: number
    },
    packages: Array<{
      client: string,
      package: string,
      visionId: number,
      visionName: string,
      progress: { used: number, total: number },
      purchaseDate: string,
      totalValue: number,
      status: string
    }>
  }>,
  totalMentors: number
}
```

---

## 🔐 Seguridad

### Control de Acceso

**Rutas protegidas a nivel de:**

1. **Frontend** - Sidebar solo muestra sección a ADMIN/ADMINISTRADOR
2. **Backend** - Todos los endpoints validan:
   ```typescript
   const user = await prisma.usuario.findUnique({
     where: { email: session.user.email },
     select: { id: true, rol: true }
   });

   if (!user || (user.rol !== 'ADMIN' && user.rol !== 'ADMINISTRADOR')) {
     return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
   }
   ```

### Roles con Acceso

✅ **Permitidos:**
- `ADMIN`
- `ADMINISTRADOR`

❌ **Denegados:**
- `COORDINADOR`
- `DIRECTOR`
- `MENTOR`
- `GAME_CHANGER`
- `PARTICIPANTE`
- `LIDER`

---

## 🎨 Diseño UI/UX

### Paleta de Colores

#### KPIs
- 🔵 **Cyan/Blue** - Ventas Brutas (información primaria)
- 🟢 **Emerald/Green** - Revenue Neto (positivo, ganancia)
- 🟡 **Amber/Orange** - Escrow (advertencia, no disponible)
- 🔴 **Red/Rose** - Comisiones (pasivo, debe pagarse)

#### Estados
- 🔵 **Blue** - Scheduled (futuro)
- 🟢 **Green** - Completed (éxito)
- 🟡 **Orange** - Missed by User (advertencia)
- 🔴 **Red** - Missed by Mentor (error)
- ⚫ **Gray** - Cancelled (neutro)

### Componentes Reutilizables

- **KPI Cards** - Tarjetas con gradiente y estadística destacada
- **Status Badges** - Pills con icono + color según estado
- **Progress Bars** - Barras de progreso con código de colores
- **Data Tables** - Tablas paginadas con hover effects
- **Accordion** - Componentes expansibles para detalles

### Responsividad

- **Mobile First** - Grid adaptable (1 col → 2 cols → 4 cols)
- **Sticky Headers** - Encabezados fijos en tablas largas
- **Overflow Scrolling** - Tablas con scroll horizontal en móvil

---

## 📊 Tecnologías Utilizadas

### Frontend
- **Framework:** Next.js 14 (App Router)
- **UI Library:** React 18
- **Styling:** Tailwind CSS
- **Charts:** Chart.js + react-chartjs-2
- **Icons:** Lucide React

### Backend
- **Runtime:** Node.js
- **ORM:** Prisma Client
- **Database:** PostgreSQL (Supabase)
- **Auth:** NextAuth.js

### Librerías de Gráficos
```bash
npm install chart.js react-chartjs-2
```

**Configuración:**
```typescript
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  Filler
);
```

---

## 🚀 Instalación y Deployment

### 1. Instalar Dependencias
```bash
npm install chart.js react-chartjs-2
```

### 2. Verificar Migraciones
```bash
npx prisma generate
npx prisma db push
```

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Acceder al Sistema
```
http://localhost:3000/dashboard/admin/reports/financial
http://localhost:3000/dashboard/admin/reports/bookings
http://localhost:3000/dashboard/admin/reports/packages
```

---

## 📝 Casos de Uso

### 1. "¿Cuánto dinero entró hoy?"
→ **Resumen Financiero** → Ver KPI "Ventas Brutas Totales"

### 2. "¿Qué mentor está saturado?"
→ **Paquetes y Mentores** → Ver "Alumnos Activos" de cada mentor

### 3. "¿Cuánto debo pagar el viernes?"
→ **Resumen Financiero** → Ver KPI "Comisiones por Pagar"

### 4. "¿Qué tiene agendado Juan Pérez esta semana?"
→ **Control de Reservas** → Filtrar por mentor "Juan Pérez"

### 5. "¿Qué organizaciones le compraron a este mentor?"
→ **Paquetes y Mentores** → Expandir acordeón del mentor → Ver tabla de clientes

### 6. "¿Hay llamadas con problemas?"
→ **Control de Reservas** → Filtrar por estado "MISSED_BY_MENTOR"

---

## 🔄 Integración con Sistema Existente

### Conecta con:

1. **Sistema de Nómina** (`WeeklyPayrollPeriod`, `MentorPayrollItem`)
   - Calcula "Comisiones por Pagar"
   
2. **Sistema de Escrow** (`SchoolCredit`)
   - Muestra dinero en custodia

3. **Sistema de Reservas** (`CallBooking`)
   - Lista todas las llamadas programadas

4. **Sistema de Paquetes** (`MentorPackageOrder`, `VisionMentor`)
   - Muestra ventas por mentor

5. **Sistema de Organizaciones** (`Organization`, `Vision`)
   - Vincula alumnos con organizaciones

---

## ✅ Checklist de Implementación

- [x] Actualizar Sidebar con nueva sección
- [x] Crear endpoint `/api/admin/stats/financial`
- [x] Crear endpoint `/api/admin/reports/bookings`
- [x] Crear endpoint `/api/admin/reports/packages`
- [x] Crear página Financial Dashboard
- [x] Crear página Bookings Control
- [x] Crear página Packages & Mentors
- [x] Instalar Chart.js + react-chartjs-2
- [x] Implementar protección de rutas (backend)
- [x] Implementar protección de rutas (frontend)
- [x] Documentar sistema completo

---

## 🎯 Próximos Pasos (Mejoras Futuras)

### Funcionalidades Adicionales

1. **Exportación de Datos**
   - Botón "Exportar a CSV" en cada sección
   - Botón "Exportar a Excel" con formato

2. **Alertas Automáticas**
   - Email cuando comisiones pendientes > $10,000
   - Notificación cuando mentor alcanza 90% capacidad

3. **Comparativas Históricas**
   - "Este mes vs mes anterior"
   - "Este trimestre vs trimestre anterior"

4. **Drill-Down Avanzado**
   - Click en tarjeta → Ver detalle de transacciones
   - Click en gráfico → Ver llamadas de ese día

5. **Filtros de Fecha**
   - Selector de rango personalizado
   - Presets: "Hoy", "Esta semana", "Este mes", "Este año"

6. **Dashboard Personalizable**
   - Drag & drop de widgets
   - Guardar vistas personalizadas

---

## 🐛 Troubleshooting

### Error: "No autorizado"
**Causa:** Usuario no tiene rol ADMIN/ADMINISTRADOR
**Solución:** Verificar rol en base de datos

### Error: "Error al cargar datos financieros"
**Causa:** Problema de conexión con base de datos
**Solución:** Verificar Prisma Client y credenciales de DB

### Gráficos no se muestran
**Causa:** Chart.js no instalado o no registrado
**Solución:** 
```bash
npm install chart.js react-chartjs-2
```

### Tabla vacía en Bookings
**Causa:** No hay llamadas en CallBooking
**Solución:** Crear llamadas de prueba o esperar registros reales

---

## 📞 Soporte

Para dudas o problemas:
- Revisar logs del servidor (`console.log` en endpoints)
- Verificar Network tab en DevTools
- Consultar documentación de Prisma
- Revisar estructura de la base de datos

---

**Última actualización:** 3 de enero de 2026
**Versión del sistema:** 1.0.0
**Autor:** Sistema Quantum Frutos
