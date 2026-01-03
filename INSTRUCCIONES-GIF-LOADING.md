# Instrucciones para añadir el GIF de carga

## Paso 1: Guardar el GIF

1. **Descarga el GIF** de la imagen que compartiste (los hexágonos azules/morados animados)
2. **Guárdalo** en la carpeta `public` de tu proyecto con el nombre: `loading-quantum.gif`
3. La ruta completa debe ser: `/Users/aldokmps/plataforma-frutos-FINAL/public/loading-quantum.gif`

## Paso 2: Verificar la implementación

El componente `LoadingSpinner` ya está creado y se ha implementado en las siguientes pantallas:

- ✅ **Carta de Frutos** (`components/dashboard/CartaWizardRelacional.tsx`)
- ✅ **Detalle de Visión** (`app/dashboard/school-admin/visiones/[id]/page.tsx`)
- ✅ **Registro** (`app/registro/[id]/page.tsx`)
- ✅ **Bóveda de Evidencias** (`app/dashboard/vault/page.tsx`)
- ✅ **Bóveda de Avatares** (`app/dashboard/vault/page.tsx`)
- ✅ **Lista de Líderes** (`app/dashboard/school-admin/lideres/page.tsx`)

## Paso 3: Personalización (Opcional)

El componente acepta los siguientes props:

```tsx
<LoadingSpinner 
  message="Tu mensaje personalizado"  // Texto opcional
  size="sm" | "md" | "lg"            // Tamaño del gif
  className="clases-adicionales"      // Clases CSS extras
/>
```

### Tamaños disponibles:
- `sm`: 24x24 (96px)
- `md`: 32x32 (128px) - Por defecto
- `lg`: 48x48 (192px)

## Ubicación del componente

El componente reutilizable se encuentra en:
`/components/ui/LoadingSpinner.tsx`

## Ejemplo de uso en nuevas páginas:

```tsx
import LoadingSpinner from '@/components/ui/LoadingSpinner';

// En tu componente:
{loading && (
  <div className="flex items-center justify-center min-h-screen">
    <LoadingSpinner message="Cargando datos..." size="lg" />
  </div>
)}
```

---

Una vez que guardes el GIF en la ubicación correcta, todas las pantallas de carga mostrarán automáticamente tu animación personalizada. 🎉
