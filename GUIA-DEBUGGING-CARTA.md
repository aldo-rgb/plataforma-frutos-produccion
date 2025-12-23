# 🐛 Guía de Debugging - Carta de Frutos

## Problema Reportado
**Síntoma:** El JSON se genera correctamente en el chat, pero los datos no aparecen en `/dashboard/carta`.

---

## ✅ Solución Implementada

### 1. Auto-Detección en Frontend
**Archivo:** `/app/dashboard/mentor-ia/page.tsx`

**Lógica agregada:**
```typescript
// Después de que termina el streaming
const tieneJSON = respuestaCompleta.includes('```json') && 
                 respuestaCompleta.includes('carta_de_frutos');

if (tieneJSON) {
  console.log('✅ JSON detectado en la respuesta');
  console.log('💾 El backend ya guardó automáticamente los datos en BD');
  
  // Mensaje de confirmación visual
  setMensajes(prev => [...prev, {
    role: 'assistant',
    content: '✅ ¡Carta de Frutos guardada! Redirigiendo...'
  }]);
  
  // Redirección automática en 3 segundos
  setTimeout(() => {
    window.location.href = '/dashboard/carta';
  }, 3000);
}
```

---

## 🔍 Cómo Verificar si Funciona

### Paso 1: Abrir Consola del Navegador
1. Abrir `/dashboard/mentor-ia`
2. Presionar F12 (DevTools)
3. Ir a la pestaña "Console"

### Paso 2: Completar Conversación con IA
Hablar con el Coach Ontológico hasta que genere el JSON final con las 7 áreas.

### Paso 3: Ver Logs en Consola del Navegador
**Deberías ver:**
```
🔍 Verificando si hay JSON de carta_de_frutos...
✅ JSON detectado en la respuesta
💾 El backend ya guardó automáticamente los datos en BD
🔄 Redirigiendo a Carta de Frutos en 3 segundos...
```

### Paso 4: Ver Logs en Terminal del Servidor
**Deberías ver en el terminal donde corre `npm run dev`:**
```
✅ JSON de Carta detectado, procesando...
📊 Datos recibidos: { ... }
📝 Procesando 7 metas...
  1. FINANZAS: "Facturar 10k USD"
     ✓ 1 acción(es) detectada(s)
  2. RELACIONES: "Mejorar comunicación"
     ✓ 1 acción(es) detectada(s)
  ...
🔄 Actualizando carta existente ID: X
   (o)
🆕 Creando nueva carta para usuario: ...
✅ Carta actualizada exitosamente
📋 Procesando tareas/acciones...
   📂 FINANZAS: 1 tarea(s)
      ✓ Creada: "Realizar 5 llamadas diarias"
✅ Carta de Frutos guardada exitosamente
📊 Resumen: 7 tarea(s) nueva(s), 0 ya existente(s)
```

### Paso 5: Verificar Redirección Automática
Después de 3 segundos, deberías ser redirigido a `/dashboard/carta` automáticamente.

### Paso 6: Verificar Datos en la UI
En `/dashboard/carta` deberías ver:
- ✅ Cards con las 7 áreas pobladas
- ✅ META PRINCIPAL en cada card
- ✅ Lista de tareas/acciones bajo cada meta

---

## 🚨 Si Aún No Funciona

### Escenario 1: El JSON No Se Detecta
**Síntoma:** No ves los logs de "JSON detectado"

**Solución:**
1. Verificar que el prompt esté generando el formato correcto
2. Abrir la respuesta del chat y copiar el JSON
3. Verificar que tenga exactamente este formato:
```json
{
  "carta_de_frutos": {
    "metas": [...]
  }
}
```

### Escenario 2: El Backend No Guarda
**Síntoma:** Ves "JSON detectado" pero no los logs del servidor

**Verificar:**
1. ¿El servidor está corriendo? (`npm run dev`)
2. ¿Hay errores en el terminal?
3. Verificar archivo `/app/api/chat/route.ts` línea ~156

**Test manual:**
```bash
# Ver si la tabla tiene datos
psql $DATABASE_URL -c "SELECT * FROM \"CartaFrutos\" LIMIT 5;"
psql $DATABASE_URL -c "SELECT * FROM \"Tarea\" LIMIT 10;"
```

### Escenario 3: Los Datos Se Guardan Pero No Aparecen
**Síntoma:** Logs del servidor OK, pero la UI está vacía

**Verificar:**
1. Abrir DevTools → Network
2. Buscar request a `/api/carta`
3. Ver la respuesta:
   - ¿Tiene `id`?
   - ¿Tiene campos como `finanzasMeta`, `relacionesMeta`?
   - ¿Tiene array `tareas`?

**Si la respuesta está vacía:**
```typescript
// Verificar en /app/api/carta/route.ts
// Debe incluir: include: { tareas: true }
```

---

## 📊 Flujo Completo

```
Usuario termina conversación
    ↓
IA genera JSON con 7 áreas
    ↓
Frontend detecta ```json en respuesta
    ↓
    ├─ Console.log de confirmación
    ├─ Mensaje visual "✅ Guardada"
    └─ setTimeout(redirect, 3000)
    ↓
Backend (onFinish) ejecuta en paralelo
    ↓
    ├─ extraerJSONDeRespuestaIA(text)
    ├─ Parsear metas[]
    ├─ Upsert CartaFrutos
    ├─ Insert Tareas
    └─ Console.log resumen
    ↓
Después de 3 segundos
    ↓
window.location.href = '/dashboard/carta'
    ↓
useEffect() en carta/page.tsx
    ↓
GET /api/carta
    ↓
agregarTareasDesdeDB() mapea datos
    ↓
setDatos() actualiza UI
    ↓
✅ Usuario ve sus metas y tareas
```

---

## 🔧 Comandos Útiles

**Ver logs en tiempo real del servidor:**
```bash
cd /Users/aldokmps/plataforma-frutos-FINAL
npm run dev
# Mantener abierto este terminal
```

**Ver base de datos directamente:**
```bash
# Contar registros
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"CartaFrutos\";"
psql $DATABASE_URL -c "SELECT COUNT(*) FROM \"Tarea\";"

# Ver últimos registros
psql $DATABASE_URL -c "SELECT * FROM \"CartaFrutos\" ORDER BY \"fechaCreacion\" DESC LIMIT 1;"
psql $DATABASE_URL -c "SELECT * FROM \"Tarea\" ORDER BY id DESC LIMIT 10;"
```

**Limpiar y probar de nuevo:**
```bash
# SOLO SI QUIERES EMPEZAR DE CERO (⚠️ CUIDADO)
psql $DATABASE_URL -c "DELETE FROM \"Tarea\";"
psql $DATABASE_URL -c "DELETE FROM \"CartaFrutos\";"
```

---

## ✅ Checklist de Verificación

- [ ] Servidor corriendo en http://localhost:3000
- [ ] Console del navegador abierta (F12)
- [ ] Terminal con logs del servidor visible
- [ ] Conversación completa con IA (7 áreas)
- [ ] Mensaje "JSON detectado" en console
- [ ] Logs del backend con "Carta guardada"
- [ ] Redirección automática después de 3s
- [ ] Datos visibles en `/dashboard/carta`

---

**Última actualización:** 11 de diciembre de 2025
