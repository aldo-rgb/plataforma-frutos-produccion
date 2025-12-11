# 🤖 Arquitectura del Mentor IA & Carta de Frutos

## ✅ ESTADO ACTUAL (11 DIC 2025)

### Sistema Consolidado y Funcional

**Endpoints Activos:**
- ✅ `/api/chat` - Endpoint principal con streaming y persistencia
- ✅ `/dashboard/mentor-ia` - UI moderna con chat en tiempo real

**Archivos Eliminados (Duplicados Obsoletos):**
- ❌ `/api/chat-ia/route.ts` - Contenía prompt "Mentor Cuántico" antiguo
- ❌ `/dashboard/chat-ia/page.tsx` - UI antigua sin persistencia

---

## 🏗️ ARQUITECTURA COMPLETA

### 1. API Endpoint: `/app/api/chat/route.ts`

**Tecnología:** Vercel AI SDK + OpenAI GPT-4o

**Flujo de Trabajo:**
```
Usuario envía mensaje
    ↓
Validación de sesión (NextAuth)
    ↓
Buscar usuario en BD por email
    ↓
Llamar a OpenAI con streamText()
    ↓
Streaming en tiempo real al frontend
    ↓
onFinish(): Guardar mensaje + Detectar JSON
    ↓
Si JSON presente: Persistir Carta de Frutos
```

**Características Clave:**
- ✅ Streaming de respuestas en tiempo real
- ✅ Persistencia automática de mensajes en `MensajeChat`
- ✅ Detección automática de JSON de "carta_de_frutos"
- ✅ Guardado en `CartaFrutos` y `Tarea` tables
- ✅ Seguridad con NextAuth session validation

**System Prompt Actual:**
- **Personalidad:** Coach Ontológico basado en ontología del lenguaje
- **Filosofía:** Observador en FLUIR, resultados tangibles, incertidumbre
- **Objetivo:** Guiar por 7 áreas de F.R.U.T.O.S.
- **Formato de salida:** JSON con metas y tareas_acciones

---

### 2. Frontend UI: `/app/dashboard/mentor-ia/page.tsx`

**Tecnología:** React + TypeScript + Tailwind CSS

**Características:**
- ✅ Carga historial de chat al montar componente
- ✅ Streaming manual con fetch() + ReadableStream
- ✅ UI moderna con gradientes y animaciones
- ✅ Auto-scroll a último mensaje
- ✅ Indicador de "pensando..." durante carga
- ✅ Persistencia automática de mensajes del usuario

**Flujo de Mensaje:**
```
Usuario escribe mensaje → enviarMensaje()
    ↓
Guardar mensaje usuario en DB (server action)
    ↓
Enviar POST a /api/chat
    ↓
Procesar stream chunk por chunk
    ↓
Actualizar UI en tiempo real
    ↓
Mensaje completo guardado automáticamente por API
```

---

### 3. Server Actions: `/app/actions/chat-ia.ts`

**Funciones:**

```typescript
// Obtener todo el historial del usuario
export async function obtenerHistorialChat()

// Guardar mensaje individual (user o assistant)
export async function guardarMensajeChat(role, contenido)
```

**Seguridad:** Validación de sesión en cada llamada

---

### 4. Utilidad JSON: `/utils/extraer-json.ts`

**Propósito:** Extraer y parsear JSON de respuestas de IA

**Funciones:**
```typescript
// Función principal: busca JSON en diferentes formatos
extraerJSONDeRespuestaIA(text)

// Limpieza de JSON malformado
limpiarJSONSucio(jsonStr)
```

**Patrones de detección:**
1. Bloques con ```json ... ```
2. JSON en texto plano
3. JSON con comentarios o trailing commas

---

### 5. Persistencia: Carta de Frutos

**Tablas Involucradas:**

**CartaFrutos:**
- Campos: finanzasMeta, relacionesMeta, talentosMeta, pazMentalMeta, ocioMeta, saludMeta, servicioComunMeta
- Relación: 1 carta por usuario (usuarioId unique)
- Avances: Cada área tiene campo de avance (0-100)

**Tarea:**
- Campos: categoria, descripcion, completada, requiereFoto, cartaId
- Relación: N tareas por 1 carta
- Categorías: "finanzas", "relaciones", "talentos", etc.

**Flujo de Guardado:**
```
IA genera JSON con carta_de_frutos
    ↓
extraerJSONDeRespuestaIA() parsea el JSON
    ↓
Mapear áreas del JSON a campos de BD
    ↓
Upsert CartaFrutos (actualizar si existe)
    ↓
Iterar sobre tareas_acciones de cada área
    ↓
Crear Tarea para cada acción (si no existe)
```

---

### 6. Hydration: `/app/dashboard/carta/page.tsx`

**Propósito:** Cargar metas guardadas al abrir la Carta

**Helper Function:**
```typescript
function agregarTareasDesdeDB(tareasArray, categoria, data)
```

**Flujo:**
```
useEffect() al montar componente
    ↓
Fetch GET /api/carta (incluye relación tareas)
    ↓
Si hay datos, mapear cada área
    ↓
agregarTareasDesdeDB() para cada categoría
    ↓
UI se llena automáticamente con datos guardados
```

---

## 🔐 SEGURIDAD

**Todas las rutas protegidas con:**
1. NextAuth `getServerSession(authOptions)`
2. Validación de `session.user.email`
3. Búsqueda de usuario en BD antes de cualquier operación

**No hay userId hardcoded** - Todo basado en sesión actual

---

## 📊 FLUJO DE DATOS COMPLETO

### Caso de Uso: Usuario Define su Carta

```mermaid
Usuario → Mentor IA UI
    ↓
Conversación guiada por 7 áreas
    ↓
IA detecta que terminó todas las áreas
    ↓
IA genera JSON con carta_de_frutos
    ↓
API detecta JSON con extraerJSONDeRespuestaIA()
    ↓
Guarda en CartaFrutos (upsert)
    ↓
Guarda tareas en Tarea (verificando duplicados)
    ↓
Usuario va a /dashboard/carta
    ↓
Frontend carga datos con GET /api/carta
    ↓
agregarTareasDesdeDB() llena la UI
    ↓
Usuario ve sus metas y tareas guardadas ✅
```

---

## 🎯 LAS 7 ÁREAS DE F.R.U.T.O.S.

Según el prompt actual:

1. **FINANZAS** - Prosperidad económica, ingresos
2. **RELACIONES** - Pareja, familia, amigos
3. **TALENTOS** - Habilidades, creatividad
4. **PAZ MENTAL** - Espiritualidad, manejo de estrés
5. **DIVERSIÓN** - Ocio, recreación, hobbies
6. **SALUD** - Vitalidad, ejercicio, alimentación
7. **COMUNIDAD** - Servicio, impacto social

**Formato JSON Esperado:**
```json
{
  "carta_de_frutos": {
    "metas": [
      {
        "area": "FINANZAS",
        "meta_principal": "Generar $50,000 MXN en 3 meses",
        "tareas_acciones": [
          "Enviar 10 propuestas comerciales semanales",
          "Llamar a 5 clientes potenciales cada semana"
        ]
      }
      // ... 6 áreas más
    ]
  }
}
```

---

## 🚀 PRÓXIMOS PASOS (SUGERIDOS)

### Mejoras Pendientes:

1. **Migración a OpenAI API Directa** (Opcional)
   - Motivo: Usar stored prompts con IDs
   - Beneficio: Versionado de prompts en OpenAI dashboard
   - Estado: Actualmente usando Vercel AI SDK (funcional)

2. **Validación de Áreas Completas**
   - Verificar que el usuario complete las 7 áreas antes de generar JSON
   - Mostrar progress bar de áreas completadas

3. **Edición de Carta después de Guardado**
   - Actualmente solo se puede crear/actualizar con IA
   - Permitir edición manual en /dashboard/carta

4. **Notificaciones**
   - Avisar al usuario cuando su Carta fue guardada exitosamente
   - Toast o modal de confirmación

---

## 🐛 PROBLEMAS RESUELTOS

### Historial de Bugs Corregidos:

1. ✅ **Import error de prisma** - Cambiado a named export
2. ✅ **Syntax error en systemPrompt** - Removido backticks anidados
3. ✅ **toDataStreamResponse()** - Corregido a toTextStreamResponse()
4. ✅ **Metas no se guardaban** - Implementado JSON detection + persistencia
5. ✅ **Datos desaparecían en F5** - Implementado hydration con useEffect
6. ✅ **Chat duplicado** - Eliminados endpoints y UIs obsoletos

---

## 📝 NOTAS FINALES

**Última actualización:** 11 de diciembre de 2025

**Estado del sistema:** ✅ PRODUCTIVO

**Pendiente:**
- Opcional: Migrar a OpenAI API directa para stored prompts
- Revisar prompt actual y ajustar según retroalimentación

**Contacto técnico:** [Agregar info de contacto]
