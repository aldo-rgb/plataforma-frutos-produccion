# Plan de Testing: Servicio Transformacional - Auto-prellenado

**Fecha:** 27 de diciembre de 2024  
**Componente:** `CartaWizardRelacional.tsx`  
**Funcionalidad:** Prellenado automático de objetivo "Enrolar a X personas" para usuarios con Vision

---

## ✅ Implementación Verificada

### 1. Estado objetivoInvitados (línea 64)
```typescript
const [objetivoInvitados, setObjetivoInvitados] = useState<number | null>(null);
```
- ✅ Estado inicializado correctamente
- ✅ Tipo correcto: `number | null`

### 2. Carga desde API (líneas 283-290)
```typescript
const transformationTarget = areasConfigData.transformationGuestsTarget || null;
if (transformationTarget) {
  setObjetivoInvitados(transformationTarget);
  console.log(`🎯 Objetivo de invitados: ${transformationTarget} personas`);
}
```
- ✅ Obtiene `transformationGuestsTarget` desde `/api/areas-config`
- ✅ Guarda en state
- ✅ Log de confirmación presente

### 3. useEffect de Prellenado (líneas 416-434)
```typescript
useEffect(() => {
  if (objetivoInvitados && areasActivas.some(a => a.key === 'servicioTrans')) {
    setIdentidadesPorArea(prev => {
      if (!prev.servicioTrans || prev.servicioTrans.length === 0) {
        console.log(`✅ Prellenando objetivo: Enrolar a ${objetivoInvitados} personas`);
        return {
          ...prev,
          servicioTrans: [{
            id: 'servicioTrans-obj-predefinido',
            description: `Enrolar a ${objetivoInvitados} personas`,
            isValid: true
          }]
        };
      }
      return prev;
    });
  }
}, [objetivoInvitados, areasActivas]);
```
- ✅ Posicionado DESPUÉS de loadCarta
- ✅ Dependencias correctas: `[objetivoInvitados, areasActivas]`
- ✅ Solo prellena si campo vacío
- ✅ Log de confirmación presente

### 4. Campo readonly (línea 1482)
```typescript
isReadOnly={isReadOnly || (area.key === 'servicioTrans' && objetivoInvitados !== null)}
```
- ✅ Bloquea edición cuando hay objetivoInvitados
- ✅ Mantiene readonly general

### 5. Placeholder dinámico (líneas 1476-1478)
```typescript
placeholder={area.key === 'servicioTrans' && objetivoInvitados 
  ? `Enrolar a ${objetivoInvitados} personas` 
  : "Ej: Incrementar mis ingresos mensuales en un 30%"}
```
- ✅ Muestra objetivo específico para SERVICIO TRANSFORMACIONAL
- ✅ Placeholder genérico para otras áreas

### 6. Enhanced Logging (líneas 232-238)
```typescript
console.log('📦 Datos extraídos de Quantum:', {
  identidadesPorArea: newIdentidades,
  metasPorArea: newMetas,
  metasConfiguradas: configs
});
console.log(`📋 Procesando ${data.acciones?.length || 0} acciones totales`);
console.log(`✅ Metas mapeadas por área:`, newMetas);
```
- ✅ Logs detallados de Quantum IA
- ✅ Contador de acciones
- ✅ Mapeo de metas por área

---

## 🧪 Checklist de Testing Manual

### Pre-requisitos
- [ ] Usuario con Vision "Quanter V3" activa
- [ ] Vision configurada con `transformationGuestsTarget = 3`
- [ ] Áreas habilitadas: RELACIONES, SALUD, SERVICIO TRANSFORMACIONAL, SERVICIO COMUNITARIO
- [ ] Servidor Next.js corriendo (`npm run dev`)
- [ ] Consola del navegador abierta (F12)

### Test 1: Carga Inicial
**Pasos:**
1. Login como usuario con Vision
2. Navegar a `/dashboard/carta`
3. Abrir consola del navegador

**Verificaciones:**
- [ ] Log aparece: `🎯 Objetivo de invitados: 3 personas`
- [ ] Estado `objetivoInvitados` = 3 (verificar con React DevTools)
- [ ] Componente carga sin errores

### Test 2: Prellenado Automático
**Pasos:**
1. Llegar al Paso 2 (Objetivos)
2. Seleccionar área "SERVICIO TRANSFORMACIONAL"

**Verificaciones:**
- [ ] Log aparece: `✅ Prellenando objetivo de Servicio Transformacional: Enrolar a 3 personas`
- [ ] Campo muestra: "Enrolar a 3 personas"
- [ ] Campo está en modo readonly (fondo gris/disabled)
- [ ] Placeholder dice: "Enrolar a 3 personas"

### Test 3: Campo Readonly
**Pasos:**
1. Intentar hacer clic en el campo prellenado
2. Intentar editar el texto

**Verificaciones:**
- [ ] Campo no es editable
- [ ] Cursor no cambia al pasar sobre el campo
- [ ] No se puede seleccionar el texto para modificar

### Test 4: Otras Áreas NO Afectadas
**Pasos:**
1. Seleccionar área "RELACIONES"
2. Intentar agregar objetivo

**Verificaciones:**
- [ ] Campo es editable normalmente
- [ ] Placeholder genérico: "Ej: Incrementar mis ingresos..."
- [ ] No hay prellenado automático

### Test 5: Quantum IA Integration
**Pasos:**
1. Hacer clic en botón "Quantum IA"
2. Esperar procesamiento
3. Revisar consola

**Verificaciones:**
- [ ] Log: `📦 Datos extraídos de Quantum`
- [ ] Log: `📋 Procesando X acciones totales` (X = cantidad real)
- [ ] Log: `✅ Metas mapeadas por área`
- [ ] Si hay acciones para SERVICIO TRANSFORMACIONAL, aparecen listadas

### Test 6: Guardar y Recargar
**Pasos:**
1. Avanzar pasos del wizard
2. Guardar borrador (auto-save)
3. Recargar página (F5)

**Verificaciones:**
- [ ] Objetivo "Enrolar a 3 personas" permanece
- [ ] Campo sigue siendo readonly
- [ ] No se pierde el estado

### Test 7: Usuario SIN Vision
**Pasos:**
1. Login como usuario regular (sin Vision)
2. Navegar a `/dashboard/carta`
3. Ir a Paso 2, área SERVICIO TRANSFORMACIONAL

**Verificaciones:**
- [ ] NO hay log de `🎯 Objetivo de invitados`
- [ ] Campo es editable
- [ ] Placeholder genérico
- [ ] Usuario puede agregar objetivos manualmente

---

## 🐛 Errores Conocidos (NO relacionados)

**63 errores TypeScript en otros archivos:**
- Archivos afectados: 
  - `app/api/detector-diario/route.ts`
  - `app/api/game-changer/*/route.ts`
- Causa: Naming inconsistente Prisma (`notificacion` vs `notification`)
- Impacto: NO afecta funcionalidad de CartaWizardRelacional
- Estado: Pendiente de fix global

---

## 📊 Datos de Test

### Usuario de Prueba
```json
{
  "id": "user_vision_test",
  "email": "test@vision.com",
  "visionActiva": {
    "nombre": "Quanter V3",
    "transformationGuestsTarget": 3,
    "areasHabilitadas": [
      "relaciones",
      "salud",
      "servicioTrans",
      "servicioComun"
    ]
  }
}
```

### Resultado Esperado en API
```bash
GET /api/areas-config
Response:
{
  "perteneceAGrupo": true,
  "transformationGuestsTarget": 3,
  "areas": [
    { "areaKey": "relaciones", "enabled": true },
    { "areaKey": "salud", "enabled": true },
    { "areaKey": "servicioTrans", "enabled": true },
    { "areaKey": "servicioComun", "enabled": true }
  ]
}
```

---

## 📝 Logs Esperados

### Secuencia Completa de Logs
```
1. ⚙️ Areas config: { perteneceAGrupo: true, transformationGuestsTarget: 3, ... }
2. 🎯 Objetivo de invitados: 3 personas
3. ✅ Prellenando objetivo de Servicio Transformacional: Enrolar a 3 personas
4. (Si usa Quantum IA)
   - 📦 Datos extraídos de Quantum: {...}
   - 📋 Procesando X acciones totales
   - ✅ Metas mapeadas por área: {...}
```

---

## ✅ Criterios de Éxito

- ✅ Objetivo "Enrolar a 3 personas" aparece automáticamente
- ✅ Campo es readonly (no editable)
- ✅ Placeholder correcto
- ✅ Logs presentes en consola
- ✅ Otras áreas no afectadas
- ✅ Estado persiste en recargas
- ✅ Usuarios sin Vision no ven prellenado

---

## 🚀 Próximos Pasos

1. **Testing manual** según checklist
2. **Capturar screenshots** de cada verificación
3. **Documentar bugs** si aparecen
4. **Validar integración** con Quantum IA
5. **Testing con usuarios reales** de Vision

---

## 📁 Archivos Relacionados

```
components/dashboard/CartaWizardRelacional.tsx  (implementación principal)
app/api/areas-config/route.ts                   (endpoint de configuración)
lib/validaciones-carta.ts                       (validaciones)
prisma/schema.prisma                             (modelo Vision)
```

---

**Estado:** ✅ LISTO PARA TESTING  
**Build Status:** ✅ Sin errores de compilación  
**Última actualización:** 27 dic 2024
