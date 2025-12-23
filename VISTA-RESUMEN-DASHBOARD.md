# 📊 Vista Resumen Dashboard - Carta F.R.U.T.O.S.

## 🎯 Descripción General

Vista tipo **"Tablero de Control de Metas"** que reemplaza el wizard paso a paso cuando la carta ya está en estado **EN_REVISION** o **APROBADA**.

## 📍 Rutas y Navegación

### Lógica de Redirección (`/dashboard/carta`)

```typescript
if (carta.estado === 'BORRADOR') {
  → /dashboard/carta/wizard-v2 (Modo Creación)
}
else if (carta.estado === 'EN_REVISION' || carta.estado === 'APROBADA') {
  → /dashboard/carta/resumen (Modo Gestión)
}
```

### Rutas Involucradas

- **`/dashboard/carta`** - Router inteligente (decide según estado)
- **`/dashboard/carta/wizard-v2`** - Wizard de creación (BORRADOR)
- **`/dashboard/carta/resumen`** - Vista resumen (EN_REVISION/APROBADA)

## 🎨 Diseño UI

### Estructura Visual

```
┌────────────────────────────────────────────┐
│ Header: "Mi Carta F.R.U.T.O.S."           │
│ Badge: 🟡 En Revisión / 🟢 Aprobada       │
│                                            │
│ [Alerta de Solo Lectura] (si APROBADA)    │
│ [Indicador de Cambios] (si hasChanges)    │
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ 💰 Finanzas (3 metas) ▼                   │
├────────────────────────────────────────────┤
│   #1 Ahorrar el 10% de mis ingresos...    │
│      🗓️ Lun Mié Vie                       ✏️│
│   #2 Meta 2...                             │
│      🎯 Única                              ✏️│
└────────────────────────────────────────────┘
┌────────────────────────────────────────────┐
│ ❤️ Relaciones (2 metas) ▼                 │
└────────────────────────────────────────────┘
```

### Componentes Visuales

#### 1. Header
- **Título**: "Mi Carta F.R.U.T.O.S."
- **Badge de Estado**:
  - 🟡 `EN_REVISION` - Amarillo con pulso animado
  - 🟢 `APROBADA` - Verde con ícono CheckCircle2

#### 2. Alertas Contextuales

**Carta Aprobada** (solo lectura):
```jsx
┌──────────────────────────────────────────┐
│ 🔒 Carta Aprobada - Solo Lectura        │
│ Tu carta ha sido aprobada por tu mentor │
└──────────────────────────────────────────┘
```

**Cambios Pendientes**:
```jsx
┌──────────────────────────────────────────┐
│ ⚠️ Tienes cambios sin reenviar          │
│ [Reenviar Cambios]                       │
└──────────────────────────────────────────┘
```

#### 3. Lista de Áreas (Acordeón)

- **Expansible/Colapsable** con ChevronUp/ChevronDown
- **Badge de Contador**: Muestra cantidad de metas
- **Estados**:
  - Hover: Border púrpura
  - Expandido: Muestra lista de metas

#### 4. Tarjetas de Metas

```jsx
┌────────────────────────────────────────┐
│ #1 [Texto de la meta]                 │
│    🗓️ Lun Mié Vie | 🎯 Única         ✏️│
└────────────────────────────────────────┘
```

**Elementos**:
- Número de orden
- Texto completo de la meta
- Badge de frecuencia:
  - 🗓️ Días específicos (Recurrente)
  - 🎯 Única
- Botón de edición (✏️) - Solo si NO está APROBADA
  - **Visibility**: `opacity-0 group-hover:opacity-100`

## ⚡ Funcionalidad

### 1. Estados de la Carta

```typescript
enum EstadoCarta {
  BORRADOR      → Wizard (creación)
  EN_REVISION   → Resumen (editable con reenvío)
  APROBADA      → Resumen (solo lectura)
}
```

### 2. Detección de Cambios (Dirty State)

```typescript
hasChanges: boolean = false

// Se activa cuando:
- Usuario edita una meta existente
- Guarda cambios desde el popup

// Se resetea cuando:
- Reenvía exitosamente para revisión
```

### 3. Edición de Metas (Popup Modal)

#### Trigger
- Click en ícono ✏️ de una meta
- **Condición**: Solo si `estado !== 'APROBADA'`

#### Contenido del Popup

```jsx
┌─────────────────────────────────────┐
│ Editar Meta                      [X]│
├─────────────────────────────────────┤
│ Texto de la Meta *                  │
│ [textarea]                          │
│                                     │
│ Frecuencia *                        │
│ [🎯 Única] [🗓️ Recurrente]        │
│                                     │
│ Días de la Semana * (si Recurrente)│
│ [Lun][Mar][Mié][Jue][Vie][Sáb][Dom]│
│                                     │
│ [Cancelar] [Guardar Cambios]       │
└─────────────────────────────────────┘
```

#### Validaciones
- ✅ Texto no vacío
- ✅ Si `frecuencia === 'RECURRENTE'` → `dias.length > 0`

#### Flujo de Guardado

1. Usuario modifica datos
2. Click en "Guardar Cambios"
3. Validación local
4. **PUT** `/api/carta/my-carta` con `metasConfiguradas` actualizado
5. Si éxito:
   - Actualiza estado local
   - Reorganiza vista por áreas
   - **`setHasChanges(true)`** ← Clave para activar reenvío
   - Cierra popup
6. Si error:
   - Muestra alert con mensaje

### 4. Reenvío para Revisión

#### Condiciones para Activar Botón

```typescript
const canResubmit = hasChanges && estado === 'EN_REVISION';
```

#### Ubicación del Botón

**Opción 1**: Header (dentro de alerta de cambios)
```jsx
[⚠️ Tienes cambios sin reenviar] [Reenviar Cambios]
```

**Opción 2**: Footer Flotante (Bottom-Right)
```jsx
┌───────────────────────┐
│ 💾 Reenviar para     │
│    Revisión          │
└───────────────────────┘
```

**Implementación Actual**: Ambas opciones disponibles

#### Flujo de Reenvío

1. Usuario hace cambios → `hasChanges = true`
2. Click en "Reenviar Cambios"
3. **POST** `/api/carta` con datos actualizados + `estado: 'EN_REVISION'`
4. Si éxito:
   - `setHasChanges(false)`
   - Mensaje: "✅ Cambios reenviados para revisión"
   - Badge actualizado a EN_REVISION

## 🔧 Endpoints API

### GET `/api/carta/my-carta`
Obtiene la carta del usuario actual con toda su configuración.

**Response**:
```json
{
  "carta": {
    "id": 1,
    "estado": "EN_REVISION",
    "identidades": { "finanzas": "...", ... },
    "metasPorArea": { "finanzas": [...], ... },
    "metasConfiguradas": [
      {
        "id": "uuid",
        "texto": "Ahorrar 10%...",
        "frecuencia": "RECURRENTE",
        "dias": ["lunes", "miercoles", "viernes"],
        "areaId": "finanzas"
      }
    ]
  },
  "isNew": false
}
```

### PUT `/api/carta/my-carta`
Actualiza parcialmente la carta (usado en auto-save y edición de metas).

**Request Body**:
```json
{
  "metasConfiguradas": [...]
}
```

**Validaciones**:
- ❌ No permite edición si `estado === 'APROBADA'`
- ✅ Actualiza `fechaActualizacion`

### POST `/api/carta`
Envía/reenvía la carta completa para revisión.

**Request Body**:
```json
{
  "id": 1,
  "identidadFinanciera": "...",
  "metasPorArea": { ... },
  "metasConfiguradas": [ ... ],
  "estado": "EN_REVISION"
}
```

## 📦 Datos y Estructura

### Interface Meta

```typescript
interface Meta {
  id: string;              // UUID generado en frontend
  texto: string;           // "Ahorrar el 10% de mis ingresos..."
  frecuencia: 'UNICA' | 'RECURRENTE';
  dias?: string[];         // ['lunes', 'miercoles', 'viernes']
  areaId: string;          // 'finanzas', 'relaciones', etc.
}
```

### Interface Area

```typescript
interface Area {
  id: string;              // 'finanzas'
  nombre: string;          // 'Finanzas'
  icono: string;           // '💰'
  metas: Meta[];           // Lista de metas de esta área
}
```

### Organización de Metas por Área

```typescript
const organizarMetasPorArea = (carta: CartaData) => {
  const areasConMetas = AREAS_CONFIG.map(areaConfig => {
    const metasDeArea = carta.metasConfiguradas?.filter(
      meta => meta.areaId === areaConfig.id
    ) || [];

    return {
      ...areaConfig,
      metas: metasDeArea
    };
  }).filter(area => area.metas.length > 0); // Solo áreas con metas

  setAreas(areasConMetas);
};
```

## 🎭 Estados y Comportamientos

### Matriz de Permisos

| Estado      | Ver Metas | Editar Metas | Botón Reenvío | Ícono ✏️ |
|-------------|-----------|--------------|---------------|----------|
| BORRADOR    | ❌        | ❌           | ❌            | ❌       |
| EN_REVISION | ✅        | ✅           | ✅ (si cambios)| ✅       |
| APROBADA    | ✅        | ❌           | ❌            | ❌       |

### isReadOnly

```typescript
const isReadOnly = cartaData?.estado === 'APROBADA';

// Afecta:
- Visibilidad del ícono ✏️
- Posibilidad de abrir popup de edición
- Mensaje de alerta "Solo Lectura"
- Color del badge (verde vs amarillo)
```

## 🚀 Flujo de Usuario Completo

### Caso 1: Usuario con Carta en Revisión

```
1. Usuario click "Mi Carta" en menú
2. Router verifica estado → EN_REVISION
3. Redirige a /dashboard/carta/resumen
4. Ve lista de sus metas organizadas por área
5. Encuentra un error en meta de Finanzas
6. Click en ✏️ → Abre popup
7. Modifica texto y días → Guarda
8. hasChanges = true
9. Aparece botón "Reenviar Cambios"
10. Click reenviar → POST /api/carta
11. Éxito → hasChanges = false, botón se oculta
12. Mentor recibe notificación de actualización
```

### Caso 2: Usuario con Carta Aprobada

```
1. Usuario click "Mi Carta"
2. Router verifica estado → APROBADA
3. Redirige a /dashboard/carta/resumen
4. Ve banner verde "Carta Aprobada - Solo Lectura"
5. Lista de metas sin íconos de edición
6. No puede modificar nada
7. Vista informativa/consulta únicamente
```

### Caso 3: Usuario sin Carta o en Borrador

```
1. Usuario click "Mi Carta"
2. Router verifica:
   - No existe → Crear nueva en BORRADOR
   - Existe pero estado = BORRADOR
3. Redirige a /dashboard/carta/wizard-v2
4. Completa wizard paso a paso
5. Al enviar → Cambia a EN_REVISION
6. Redirige automáticamente a /dashboard/carta/resumen
```

## 🎨 Clases CSS y Estilos

### Colores por Estado

```css
/* EN_REVISION */
bg-yellow-500/20 text-yellow-400 border-yellow-500/30

/* APROBADA */
bg-green-500/20 text-green-400 border-green-500/30

/* Botones de Acción */
bg-purple-600 hover:bg-purple-700 (principal)
bg-amber-600 hover:bg-amber-700 (reenvío)
```

### Animaciones

```typescript
// Badge pulsante (EN_REVISION)
<div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse"></div>

// Spinner de carga
<Loader2 className="w-8 h-8 animate-spin text-purple-500" />

// Hover en tarjeta de meta
opacity-0 group-hover:opacity-100 transition-all
```

## 🛡️ Validaciones y Seguridad

### Frontend
- ✅ Verificar estado antes de permitir edición
- ✅ Validar campos requeridos en popup
- ✅ Confirmar días si frecuencia es RECURRENTE

### Backend (API)
- ✅ Autenticación (requiere sesión)
- ✅ Propiedad (carta pertenece al usuario)
- ✅ Estado (no editar si APROBADA)
- ✅ Validación de estructura de datos

## 📝 Notas de Implementación

### Decisiones de Diseño

1. **Acordeón vs. Lista Plana**: Acordeón para mejor organización visual
2. **Popup vs. Inline Edit**: Popup para no romper el layout general
3. **Botón Flotante vs. Header**: Ambos disponibles para UX óptima
4. **Auto-expand**: Todas las áreas expandidas por defecto

### Mejoras Futuras

- [ ] Drag & Drop para reordenar metas
- [ ] Filtros por frecuencia (Solo Únicas, Solo Recurrentes)
- [ ] Búsqueda de metas por texto
- [ ] Vista de progreso por área (% completado)
- [ ] Historial de cambios (audit log)
- [ ] Comentarios del mentor inline

## 🔗 Archivos Involucrados

```
app/
  dashboard/
    carta/
      page.tsx                  (Router inteligente)
      resumen/
        page.tsx                (Vista resumen - NUEVO)
      wizard-v2/
        page.tsx                (Wizard de creación)

components/
  dashboard/
    CartaWizardRelacional.tsx   (Actualizado: redirige a /resumen)

api/
  carta/
    route.ts                    (POST - Submit/Resubmit)
    my-carta/
      route.ts                  (GET/PUT - Consulta/Actualización)
```

## ✅ Checklist de Funcionalidad

- [x] Router inteligente según estado
- [x] Vista resumen con acordeón de áreas
- [x] Badges de estado (EN_REVISION/APROBADA)
- [x] Alerta de solo lectura
- [x] Indicador de cambios pendientes
- [x] Popup de edición de metas
- [x] Validación de frecuencia y días
- [x] Guardado vía PUT /api/carta/my-carta
- [x] Detección de cambios (hasChanges)
- [x] Botón de reenvío condicional
- [x] Reenvío vía POST /api/carta
- [x] Protección de edición en APROBADA
- [x] Organización automática por áreas
- [x] Render de frecuencias (Única/Recurrente)
- [x] Estados de loading
- [x] Manejo de errores
- [x] Redirección post-submit desde wizard

---

**Fecha de Implementación**: 18 de Diciembre de 2025  
**Versión**: 1.0.0  
**Estado**: ✅ Completado y Listo para Producción
