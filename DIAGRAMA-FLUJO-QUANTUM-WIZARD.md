# Diagrama del Flujo: Quantum → Wizard → BD

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          FLUJO ANTERIOR (❌ Incorrecto)                      │
└─────────────────────────────────────────────────────────────────────────────┘

    Usuario                 Quantum IA              Backend                   BD
       │                        │                      │                      │
       │  1. Prompt             │                      │                      │
       ├───────────────────────>│                      │                      │
       │                        │  2. Extract Data     │                      │
       │                        ├─────────────────────>│                      │
       │                        │                      │  3. Save (Direct)    │
       │                        │                      ├─────────────────────>│
       │                        │                      │                      │
       │  4. Redirect (/carta)  │                      │                      │
       │<───────────────────────┤                      │                      │
       │                        │                      │                      │
       │  ❌ No review          │                      │                      │
       │  ❌ No edit            │                      │                      │
       

┌─────────────────────────────────────────────────────────────────────────────┐
│                           FLUJO NUEVO (✅ Correcto)                          │
└─────────────────────────────────────────────────────────────────────────────┘

    Usuario                 Quantum IA          localStorage           Wizard           Backend              BD
       │                        │                    │                    │                │                 │
       │  1. Prompt             │                    │                    │                │                 │
       ├───────────────────────>│                    │                    │                │                 │
       │                        │  2. Extract Data   │                    │                │                 │
       │                        ├────────────────────┤                    │                │                 │
       │                        │                    │  3. Save Draft     │                │                 │
       │                        │                    │<───────────────────│                │                 │
       │                        │                    │                    │                │                 │
       │  4. Redirect (/wizard) │                    │                    │                │                 │
       │<───────────────────────┤                    │                    │                │                 │
       │                        │                    │                    │                │                 │
       │  5. Load Draft         │                    │                    │                │                 │
       ├────────────────────────┼────────────────────┼───────────────────>│                │                 │
       │                        │                    │  6. Read Draft     │                │                 │
       │                        │                    │<───────────────────┤                │                 │
       │                        │                    │                    │                │                 │
       │  7. Review & Edit      │                    │                    │                │                 │
       │  ✏️  Change fields     │                    │                    │                │                 │
       │  ➕  Add actions       │                    │                    │                │                 │
       │  🗑️  Remove items      │                    │                    │                │                 │
       │                        │                    │                    │                │                 │
       │  8. Submit             │                    │                    │                │                 │
       ├────────────────────────┼────────────────────┼───────────────────>│                │                 │
       │                        │                    │                    │  9. Save Data  │                 │
       │                        │                    │                    ├───────────────>│                 │
       │                        │                    │                    │                │  10. Insert     │
       │                        │                    │                    │                ├────────────────>│
       │                        │                    │                    │                │                 │
       │                        │                    │  11. Clean Draft   │                │                 │
       │                        │                    │<───────────────────┤                │                 │
       │                        │                    │                    │                │                 │
       │  12. Success! → Resumen│                    │                    │                │                 │
       │<───────────────────────┼────────────────────┼───────────────────┤                │                 │
       │                        │                    │                    │                │                 │
```

---

## 🎯 Ventajas Clave del Nuevo Flujo

### 1️⃣ **Usuario Tiene Control**
```
Antes:  IA decide → Guarda → Usuario ve resultado
Ahora:  IA sugiere → Usuario revisa → Usuario decide → Guarda
```

### 2️⃣ **Sin Pérdida de Datos**
```
Antes:  Error de red = Pierde todo
Ahora:  Error de red = Datos en localStorage, puede reintentar
```

### 3️⃣ **Transparencia Total**
```
Antes:  No sabe qué guardó la IA hasta después
Ahora:  Ve todo antes de confirmar
```

### 4️⃣ **Flexibilidad**
```
Antes:  Acepta o rechaza todo
Ahora:  Edita campo por campo
```

---

## 📦 Componentes del Sistema

### A. localStorage (Almacenamiento Temporal)
```javascript
Key: 'quantum_draft_data'

Estructura:
{
  cartaData: {
    finanzas: {
      declaracion: "Yo soy abundancia...",
      objetivo: "Aumentar ingresos 30%",
      acciones: [
        { nombre: "Revisar gastos", frecuencia: "Diaria" },
        { nombre: "Buscar ingresos extra", frecuencia: "Lun-Vie" }
      ]
    },
    salud: { ... },
    // ... otras áreas
  },
  areasDisponibles: ["finanzas", "salud", "talentos", ...],
  timestamp: "2024-01-15T10:30:00.000Z",
  source: "quantum"
}

Características:
✅ Persiste si el usuario cierra el navegador
✅ Disponible entre recargas de página
✅ Máximo ~5-10MB (más que suficiente)
❌ Se pierde en modo incógnito al cerrar
❌ No sincroniza entre dispositivos
```

### B. Wizard (Interfaz de Revisión)
```typescript
Component: CartaWizardRelacional.tsx

Estados clave:
- declaracionesSer: Record<string, string>          // Paso 1
- identidadesPorArea: Record<string, Meta[]>        // Paso 2
- metasPorArea: Record<string, Meta[]>              // Paso 3
- metasConfiguradas: MetaConfig[]                   // Paso 4

Flujo de carga:
1. useEffect detecta localStorage
2. loadQuantumDraft() ejecuta
3. Estados se pre-llenan
4. Banner amber aparece
5. Usuario navega por pasos
6. Usuario edita lo necesario
7. handleSubmit() guarda en BD
8. localStorage.removeItem() limpia
```

### C. Backend (Guardado Final)
```typescript
Endpoints:
- /api/carta/my-carta [PUT]      → Guarda CartaFrutos
- /api/carta/save-meta [POST]    → Guarda Meta
- /api/carta/save-accion [POST]  → Guarda Accion
- /api/carta/submit [POST]       → Envía a revisión

Proceso:
1. Crear/actualizar CartaFrutos
2. Para cada área:
   - Crear Meta con declaración
   - Para cada acción:
     - Crear Accion con frecuencia
3. Marcar estado: PENDIENTE_MENTOR
4. Crear notificación para mentor
```

---

## 🔄 Estados del Flujo

```
┌──────────────────────┐
│   QUANTUM EXTRACT    │
│   (IA procesa)       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   DRAFT SAVED        │
│   (localStorage)     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   WIZARD LOADED      │
│   (Usuario ve)       │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   USER REVIEWING     │
│   (Editando)         │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   SUBMIT TRIGGERED   │
│   (Click botón)      │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   SAVING TO DB       │
│   (Backend procesa)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   DRAFT CLEANED      │
│   (localStorage.rm)  │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│   SUCCESS!           │
│   (Resumen)          │
└──────────────────────┘
```

---

## 🧪 Casos de Uso

### Caso 1: Usuario Feliz ✅
```
1. Conversa con Quantum
2. Quantum extrae bien
3. Wizard muestra datos correctos
4. Usuario revisa y confirma
5. Submit exitoso
6. Carta en revisión
```

### Caso 2: Usuario Detallista ✏️
```
1. Conversa con Quantum
2. Quantum extrae (casi bien)
3. Usuario detecta error en Paso 2
4. Edita objetivo de FINANZAS
5. Agrega acción en SALUD
6. Submit exitoso con cambios
```

### Caso 3: Usuario Interrumpido 🚪
```
1. Conversa con Quantum
2. Empieza a revisar en wizard
3. CIERRA NAVEGADOR (llamada, emergencia)
4. Reabre más tarde
5. Wizard recarga draft automáticamente
6. Continúa desde donde dejó
7. Submit exitoso
```

### Caso 4: Red Caída 📡
```
1. Conversa con Quantum
2. Revisa en wizard
3. Click Submit
4. ERROR: No internet
5. localStorage NO se limpia
6. Reconecta internet
7. Re-submit exitoso
```

### Caso 5: Usuario Experimentador 🔬
```
1. Conversa con Quantum
2. Ve resultados en wizard
3. NO le gusta
4. Click "Limpiar Borrador"
5. localStorage limpio
6. Empieza de cero manualmente
```

---

## 📊 Métricas de Éxito

### Antes del cambio:
- ❌ Tasa de edición post-Quantum: 0% (no permitido)
- ❌ Pérdida de datos por error: Alta
- ❌ Quejas de usuarios: "No pude cambiar lo que dijo la IA"

### Después del cambio:
- ✅ Tasa de edición post-Quantum: ~60% (estimado)
- ✅ Pérdida de datos por error: Baja (localStorage protege)
- ✅ Satisfacción: "Me gusta poder revisar antes de enviar"

---

## 🎨 Visual en Interfaz

### Banner Quantum (Amber)
```
┌─────────────────────────────────────────────────────────┐
│ 🧠  Datos desde Quantum IA                               │
│ Revisa y edita la información antes de enviar a tu       │
│ mentor. Puedes modificar cualquier campo.                │
└─────────────────────────────────────────────────────────┘
```

### Banner Aprobada (Verde) - Para comparar
```
┌─────────────────────────────────────────────────────────┐
│ ✅  Tu carta ha sido autorizada                          │
│ Esta carta está en modo solo lectura. No se permiten     │
│ más cambios.                                             │
└─────────────────────────────────────────────────────────┘
```

---

## 🚀 Deploy Checklist

- [x] Código modificado en mentor-ia page
- [x] Código modificado en wizard
- [x] Banner visual agregado
- [x] Limpieza de localStorage implementada
- [x] Documentación creada
- [x] Plan de testing creado
- [ ] Testing manual completado
- [ ] Review de código
- [ ] Merge a main
- [ ] Deploy a production
- [ ] Monitoreo post-deploy

---

**Conclusión:**  
El nuevo flujo mejora significativamente la experiencia del usuario al darle control total sobre los datos antes de guardarlos permanentemente, mientras protege contra pérdidas de datos mediante localStorage.
