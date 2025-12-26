# Integración Quantum IA → Carta F.R.U.T.O.S.

## 📋 Resumen

Se implementó un sistema completo de integración entre **Quantum IA** (mentor-ia) y el **Wizard de Carta F.R.U.T.O.S.**, permitiendo que los usuarios:

1. Conversen con Quantum sobre sus objetivos de vida
2. Quantum extraiga automáticamente la información estructurada
3. El Wizard se prellene con la información extraída
4. El usuario pueda revisar, editar y confirmar antes de guardar

---

## 🎯 Flujo de Usuario

```
┌─────────────────────┐
│  Usuario inicia     │
│  conversación con   │
│  Quantum IA         │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Quantum guía al    │
│  usuario a través   │
│  de las 8 áreas     │
│  (Finanzas, etc.)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Aparece botón:     │
│  "Crear Carta"      │
│  (después de 3+     │
│   intercambios)     │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Usuario hace clic  │
│  en "Crear Carta"   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  API extrae:        │
│  - Declaraciones    │
│  - Objetivos        │
│  - Acciones         │
│  - Frecuencias      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Datos guardados en │
│  localStorage como  │
│  'quantum-carta-    │
│   draft'            │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Redirección a      │
│  /carta/wizard-v2   │
│  ?from=quantum      │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Wizard detecta     │
│  draft de Quantum y │
│  prellena 4 pasos   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│  Usuario revisa,    │
│  edita y confirma   │
└─────────────────────┘
```

---

## 🔧 Componentes Implementados

### 1. API de Extracción
**Archivo:** `/app/api/quantum/extract-carta/route.ts`

**Funcionalidad:**
- Recibe la conversación completa entre usuario y Quantum
- Obtiene las áreas asignadas al usuario desde su Vision
- Usa GPT-4 para extraer información estructurada
- Valida y limpia los datos extraídos
- Retorna JSON con formato específico para el wizard

**Estructura de Respuesta:**
```json
{
  "success": true,
  "cartaData": {
    "finanzas": {
      "declaracion": "Yo soy abundancia en crecimiento constante",
      "objetivo": "Generar 5000 USD en 3 meses",
      "acciones": [
        {
          "nombre": "Enviar 10 propuestas comerciales",
          "frecuencia": "Diaria",
          "dias": []
        }
      ]
    },
    "relaciones": { ... },
    ...
  },
  "areasDisponibles": ["Finanzas", "Relaciones", ...]
}
```

**Validaciones:**
- Solo extrae áreas que el usuario tiene asignadas en su Vision
- Limita declaraciones a 200 caracteres
- Valida frecuencias: "Diaria", "Lun-Vie", "Personalizada"
- Filtra días válidos para frecuencia personalizada

---

### 2. Página Quantum IA (Actualizada)
**Archivo:** `/app/dashboard/mentor-ia/page.tsx`

**Nuevas Funcionalidades:**

#### a) Botón "Crear Carta"
- Aparece después de 6+ mensajes (3 intercambios)
- Diseño con gradiente emerald/teal
- Icono de documento (FileText)

```tsx
{mostrarBotonCarta && !extrayendoCarta && !estadoGuardado && (
  <div className="mb-3 bg-gradient-to-r from-emerald-900/30 to-teal-900/30">
    <button onClick={handleExtractCarta}>
      <FileText /> Crear Carta
    </button>
  </div>
)}
```

#### b) Función `handleExtractCarta()`
1. Llama a `/api/quantum/extract-carta` con el historial
2. Guarda respuesta en `localStorage` como `quantum-carta-draft`
3. Redirige al wizard con query param `?from=quantum`

#### c) Mensaje de Bienvenida Mejorado
- Explica las capacidades de Quantum
- Lista los 4 beneficios principales
- Incluye tip sobre el botón de crear carta

---

### 3. Wizard de Carta (Actualizado)
**Archivo:** `/components/dashboard/CartaWizardRelacional.tsx`

**Nueva Función:** `loadQuantumDraft()`

Se ejecuta en el `useEffect` inicial junto con `loadCarta()`.

**Proceso:**
1. Lee `localStorage.getItem('quantum-carta-draft')`
2. Mapea áreas de Quantum a áreas del wizard:
   ```typescript
   const areaMapping = {
     finanzas: 'finanzas',
     relaciones: 'relaciones',
     talentos: 'talentos',
     salud: 'salud',
     pazMental: 'pazMental',
     ocio: 'ocio',
     transformacion: 'servicioTrans',
     comunidad: 'servicioComun'
   };
   ```

3. Prellena los 4 pasos del wizard:
   - **Paso 1:** Declaraciones del Ser (`setDeclaracionesSer`)
   - **Paso 2:** Objetivos (`setIdentidadesPorArea`)
   - **Paso 3:** Acciones/Metas (`setMetasPorArea`)
   - **Paso 4:** Configuración de frecuencias (`setMetasConfiguradas`)

4. Convierte frecuencias de Quantum a formato wizard:
   ```typescript
   'Diaria' → 'DIARIA'
   'Lun-Vie' → 'LUN_VIE'
   'Personalizada' → 'PERSONALIZADA' + días específicos
   ```

5. Convierte días de texto a números:
   ```typescript
   'Lunes' → '1'
   'Martes' → '2'
   ...
   'Domingo' → '0'
   ```

6. Muestra toast de éxito
7. Limpia el draft de localStorage

---

## 📊 Estructura de Datos

### Draft de Quantum (localStorage)
```typescript
{
  finanzas: {
    declaracion: string | null,
    objetivo: string | null,
    acciones: [
      {
        nombre: string,
        frecuencia: 'Diaria' | 'Lun-Vie' | 'Personalizada',
        dias: string[] // ['Lunes', 'Miércoles']
      }
    ]
  },
  relaciones: { ... },
  talentos: { ... },
  salud: { ... },
  pazMental: { ... },
  ocio: { ... },
  transformacion: { ... },
  comunidad: { ... }
}
```

### Estados del Wizard
```typescript
// Paso 1: Declaraciones del Ser
declaracionesSer: Record<string, string>

// Paso 2: Objetivos (Identidades)
identidadesPorArea: Record<string, Meta[]>
// Meta = { id: string, description: string, isValid: boolean }

// Paso 3: Acciones
metasPorArea: Record<string, Meta[]>

// Paso 4: Configuración
metasConfiguradas: MetaConfig[]
// MetaConfig = { metaId, areaKey, description, config: { frecuencia, diasSeleccionados } }
```

---

## 🎨 UI/UX Implementada

### 1. Pantalla de Bienvenida
- Card con gradiente purple/blue
- 4 bullets con iconos check (✓)
- Tip box con fondo azul
- Llamado a la acción claro

### 2. Botón "Crear Carta"
- Aparece como banner horizontal
- Gradiente emerald/teal
- Icono de documento
- Texto descriptivo: "¿Listo para formalizar tus objetivos?"

### 3. Estados de Carga
- "🔍 Analizando conversación y extrayendo información..."
- "✅ Información extraída. Redirigiendo al Wizard..."
- "❌ Error al extraer información. Intenta de nuevo."

### 4. Toast en Wizard
- "✨ Información de Quantum cargada exitosamente"
- Se muestra 3 segundos
- Auto-desaparece

---

## 🔐 Seguridad y Validaciones

### API `/api/quantum/extract-carta`
✅ Requiere sesión autenticada  
✅ Verifica que el usuario exista  
✅ Obtiene áreas asignadas desde Vision  
✅ Solo extrae áreas permitidas  
✅ Limita longitud de textos (200 chars declaración, 150 chars acción)  
✅ Valida frecuencias permitidas  
✅ Filtra días válidos  

### Wizard
✅ Mapeo seguro de áreas  
✅ Validación de estructura de datos  
✅ Try-catch para parseo JSON  
✅ Limpieza automática del draft después de usar  
✅ No sobrescribe datos existentes si hay un draft en curso  

---

## 🧪 Casos de Uso

### Caso 1: Usuario Nuevo
1. Entra a `/dashboard/mentor-ia`
2. Ve mensaje de bienvenida
3. Conversa con Quantum sobre finanzas
4. Quantum le pregunta sobre relaciones
5. Después de 3 intercambios, aparece botón
6. Click en "Crear Carta"
7. Wizard se prellena con 2 áreas conversadas
8. Usuario completa las demás áreas manualmente

### Caso 2: Usuario con Áreas Restringidas
1. Usuario tiene Vision con solo 4 áreas activas
2. Quantum SOLO extrae esas 4 áreas
3. Wizard SOLO muestra esas 4 áreas
4. No hay opción de agregar áreas no permitidas

### Caso 3: Usuario que Ya Tiene Carta
1. Conversa con Quantum para replantear objetivos
2. Click en "Crear Carta"
3. Wizard carga datos de Quantum
4. Puede comparar con carta existente
5. Decide si sobrescribir o ajustar

---

## 📝 Prompt de Extracción (GPT-4)

El sistema usa un prompt especializado que:

1. **Identifica áreas disponibles** del usuario
2. **Extrae información estructurada** en 3 niveles:
   - Declaración del Ser (ontológica)
   - Objetivo específico y medible
   - Acciones concretas con frecuencia
3. **Valida longitudes** de texto
4. **Formatea respuesta** como JSON puro (sin markdown)
5. **Maneja casos sin información** (retorna null/array vacío)

---

## 🚀 Próximas Mejoras Sugeridas

### Corto Plazo
- [ ] Agregar preview de datos extraídos antes de redirigir
- [ ] Permitir editar en el mismo modal de Quantum
- [ ] Agregar botón "Volver a Quantum" desde el wizard
- [ ] Guardar timestamp de última extracción

### Mediano Plazo
- [ ] Análisis de sentimiento para mejorar extracción
- [ ] Sugerencias de acciones basadas en patrones
- [ ] Integración con calendario para frecuencias
- [ ] Notificaciones push cuando se complete extracción

### Largo Plazo
- [ ] Quantum puede hacer seguimiento de la carta
- [ ] Recordatorios automáticos de acciones
- [ ] Dashboard de progreso en tiempo real
- [ ] Comparación de versiones de carta

---

## 🐛 Troubleshooting

### Problema: Wizard no carga datos de Quantum
**Solución:**
1. Verificar que `localStorage` contenga `quantum-carta-draft`
2. Revisar consola del navegador para errores de parseo
3. Validar estructura del JSON guardado

### Problema: Áreas no coinciden
**Solución:**
1. Verificar mapeo de áreas en `loadQuantumDraft()`
2. Asegurar que Vision tenga áreas correctas
3. Revisar respuesta de `/api/quantum/extract-carta`

### Problema: Frecuencias no se guardan
**Solución:**
1. Verificar conversión de días en `loadQuantumDraft()`
2. Validar que el formato sea `'DIARIA'`, `'LUN_VIE'` o `'PERSONALIZADA'`
3. Revisar que días sean array de strings numéricos

---

## 📚 Referencias

- **Ontología del Lenguaje:** Base filosófica de Quantum IA
- **Carta F.R.U.T.O.S.:** Sistema de 8 áreas de vida
- **Vision System:** Control de áreas permitidas por usuario
- **Wizard Relacional:** Sistema de múltiples objetivos por área

---

## ✅ Checklist de Implementación

- [x] API `/api/quantum/extract-carta` creada
- [x] Integración con Vision para áreas permitidas
- [x] Validación y limpieza de datos extraídos
- [x] Botón "Crear Carta" en página de Quantum
- [x] Función `handleExtractCarta()` implementada
- [x] Sistema de estados de carga (extracting, success, error)
- [x] Mensaje de bienvenida mejorado en Quantum
- [x] Función `loadQuantumDraft()` en wizard
- [x] Mapeo de áreas Quantum → Wizard
- [x] Conversión de frecuencias y días
- [x] Toast de confirmación
- [x] Limpieza automática de draft
- [x] Manejo de errores en todos los puntos
- [x] Documentación completa

---

## 🎓 Notas Técnicas

### LocalStorage Keys
- `quantum-carta-draft`: Draft temporal de extracción
- `carta-wizard-draft-{email}`: Draft del wizard por usuario

### Query Params
- `?from=quantum`: Indica que viene desde Quantum (futuro uso)

### Tecnologías
- **OpenAI GPT-4o-mini**: Extracción estructurada
- **Next.js App Router**: Rutas y APIs
- **Prisma**: Acceso a BD (Vision, Usuario)
- **React Hooks**: Estado y ciclo de vida
- **LocalStorage**: Persistencia temporal
- **TypeScript**: Tipado fuerte

---

## 👥 Autores
- Implementación: GitHub Copilot
- Fecha: 26 de diciembre de 2025
- Versión: 1.0.0

---

**¿Dudas o problemas?**
Revisar logs en consola del navegador y servidor Next.js.
