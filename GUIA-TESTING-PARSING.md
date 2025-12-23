# 🧪 GUÍA DE TESTING - Sistema de Parsing y Guardado Automático

## ✅ Sistema Implementado

El sistema **YA TIENE** implementada la función `procesarRespuestaIA()` que pediste:

1. ✅ Detecta el bloque ```json ... ``` en la respuesta de la IA
2. ✅ Extrae y parsea el JSON automáticamente
3. ✅ Llama al endpoint `/api/chat/procesar` para guardar
4. ✅ Actualiza la UI con mensaje de confirmación
5. ✅ Redirige automáticamente a `/dashboard/carta`

## 📋 Cómo Probar el Sistema

### PASO 1: Preparar las Consolas

**A. Consola del Navegador (Frontend)**
1. Abre Chrome/Firefox
2. Presiona `F12` para abrir DevTools
3. Ve a la pestaña **Console**
4. Limpia la consola (icono 🚫 o Ctrl+L)

**B. Terminal del Servidor (Backend)**
- El terminal donde está corriendo `npm run dev`
- Verás logs del servidor aquí

### PASO 2: Iniciar la Conversación

1. Ve a: `http://localhost:3000/dashboard/mentor-ia`
2. Completa la conversación con el Coach Ontológico
3. Responde las preguntas sobre las 7 áreas F.R.U.T.O.S.

### PASO 3: Logs Esperados Durante el Streaming

#### En la Consola del Navegador:

```javascript
// Durante el streaming (cada chunk)
🔄 Procesando chunk de streaming...

// Cuando termina el streaming
🔍 Verificando si hay JSON de carta_de_frutos...
📝 Longitud de respuesta: 2345 caracteres
📄 Primeros 500 caracteres: ¡Por supuesto, aquí tienes...
🔍 ¿Tiene ```json? true
🔍 ¿Tiene carta_de_frutos? true
🔍 Resultado detección: true
✅ JSON detectado en la respuesta
💾 Enviando al backend para procesar y guardar...
```

#### En el Terminal del Servidor:

```bash
📥 Procesando respuesta de IA...
📝 Longitud de respuesta: 2345 caracteres
📄 Primeros 300 caracteres: ¡Por supuesto, aquí tienes...
🔍 ¿Contiene ```json? true
🔍 ¿Contiene carta_de_frutos? true
✅ Mensaje guardado en historial
✅ JSON de Carta detectado, procesando...
📊 Datos recibidos: {
  "carta_de_frutos": {
    "metas": [...]
  }
}
📝 Procesando 7 metas...
  📌 FINANZAS: "Prueba de 10k" (1 acciones)
  📌 RELACIONES: "Prueba de Amor" (1 acciones)
  📌 TALENTOS: "Prueba de Libro" (1 acciones)
  📌 PAZ_MENTAL: "Prueba Zen" (1 acciones)
  📌 DIVERSIÓN: "Prueba Salsa" (1 acciones)
  📌 SALUD: "Prueba Gym" (1 acciones)
  📌 COMUNIDAD: "Prueba Donación" (1 acciones)
🔄 Actualizando carta existente... (o 🆕 Creando nueva carta...)
📋 Creando tareas...
✅ Carta guardada exitosamente con 7 tareas

POST /api/chat/procesar 200 in 234ms
```

### PASO 4: Verificación Visual en la UI

Deberías ver:

1. **Mensaje de la IA** con el JSON completo (como texto)
2. **Mensaje de confirmación** adicional:
   ```
   ---
   ✅ ¡Carta de Frutos guardada exitosamente!
   
   Tus metas y acciones ya están en la base de datos.
   Redirigiendo al dashboard en 3 segundos...
   ```
3. **Redirección automática** a `/dashboard/carta` después de 3 segundos

### PASO 5: Verificar Datos en /dashboard/carta

En la página de Carta de Frutos deberías ver:

- ✅ 7 áreas con sus metas cargadas
- ✅ Cada área muestra el texto de la meta principal
- ✅ Las tareas aparecen en cada categoría

## 🐛 Troubleshooting

### ❌ PROBLEMA 1: "No se detectó JSON" (pero la IA sí generó JSON)

**Síntoma en consola del navegador:**
```javascript
🔍 ¿Tiene ```json? false
🔍 ¿Tiene carta_de_frutos? true
🔍 Resultado detección: false
ℹ️ No se detectó JSON de carta_de_frutos (conversación normal)
```

**Causa:** La IA no está usando el formato \`\`\`json

**Solución:**
- Verifica que el prompt incluya: "El JSON debe estar envuelto en \`\`\`json y \`\`\`"
- Prueba de nuevo la conversación

---

### ❌ PROBLEMA 2: Error 401 "No autorizado"

**Síntoma en consola del navegador:**
```javascript
❌ Error al procesar JSON: {"error":"No autorizado"}
```

**Causa:** Sesión expirada

**Solución:**
1. Cierra sesión
2. Vuelve a hacer login
3. Intenta de nuevo

---

### ❌ PROBLEMA 3: El JSON se ve como texto normal en el chat

**Síntoma:** El bloque JSON aparece renderizado como código, pero no se ejecuta el parsing

**Causa:** El sistema SÍ está parseando, pero solo visualmente se ve como texto

**Verificación:**
- Revisa los logs en la consola del navegador
- Si ves "✅ JSON detectado", el parsing SÍ funcionó
- El texto JSON se muestra para que el usuario lo vea, pero en segundo plano se está procesando

**Solución:** Ninguna, esto es el comportamiento esperado. El parsing es **automático en segundo plano**.

---

### ❌ PROBLEMA 4: No redirige automáticamente

**Síntoma:** Se muestra el mensaje de confirmación pero no redirige

**Causa:** Error de JavaScript o timer cancelado

**Verificación en Consola:**
```javascript
// Deberías ver esto antes de la redirección
setTimeout(() => {
  window.location.href = '/dashboard/carta';
}, 3000);
```

**Solución:**
- Espera los 3 segundos completos
- Si no redirige, haz clic manualmente en "Carta de Frutos" en la sidebar

---

### ❌ PROBLEMA 5: Redirige pero no aparecen datos

**Síntoma:** La página `/dashboard/carta` está vacía

**Causa posible 1:** Las tareas no se crearon correctamente

**Verificación en Terminal del Servidor:**
```bash
✅ Carta guardada exitosamente con 0 tareas  ← ⚠️ PROBLEMA AQUÍ
```

**Solución:**
- El JSON debe tener el campo `tareas_acciones` o `acciones_concretas`
- Ejemplo:
  ```json
  {
    "area": "FINANZAS",
    "meta_principal": "Ahorrar $10,000",
    "tareas_acciones": ["Ahorrar $500 semanalmente"]  ← Esto es crítico
  }
  ```

**Causa posible 2:** Error en el mapeo de categorías

**Verificación en Terminal:**
```bash
⚠️ Área desconocida: COMUNIDAD_SERVICIO
```

**Solución:** Las áreas válidas son:
- `FINANZAS`
- `RELACIONES`
- `TALENTOS`
- `PAZ_MENTAL`
- `DIVERSIÓN`
- `SALUD`
- `COMUNIDAD`

---

## 🔍 Checklist de Verificación Rápida

Antes de reportar un problema, verifica:

- [ ] Servidor corriendo (`npm run dev` sin errores)
- [ ] Sesión activa (logged in)
- [ ] Consola del navegador abierta (F12)
- [ ] La IA completó la respuesta (no se cortó)
- [ ] La respuesta incluye `\`\`\`json` (con 3 backticks)
- [ ] La respuesta incluye `carta_de_frutos`
- [ ] El JSON tiene las 7 metas
- [ ] Cada meta tiene `tareas_acciones` con al menos 1 acción

## 📊 Diagrama del Flujo Completo

```
Usuario completa conversación
         ↓
IA genera respuesta con JSON
         ↓
[FRONTEND] Procesa stream chunk por chunk
         ↓
[FRONTEND] Construye respuestaCompleta
         ↓
[FRONTEND] Detecta ```json + carta_de_frutos
         ↓
[FRONTEND] POST /api/chat/procesar
         ↓
[BACKEND] Recibe respuestaCompleta
         ↓
[BACKEND] extraerJSONDeRespuestaIA()
         ↓
[BACKEND] Guarda mensaje en MensajeChat
         ↓
[BACKEND] Crea/Actualiza CartaFrutos
         ↓
[BACKEND] Crea Tareas (1 por cada acción)
         ↓
[BACKEND] Devuelve { success: true }
         ↓
[FRONTEND] Muestra mensaje de confirmación
         ↓
[FRONTEND] setTimeout 3 segundos
         ↓
[FRONTEND] window.location.href = '/dashboard/carta'
         ↓
[FRONTEND] Carga datos desde /api/carta
         ↓
Usuario ve las 7 áreas con metas y tareas
```

## 🎯 Qué Esperar Ver

### Consola del Navegador (Logs Clave):

```javascript
✅ JSON detectado en la respuesta
💾 Enviando al backend para procesar y guardar...
✅ Respuesta del backend: {success: true, mensaje: "Carta de Frutos guardada exitosamente", cartaId: 123, tareasCreadas: 7}
```

### Terminal del Servidor (Logs Clave):

```bash
📥 Procesando respuesta de IA...
✅ Mensaje guardado en historial
✅ JSON de Carta detectado, procesando...
📝 Procesando 7 metas...
📋 Creando tareas...
✅ Carta guardada exitosamente con 7 tareas
POST /api/chat/procesar 200 in XXXms
```

### Interfaz Visual:

1. Chat muestra el JSON como texto (esto es normal)
2. Aparece mensaje: "✅ ¡Carta de Frutos guardada exitosamente!"
3. Redirección automática después de 3 segundos
4. En `/dashboard/carta` aparecen las 7 áreas llenas

## 📝 Notas Finales

- **El parsing es automático:** No hay que hacer clic en nada
- **Los logs son tu mejor amigo:** Si algo falla, los logs te dirán exactamente dónde
- **El JSON se muestra como texto:** Esto es intencional para que el usuario lo vea
- **El guardado es en segundo plano:** Mientras ves el texto, el backend ya está guardando

## ✅ Confirmación de Implementación

**Código implementado en:**
- ✅ `/app/dashboard/mentor-ia/page.tsx` (líneas 128-172)
- ✅ `/app/api/chat/procesar/route.ts` (endpoint completo)
- ✅ `/utils/extraer-json.ts` (función de parsing)

**Funcionalidad:**
- ✅ Detecta ```json automáticamente
- ✅ Parsea con regex: `/```json([\s\S]*?)```/`
- ✅ Llama a API de guardado
- ✅ Actualiza UI con confirmación
- ✅ Redirige automáticamente

---

**¿Listo para probar?** Abre `/dashboard/mentor-ia` y completa una conversación. Los logs te guiarán en cada paso.
