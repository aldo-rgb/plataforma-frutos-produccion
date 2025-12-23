# 🎯 Arquitectura Multi-Meta - Guía Completa

## 📋 Resumen de la Refactorización

Se ha implementado una **arquitectura multi-meta** que permite a los usuarios crear **múltiples objetivos independientes** dentro de cada área F.R.U.T.O.S., cada uno con su propia estructura ontológica completa.

---

## 🏗️ Cambios Realizados

### 1. **Base de Datos (Prisma)**

#### Nuevos Modelos

**`Meta`** - Representa un objetivo completo:
```prisma
model Meta {
  id                Int         @id @default(autoincrement())
  cartaId           Int
  carta             CartaFrutos @relation(fields: [cartaId], references: [id])
  
  categoria         String      // "FINANZAS", "SALUD", etc.
  orden             Int         // Para ordenar múltiples metas
  
  declaracionPoder  String?     // "Yo soy abundancia infinita..."
  metaPrincipal     String      // "Juntar 10k pesos"
  avance            Int         @default(0)
  
  acciones          Accion[]
}
```

**`Accion`** - Representa una acción específica dentro de una meta:
```prisma
model Accion {
  id                Int      @id @default(autoincrement())
  metaId            Int
  meta              Meta     @relation(fields: [metaId], references: [id])
  
  texto             String
  diasProgramados   String?  // JSON: ["lunes", "miércoles"]
  completada        Boolean  @default(false)
  enRevision        Boolean  @default(false)
  requiereEvidencia Boolean  @default(false)
  lastCompletedDate DateTime?
}
```

#### Migración Aplicada
- ✅ `20251212141815_add_multi_meta_architecture`

---

### 2. **API Backend**

#### Nuevo Endpoint: `/api/metas`

**GET** - Obtener todas las metas de un usuario:
```typescript
// Response:
{
  cartaId: number,
  metas: {
    "FINANZAS": [
      {
        id: 1,
        orden: 1,
        declaracionPoder: "Yo soy abundancia...",
        metaPrincipal: "Juntar 10k",
        avance: 50,
        acciones: [...]
      },
      { ... } // Meta 2, Meta 3, etc.
    ],
    "SALUD": [...],
    ...
  }
}
```

**POST** - Guardar metas de una categoría:
```typescript
{
  categoria: "FINANZAS",
  metas: [
    {
      declaracionPoder: "Yo soy...",
      metaPrincipal: "Meta 1",
      acciones: [
        { texto: "Acción 1", diasProgramados: ["lunes", "miércoles"] }
      ]
    }
  ]
}
```

**DELETE** - Eliminar una meta:
```
DELETE /api/metas?metaId=123
```

---

### 3. **Frontend**

#### Componentes Nuevos

**`app/dashboard/carta/page.tsx`** - Componente principal refactorizado:
- Lista expandible de categorías
- Manejo de múltiples metas por categoría
- Botón "+ AGREGAR NUEVA META"
- Estados de edición/lectura por categoría

**`components/carta/MetaCard.tsx`** - Card de meta individual:
- Bloque 1: Declaración de Poder (identidad ontológica)
- Bloque 2: Meta Principal (el QUÉ)
- Bloque 3: Acciones con selector de días (el CÓMO)
- Botón para agregar/eliminar acciones
- Selector inline de días (L, M, M, J, V, S, D)

**`types/metas.ts`** - Definiciones TypeScript:
```typescript
interface Accion {
  texto: string;
  diasProgramados: string[];
  completada: boolean;
  enRevision: boolean;
  requiereEvidencia: boolean;
}

interface MetaCompleta {
  orden: number;
  declaracionPoder: string;
  metaPrincipal: string;
  avance: number;
  acciones: Accion[];
}
```

---

## 🚀 Cómo Usar la Nueva Arquitectura

### Paso 1: Migrar Datos Existentes (Opcional)

Si tienes datos del sistema anterior, ejecuta:

```bash
npm run migrate:multimeta
```

Este script:
- ✅ Lee las metas antiguas de `CartaFrutos`
- ✅ Crea objetos `Meta` con sus `Accion`
- ✅ NO elimina datos legacy (seguridad)

### Paso 2: Interfaz de Usuario

1. **Accede a la Carta F.R.U.T.O.S.**
2. **Haz click en cualquier categoría** (ej: Finanzas)
3. **Modo Edición:**
   - Click en "✏️ Editar"
   - Rellena la "Declaración de Poder" (identidad)
   - Define la "Meta Principal" (objetivo medible)
   - Agrega acciones con el botón "+ Agregar otra acción"
   - Selecciona días programados para cada acción (L, M, M, J, V, S, D)
4. **Agregar más metas:**
   - Click en "+ AGREGAR NUEVA META"
   - Repite el proceso para cada meta adicional
5. **Guardar:**
   - Click en "💾 Guardar"

### Paso 3: Eliminar Metas

- En modo edición, cada meta (excepto la primera) tiene un botón "Borrar Meta"
- También puedes vaciar el contenido y al guardar se filtrará automáticamente

---

## 📊 Estructura de Datos

### Antes (Legacy)
```
CartaFrutos
├── finanzasMeta: "Juntar 10k"
├── finanzasDeclaracion: "Yo soy abundancia"
├── finanzasAvance: 50
└── Tarea[] (tabla separada)
```

### Ahora (Multi-Meta)
```
CartaFrutos
└── metas: [
      {
        categoria: "FINANZAS",
        orden: 1,
        declaracionPoder: "Yo soy abundancia",
        metaPrincipal: "Juntar 10k",
        acciones: [
          { texto: "Ahorrar 1000", diasProgramados: ["lunes"] },
          { texto: "Invertir en...", diasProgramados: ["viernes"] }
        ]
      },
      {
        categoria: "FINANZAS",
        orden: 2,
        declaracionPoder: "Yo soy estratega",
        metaPrincipal: "Crear fondo de emergencia",
        acciones: [...]
      }
    ]
```

---

## 🔄 Compatibilidad con Sistema Legacy

### Archivos Preservados

- **`app/dashboard/carta/page-legacy.tsx`** - Backup del sistema anterior
- Los campos legacy en `CartaFrutos` **NO fueron eliminados**
- Las tablas `Tarea` y `Evidencia` siguen existiendo

### Rollback (si es necesario)

```bash
# Restaurar el sistema anterior
mv app/dashboard/carta/page-legacy.tsx app/dashboard/carta/page.tsx
```

---

## 📁 Archivos Modificados/Creados

### Base de Datos
- ✅ `prisma/schema.prisma` - Nuevos modelos Meta y Accion
- ✅ `prisma/migrations/20251212141815_add_multi_meta_architecture/` - Migración aplicada
- ✅ `prisma/migrate-to-multimeta.ts` - Script de migración de datos

### Backend
- ✅ `app/api/metas/route.ts` - API REST completa

### Frontend
- ✅ `app/dashboard/carta/page.tsx` - Componente principal refactorizado
- ✅ `components/carta/MetaCard.tsx` - Componente de meta individual
- ✅ `types/metas.ts` - Tipos TypeScript
- ✅ `app/dashboard/carta/page-legacy.tsx` - Backup del sistema anterior

### Configuración
- ✅ `package.json` - Nuevo script `migrate:multimeta`

---

## 🎨 Características Visuales

### Selector de Días Inline
- **Diseño:** Botones circulares (L, M, M, J, V, S, D)
- **Estados:**
  - 🔵 Cyan con ring = Día seleccionado
  - ⚫ Gris = Día no seleccionado
- **Funcionalidad:** Click para toggle on/off

### Cards de Metas
- **Bloque Morado:** Declaración de Poder (identidad)
- **Bloque Principal:** Meta con textarea expandible
- **Bloque de Acciones:** Lista con selectores de días
- **Botón +:** Agregar nuevas acciones
- **Botón 🗑️:** Eliminar meta (si hay más de una)

---

## ⚠️ Notas Importantes

1. **Migración de Datos:**
   - El script de migración es OPCIONAL
   - Los datos legacy NO se eliminan automáticamente
   - Prueba el nuevo sistema antes de eliminar datos antiguos

2. **Validaciones:**
   - Al guardar, se filtran metas vacías
   - Las acciones sin texto se ignoran
   - Se valida que haya al menos una meta principal

3. **Progreso:**
   - El cálculo de progreso es: `(acciones completadas / total acciones) * 100`
   - Se muestra en el header de cada card

4. **Performance:**
   - Las metas se cargan bajo demanda (click en categoría)
   - El guardado es por categoría (no se guarda todo a la vez)

---

## 🐛 Troubleshooting

### "No se cargan las metas"
```bash
# Verificar que las tablas existen
npx prisma studio

# Regenerar Prisma Client
npx prisma generate
```

### "Error al guardar"
- Verificar que hay al menos una meta con texto
- Revisar consola del navegador para errores específicos
- Revisar logs del servidor

### "Quiero volver al sistema anterior"
```bash
mv app/dashboard/carta/page-legacy.tsx app/dashboard/carta/page.tsx
pkill -f "next dev" && npm run dev
```

---

## 📞 Soporte

Para reportar bugs o sugerir mejoras, contacta al equipo de desarrollo.

---

## ✅ Checklist de Implementación

- [x] Schema de Prisma actualizado
- [x] Migración de base de datos aplicada
- [x] API `/api/metas` creada (GET, POST, DELETE)
- [x] Tipos TypeScript definidos
- [x] Componente `MetaCard` creado
- [x] Página principal refactorizada
- [x] Selector de días implementado
- [x] Script de migración de datos creado
- [x] Backup del sistema legacy guardado
- [x] Documentación completa

---

**🎉 La arquitectura multi-meta está lista para usar!**
