# Flujo Quantum → Wizard → Revisión

## 🎯 Objetivo
Permitir que el usuario **revise y edite** los datos extraídos por Quantum IA antes de enviarlos a autorización del mentor.

## 📋 Problema Original
Antes, cuando el usuario conversaba con Quantum Coach en `/dashboard/mentor-ia`, los datos se guardaban **directamente en la base de datos** sin darle oportunidad de revisarlos o editarlos.

```
❌ FLUJO ANTERIOR:
Usuario → Quantum IA → Extracción → Guardado en BD → /dashboard/carta
```

## ✅ Nuevo Flujo
Ahora los datos pasan por el wizard para que el usuario pueda revisar, editar y confirmar antes de enviar:

```
✅ FLUJO NUEVO:
Usuario → Quantum IA → Extracción → localStorage → Wizard → Revisión → Guardado en BD → Autorización
```

---

## 🔧 Cambios Técnicos

### 1. **Mentor-IA Page** (`/app/dashboard/mentor-ia/page.tsx`)

**Líneas modificadas: 191-210**

#### Antes:
```typescript
// Guardaba directamente en BD
const saveResponse = await fetch('/api/carta/save-extracted', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(extractData),
});

if (saveResponse.ok) {
  window.location.href = '/dashboard/carta';
}
```

#### Ahora:
```typescript
// Guarda en localStorage temporal
localStorage.setItem('quantum_draft_data', JSON.stringify({
  cartaData: extractData.cartaData,
  areasDisponibles: extractData.areasDisponibles,
  timestamp: new Date().toISOString(),
  source: 'quantum'
}));

// Redirige al wizard para revisión
setTimeout(() => {
  window.location.href = '/dashboard/carta/wizard-v2';
}, 1500);
```

**Beneficios:**
- ✅ No se guarda en BD hasta que el usuario confirme
- ✅ El usuario puede editar cualquier campo
- ✅ Más control y transparencia

---

### 2. **Wizard Relacional** (`/components/dashboard/CartaWizardRelacional.tsx`)

#### A. Función `loadQuantumDraft()` actualizada

**Cambios:**
- Lee desde `localStorage.getItem('quantum_draft_data')` (nuevo key)
- Carga el objeto `{ cartaData, areasDisponibles, timestamp, source }`
- Pre-llena los 4 pasos del wizard con los datos extraídos

**Estructura de datos cargados:**

```typescript
// PASO 1: Declaraciones del Ser
declaracionesSer[areaKey] = data.declaracion;

// PASO 2: Objetivos (Identidades)
identidadesPorArea[areaKey] = [{
  id: `${areaKey}-obj-1`,
  description: data.objetivo,
  isValid: true
}];

// PASO 3: Acciones (Metas)
metasPorArea[areaKey] = data.acciones.map((accion, idx) => ({
  id: `${areaKey}-meta-${idx + 1}`,
  description: accion.nombre,
  isValid: true
}));

// PASO 4: Configuración de Frecuencia
metasConfiguradas.push({
  metaId: `${areaKey}-meta-${idx + 1}`,
  areaKey,
  description: accion.nombre,
  config: {
    frecuencia: convertedFrecuencia,
    diasSeleccionados: convertedDays
  }
});
```

**Conversión de frecuencias:**
```typescript
'Diaria' → 'DIARIA' (todos los días)
'Lun-Vie' → 'LUN_VIE' (días laborables)
'Personalizada' + días → 'PERSONALIZADA' + array de días numéricos
```

#### B. Indicador Visual Agregado

**Ubicación:** Header del wizard (líneas 1082-1092)

```typescript
{/* Alerta de datos desde Quantum */}
{!isReadOnly && typeof window !== 'undefined' && localStorage.getItem('quantum_draft_data') && (
  <div className="mb-4 bg-amber-900/30 border border-amber-500/50 rounded-xl p-4 flex items-center gap-3">
    <Brain className="text-amber-400" size={24} />
    <div>
      <h3 className="text-amber-400 font-bold text-sm">🤖 Datos desde Quantum IA</h3>
      <p className="text-amber-300/80 text-xs">Revisa y edita la información antes de enviar a tu mentor.</p>
    </div>
  </div>
)}
```

**Características:**
- 🟠 Tema amber/naranja (diferente del verde de "aprobada")
- 🧠 Ícono Brain para indicar origen IA
- 📝 Mensaje claro: "Revisa y edita"
- ✅ Solo aparece si hay datos de Quantum y no está en readonly

#### C. Limpieza después de envío

**Ubicación:** Función `handleSubmit()` (líneas 1010-1013)

```typescript
if (submitRes.ok) {
  // ... otros códigos ...
  
  // Limpiar datos de Quantum si venían desde allí
  localStorage.removeItem('quantum_draft_data');
  console.log('🧹 Datos de Quantum limpiados después de envío exitoso');
  
  // ... redirección ...
}
```

**Por qué es importante:**
- Evita que datos antiguos se carguen en futuras sesiones
- Mantiene el localStorage limpio
- Solo se limpia después de un envío **exitoso**

---

## 🎯 Experiencia del Usuario

### Paso a Paso

1. **Usuario habla con Quantum Coach**
   ```
   Usuario: "Quiero mejorar mis finanzas, ejercitar más y leer un libro por mes"
   Quantum: "Excelente, te ayudo a estructurar eso..."
   ```

2. **Quantum extrae y estructura**
   ```json
   {
     "finanzas": {
       "declaracion": "Yo soy abundancia en crecimiento constante",
       "objetivo": "Aumentar mis ingresos un 30%",
       "acciones": [
         { "nombre": "Revisar gastos diarios", "frecuencia": "Diaria" },
         { "nombre": "Buscar oportunidad de ingresos extra", "frecuencia": "Lun-Vie" }
       ]
     },
     "salud": {
       "declaracion": "Yo soy energía vital en movimiento",
       "objetivo": "Mantener rutina de ejercicio consistente",
       "acciones": [
         { "nombre": "Hacer 30 min de ejercicio", "frecuencia": "Lun-Vie" }
       ]
     }
   }
   ```

3. **Datos se guardan en localStorage (NO en BD)**
   ```javascript
   localStorage.setItem('quantum_draft_data', JSON.stringify({
     cartaData: extractedData,
     timestamp: "2024-01-15T10:30:00.000Z",
     source: 'quantum'
   }));
   ```

4. **Redirección automática al wizard**
   ```
   Mensaje: "✅ Datos capturados! Redirigiendo al wizard para revisión..."
   → window.location.href = '/dashboard/carta/wizard-v2'
   ```

5. **Usuario ve el wizard pre-llenado**
   - Banner amber aparece: "🤖 Datos desde Quantum IA - Revisa y edita..."
   - Paso 1: Declaraciones del ser ya escritas
   - Paso 2: Objetivos ya definidos
   - Paso 3: Acciones ya listadas
   - Paso 4: Frecuencias ya configuradas

6. **Usuario puede editar cualquier cosa**
   - Cambiar declaraciones
   - Agregar/eliminar acciones
   - Modificar frecuencias
   - Usar el botón Quantum nuevamente para sugerencias

7. **Usuario envía cuando está listo**
   - Click en "Enviar a Revisión"
   - Sistema guarda TODO en base de datos
   - localStorage se limpia automáticamente
   - Redirección a `/dashboard/carta/resumen`

---

## 🔍 Validaciones

### ¿Qué pasa si...?

#### El usuario cierra el navegador en el paso 3
- ✅ Los datos permanecen en localStorage
- ✅ Al reabrir el wizard, se recargan automáticamente
- ✅ No pierde su progreso

#### El usuario crea una carta sin Quantum
- ✅ El wizard funciona normalmente
- ✅ No aparece el banner amber
- ✅ Carga datos desde BD si existen

#### El usuario edita y luego no envía
- ⚠️ Los cambios quedan en localStorage
- ⚠️ NO se guardan en BD hasta que haga submit
- ✅ Puede recargar desde BD usando el botón "Limpiar Borrador"

#### Error en el envío (500, red caída, etc.)
- ✅ Los datos NO se limpian de localStorage
- ✅ Usuario puede intentar nuevamente
- ✅ No pierde su trabajo

---

## 🧪 Testing

### Casos de Prueba

#### Test 1: Flujo completo Quantum → Wizard → Submit
```bash
1. Ir a /dashboard/mentor-ia
2. Pegar prompt de prueba
3. Esperar extracción
4. Verificar redirección a wizard
5. Confirmar banner amber visible
6. Revisar que todos los campos estén prellenados
7. Editar una acción
8. Submit
9. Verificar que localStorage se limpió
10. Verificar datos en /dashboard/carta/resumen
```

#### Test 2: Edición después de Quantum
```bash
1. Cargar datos desde Quantum
2. En Paso 3: Agregar una acción manual
3. En Paso 4: Cambiar frecuencia de una acción
4. Submit
5. Verificar que TODOS los cambios se guardaron
```

#### Test 3: Persistencia de localStorage
```bash
1. Cargar datos desde Quantum
2. Editar algunos campos
3. Cerrar navegador (sin submit)
4. Reabrir /dashboard/carta/wizard-v2
5. Verificar que los cambios persisten
```

#### Test 4: Limpieza manual
```bash
1. Cargar datos desde Quantum
2. Click en "Limpiar Borrador"
3. Confirmar diálogo
4. Verificar que localStorage está vacío
5. Recargar página
6. Verificar que carga datos desde BD (si existen)
```

---

## 📊 Métricas de Éxito

- ✅ Usuario puede revisar datos antes de guardar
- ✅ Tasa de abandono disminuye (datos persisten en localStorage)
- ✅ Usuario tiene más control sobre su carta
- ✅ Transparencia en el proceso de extracción

---

## 🚀 Beneficios

### Para el Usuario
- 🎯 **Control total**: Puede editar cualquier campo antes de enviar
- 🔄 **Sin pérdida de datos**: localStorage mantiene el progreso
- 👀 **Transparencia**: Ve exactamente qué extrajo la IA
- ✏️ **Flexibilidad**: Puede mezclar datos de Quantum con edición manual

### Para el Sistema
- 🛡️ **Menos errores**: Usuario valida antes de guardar en BD
- 📦 **BD más limpia**: Solo se guarda lo que el usuario confirma
- 🔧 **Debugging más fácil**: localStorage puede inspeccionarse en DevTools
- 📈 **Mejor UX**: Flujo más predecible y controlado

---

## 🔮 Posibles Mejoras Futuras

1. **Mostrar diff de cambios**
   - Resaltar campos que el usuario editó vs. lo que Quantum sugirió

2. **Historial de versiones**
   - Guardar snapshots en localStorage con timestamps
   - Permitir "deshacer" cambios

3. **Auto-save temporal**
   - Guardar cada N segundos en localStorage
   - Protección contra cierre accidental

4. **Comparación con BD**
   - Si existe carta previa, mostrar diff antes de sobrescribir

5. **Feedback de IA**
   - Quantum puede comentar sobre las ediciones del usuario
   - "Veo que agregaste ejercicio adicional, ¡excelente!"

---

## 📝 Notas Técnicas

### LocalStorage Keys
- `quantum_draft_data`: Datos extraídos por Quantum IA (temporal)
- `carta-wizard-draft-{email}`: Borrador del wizard (persistente)

### Limpieza Automática
- Se limpia solo después de `submitRes.ok`
- Se mantiene si hay error de red o validación

### Compatibilidad
- ✅ Chrome/Edge/Safari: Completamente funcional
- ✅ Firefox: Completamente funcional
- ⚠️ Incógnito: Funciona pero se pierde al cerrar pestaña
- ⚠️ localStorage bloqueado: Fallback a solo memoria (sin persistencia)

### Estructura de Datos
```typescript
interface QuantumDraftData {
  cartaData: {
    [areaKey: string]: {
      declaracion?: string;
      objetivo?: string;
      acciones?: Array<{
        nombre: string;
        frecuencia: string;
        dias?: string[];
      }>;
    };
  };
  areasDisponibles: string[];
  timestamp: string;
  source: 'quantum';
}
```

---

## ✅ Checklist de Implementación

- [x] Modificar mentor-ia page para NO guardar en BD
- [x] Guardar en localStorage con key `quantum_draft_data`
- [x] Actualizar `loadQuantumDraft()` en wizard
- [x] Agregar banner visual de alerta amber
- [x] Limpiar localStorage después de submit exitoso
- [x] Convertir frecuencias de Quantum a formato wizard
- [x] Documentar flujo completo

---

**Fecha de implementación:** 2024-01-15  
**Archivos modificados:** 2  
**Líneas cambiadas:** ~150  
**Estado:** ✅ Completado y listo para testing
