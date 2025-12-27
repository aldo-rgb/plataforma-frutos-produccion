# Test Plan: Flujo Quantum → Wizard → Revisión

## 🎯 Objetivo del Testing
Validar que los datos extraídos por Quantum IA pasan por el wizard para revisión del usuario antes de guardarse en la base de datos.

---

## ✅ Pre-requisitos

- Usuario con sesión activa
- Acceso a `/dashboard/mentor-ia`
- Acceso a `/dashboard/carta/wizard-v2`
- DevTools abierto (Console + Application tabs)

---

## 📋 Test Cases

### Test 1: Flujo Completo Exitoso
**Objetivo:** Verificar que el flujo completo funciona de principio a fin

**Pasos:**
1. Navegar a `/dashboard/mentor-ia`
2. Pegar el siguiente prompt de prueba:
   ```
   Quiero ser más saludable y productivo.
   
   En salud:
   - Declaro: Yo soy energía vital en movimiento constante
   - Mi objetivo: Mantener rutina de ejercicio consistente
   - Acciones:
     * Hacer 30 minutos de cardio (Lun-Vie)
     * Meditar 10 minutos (Diaria)
   
   En talentos:
   - Declaro: Yo soy creatividad que transforma ideas en realidad
   - Mi objetivo: Desarrollar habilidades de programación
   - Acciones:
     * Estudiar Python 1 hora (Lun-Vie)
     * Hacer proyecto personal (Lunes, Miércoles, Viernes)
   ```

3. Click en "Enviar a Quantum"
4. Esperar respuesta de extracción
5. Observar mensaje: "✅ Datos capturados! Redirigiendo al wizard para revisión..."

**Validaciones:**
- [ ] ✅ Redirección automática a `/dashboard/carta/wizard-v2`
- [ ] ✅ Banner amber visible: "🤖 Datos desde Quantum IA"
- [ ] ✅ Paso 1 pre-llenado con declaraciones
- [ ] ✅ Paso 2 pre-llenado con objetivos
- [ ] ✅ Paso 3 pre-llenado con acciones
- [ ] ✅ Paso 4 pre-llenado con frecuencias

**DevTools Validation:**
```javascript
// En Console, ejecutar:
JSON.parse(localStorage.getItem('quantum_draft_data'))

// Debe mostrar:
{
  "cartaData": {
    "salud": {
      "declaracion": "Yo soy energía vital en movimiento constante",
      "objetivo": "Mantener rutina de ejercicio consistente",
      "acciones": [
        { "nombre": "Hacer 30 minutos de cardio", "frecuencia": "Lun-Vie" },
        { "nombre": "Meditar 10 minutos", "frecuencia": "Diaria" }
      ]
    },
    "talentos": { ... }
  },
  "timestamp": "2024-01-15T...",
  "source": "quantum"
}
```

---

### Test 2: Edición Manual después de Quantum
**Objetivo:** Verificar que el usuario puede editar los datos antes de enviar

**Pasos:**
1. Completar Test 1 (wizard cargado con datos de Quantum)
2. Navegar al Paso 3 (HACER - Acciones)
3. En área "SALUD", agregar una acción manual:
   - Texto: "Dormir 8 horas"
4. Navegar al Paso 4 (Plan de Acción)
5. Para la acción "Dormir 8 horas":
   - Seleccionar frecuencia: DIARIA
6. Click en "Enviar a Revisión"

**Validaciones:**
- [ ] ✅ Submit exitoso (sin errores 400/500)
- [ ] ✅ Redirección a `/dashboard/carta/resumen`
- [ ] ✅ localStorage limpio (sin `quantum_draft_data`)
- [ ] ✅ Carta visible en resumen con 3 acciones en salud
- [ ] ✅ Nueva acción "Dormir 8 horas" aparece en BD

**DevTools Validation:**
```javascript
// Después del submit, verificar:
localStorage.getItem('quantum_draft_data') // null
```

**BD Validation:**
```sql
-- Verificar en Supabase:
SELECT * FROM "Accion" 
WHERE "metaId" IN (
  SELECT id FROM "Meta" WHERE categoria = 'salud'
)
ORDER BY "createdAt" DESC;

-- Debe incluir:
-- - "Hacer 30 minutos de cardio"
-- - "Meditar 10 minutos"
-- - "Dormir 8 horas" (la nueva)
```

---

### Test 3: Persistencia ante Cierre de Navegador
**Objetivo:** Verificar que los datos persisten en localStorage si el usuario cierra sin enviar

**Pasos:**
1. Completar Test 1 (wizard cargado con datos)
2. Editar Paso 1: Cambiar declaración de SALUD a:
   - "Yo soy vitalidad infinita en expansión"
3. **Cerrar la pestaña SIN hacer submit**
4. Abrir nueva pestaña
5. Navegar a `/dashboard/carta/wizard-v2`

**Validaciones:**
- [ ] ✅ Banner amber sigue visible
- [ ] ✅ Declaración editada persiste: "Yo soy vitalidad infinita en expansión"
- [ ] ✅ Resto de datos intactos
- [ ] ✅ Usuario puede continuar desde donde dejó

**DevTools Validation:**
```javascript
// Verificar que los datos siguen ahí:
const draft = JSON.parse(localStorage.getItem('quantum_draft_data'));
console.log(draft.cartaData.salud.declaracion);
// "Yo soy vitalidad infinita en expansión"
```

---

### Test 4: Limpieza Manual con "Limpiar Borrador"
**Objetivo:** Verificar que el usuario puede limpiar localStorage manualmente

**Pasos:**
1. Completar Test 1 (wizard con datos de Quantum)
2. Click en botón "🗑️ Limpiar Borrador" (top-right)
3. Confirmar diálogo de advertencia
4. Recargar página

**Validaciones:**
- [ ] ✅ localStorage limpio después del botón
- [ ] ✅ Banner amber desaparece después de reload
- [ ] ✅ Wizard carga datos desde BD (si existen)
- [ ] ✅ Sin errores en console

**DevTools Validation:**
```javascript
// Después de limpiar:
localStorage.getItem('quantum_draft_data') // null
```

---

### Test 5: Error en Submit (Network Failure)
**Objetivo:** Verificar que los datos NO se pierden si el submit falla

**Pasos:**
1. Completar Test 1 (wizard con datos)
2. Abrir DevTools → Network tab
3. Enable "Offline" mode
4. Click en "Enviar a Revisión"
5. Observar error de conexión

**Validaciones:**
- [ ] ✅ localStorage NO se limpia
- [ ] ✅ Datos siguen disponibles en wizard
- [ ] ✅ Usuario puede reintentar cuando vuelva la conexión
- [ ] ✅ Modal de error aparece: "Error de conexión"

**DevTools Validation:**
```javascript
// Después del error, verificar que los datos siguen:
localStorage.getItem('quantum_draft_data') !== null // true
```

**Recuperación:**
1. Disable "Offline" mode
2. Click en "Enviar a Revisión" nuevamente
3. Verificar submit exitoso
4. Verificar que ahora sí se limpió localStorage

---

### Test 6: Usuario sin Quantum (Flujo Normal)
**Objetivo:** Verificar que el wizard funciona normalmente sin datos de Quantum

**Pasos:**
1. Limpiar localStorage manualmente:
   ```javascript
   localStorage.removeItem('quantum_draft_data');
   ```
2. Navegar a `/dashboard/carta/wizard-v2` directamente
3. Llenar wizard manualmente paso por paso
4. Submit

**Validaciones:**
- [ ] ✅ Banner amber NO aparece
- [ ] ✅ Wizard funciona normalmente
- [ ] ✅ Submit exitoso
- [ ] ✅ Sin errores relacionados con Quantum

---

### Test 7: Conversión de Frecuencias
**Objetivo:** Verificar que las frecuencias de Quantum se convierten correctamente

**Pasos:**
1. Usar prompt con diferentes frecuencias:
   ```
   Acciones:
   - Revisar finanzas (Diaria)
   - Ir al gimnasio (Lun-Vie)
   - Reunión familiar (Lunes, Miércoles, Sábado)
   ```
2. Extraer con Quantum
3. Verificar Paso 4 en wizard

**Validaciones:**
- [ ] ✅ "Revisar finanzas" → DIARIA (todos los días seleccionados)
- [ ] ✅ "Ir al gimnasio" → LUN_VIE (solo días laborables)
- [ ] ✅ "Reunión familiar" → PERSONALIZADA (Lunes=1, Miércoles=3, Sábado=6)

**DevTools Validation:**
```javascript
const config = JSON.parse(localStorage.getItem('carta-wizard-draft-{email}'));
console.log(config.metasConfiguradas);
// Verificar que las frecuencias se convirtieron correctamente
```

---

### Test 8: Campos Vacíos desde Quantum
**Objetivo:** Verificar comportamiento cuando Quantum no detecta alguna área

**Pasos:**
1. Usar prompt que solo menciona 2 áreas:
   ```
   Solo quiero trabajar en finanzas y salud.
   
   Finanzas: Ahorrar $500 al mes
   Salud: Correr 5km diarios
   ```
2. Extraer con Quantum
3. Verificar wizard

**Validaciones:**
- [ ] ✅ Solo áreas FINANZAS y SALUD pre-llenadas
- [ ] ✅ Otras áreas quedan vacías (editable normalmente)
- [ ] ✅ Usuario puede agregar datos en áreas vacías
- [ ] ✅ Submit funciona con áreas parcialmente llenadas

---

## 🧪 Testing Automatizado (Opcional)

### Cypress Test Example
```javascript
describe('Quantum → Wizard Flow', () => {
  it('should load Quantum data in wizard and submit successfully', () => {
    // 1. Navegar a Mentor-IA
    cy.visit('/dashboard/mentor-ia');
    
    // 2. Paste test prompt
    cy.get('textarea').type('Quiero ser más saludable...');
    cy.get('button').contains('Enviar a Quantum').click();
    
    // 3. Wait for extraction
    cy.contains('Datos capturados', { timeout: 10000 });
    
    // 4. Should redirect to wizard
    cy.url().should('include', '/dashboard/carta/wizard-v2');
    
    // 5. Banner should be visible
    cy.contains('Datos desde Quantum IA').should('be.visible');
    
    // 6. localStorage should have data
    cy.window().then((win) => {
      const draft = JSON.parse(win.localStorage.getItem('quantum_draft_data'));
      expect(draft).to.have.property('cartaData');
      expect(draft.source).to.equal('quantum');
    });
    
    // 7. Submit
    cy.get('button').contains('Enviar a Revisión').click();
    
    // 8. Should clean localStorage
    cy.window().then((win) => {
      expect(win.localStorage.getItem('quantum_draft_data')).to.be.null;
    });
  });
});
```

---

## 📊 Matriz de Resultados

| Test Case | Status | Notes | Blocker? |
|-----------|--------|-------|----------|
| Test 1: Flujo Completo | ⬜ | | ❌ |
| Test 2: Edición Manual | ⬜ | | ❌ |
| Test 3: Persistencia | ⬜ | | ❌ |
| Test 4: Limpieza Manual | ⬜ | | ❌ |
| Test 5: Error Network | ⬜ | | ❌ |
| Test 6: Sin Quantum | ⬜ | | ❌ |
| Test 7: Frecuencias | ⬜ | | ❌ |
| Test 8: Campos Vacíos | ⬜ | | ❌ |

**Leyenda:**
- ⬜ No ejecutado
- ✅ Pass
- ❌ Fail
- ⚠️ Parcial

---

## 🐛 Bugs Encontrados

| ID | Descripción | Severidad | Reproducible | Fix |
|----|-------------|-----------|--------------|-----|
| - | - | - | - | - |

---

## 📝 Notas de Testing

### Edge Cases Adicionales
1. ¿Qué pasa si el usuario abre 2 tabs con el wizard?
2. ¿Funciona en modo incógnito?
3. ¿Qué pasa si localStorage está bloqueado por privacidad?
4. ¿Límite de tamaño de localStorage excedido?

### Performance
- ¿Cuánto tarda la extracción de Quantum? (Target: <5s)
- ¿Redirección es fluida? (Target: <2s)
- ¿Carga del wizard es rápida con datos grandes? (Target: <1s)

### Accesibilidad
- [ ] Banner amber tiene suficiente contraste (WCAG AA)
- [ ] Screenreader anuncia "Datos desde Quantum IA"
- [ ] Navegación por teclado funciona correctamente

---

## ✅ Sign-Off

**Tester:** _______________  
**Fecha:** _______________  
**Resultado:** [ ] Aprobado | [ ] Rechazado  
**Comentarios:** _______________

---

**Versión del Test Plan:** 1.0  
**Fecha:** 2024-01-15  
**Próxima revisión:** Después de cada cambio en el flujo
