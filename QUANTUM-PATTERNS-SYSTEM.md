# 🧬 QUANTUM PATTERNS - Motor de Analítica Predictiva

## Visión General

**Promesa al Usuario**: "Descubre el código fuente de tu éxito."

Quantum Patterns es un sistema de inteligencia que cruza variables de comportamiento para encontrar correlaciones ocultas entre hábitos, horarios y estados de ánimo. Transforma la app de una simple lista de tareas en un **Espejo Inteligente** que conoce al usuario mejor que él mismo.

## Arquitectura del Sistema

### 1. Capa de Recolección de Datos

Cada vez que un usuario completa una tarea, se capturan **metadatos contextuales**:

```typescript
// Campos agregados a TaskInstance
dayOfWeek: Int?         // 0=Domingo, 1=Lunes, ... 6=Sábado
timeSlot: TimeSlot?     // Franja horaria de completación
streakContext: Int?     // Racha activa al momento de completar
completionSpeed: Int?   // Minutos de diferencia (early/late)
moodTag: String?        // Estado de ánimo reportado (opcional)
energyLevel: Int?       // 1-5 nivel de energía reportado
```

**Franjas Horarias (TimeSlot)**:
- `EARLY_MORNING` → 5:00 - 9:00 (Club 5AM)
- `MORNING` → 9:00 - 12:00
- `MIDDAY` → 12:00 - 15:00
- `AFTERNOON` → 15:00 - 18:00
- `EVENING` → 18:00 - 21:00
- `NIGHT` → 21:00 - 23:59
- `LATE_NIGHT` → 00:00 - 4:59

### 2. Motor de Correlación (Backend Logic)

**Job Semanal**: Se ejecuta cada Domingo a las 11 PM.

```bash
# Ejecutar manualmente
node scripts/quantum-weekly-analysis.js
```

El motor analiza las últimas **4 semanas** de datos y detecta:

#### 🌅 **Golden Hour** (Franja Horaria Óptima)
**Lógica**: ¿En qué franja horaria el usuario tiene >90% de cumplimiento?

**Ejemplo de Insight**:
> "Eres un guerrero nocturno. Tus tareas de Finanzas fallan por la mañana, pero tienen 100% de éxito después de las 8 PM."

**Criterios de Detección**:
- Mínimo 5 tareas en la franja
- Tasa de éxito >90%
- Confianza = tasa de éxito

#### 🔗 **Keystone Habit** (Efecto Dominó)
**Lógica**: Si cumple la Tarea A (ej. "Meditar"), ¿aumenta la probabilidad de cumplir la Tarea B (ej. "Ventas")?

**Ejemplo de Insight**:
> "Dato curioso: Los días que meditas, tu cumplimiento en ventas sube un 40%."

**Criterios de Detección**:
- Mínimo 3 días con Tarea A y 3 días sin Tarea A
- Diferencia de cumplimiento >20%
- Confianza = diferencia normalizada (max 1.0)

#### ⚠️ **Cursed Day** (Día Maldito)
**Lógica**: ¿Qué día tiene la tasa de fallo más alta sistemáticamente?

**Ejemplo de Insight**:
> "Los Martes son tu talón de Aquiles. Tienes un 60% de fallo. Te sugiero reducir la carga este día."

**Criterios de Detección**:
- Mínimo 4 tareas en ese día
- Tasa de fallo >60%
- Confianza = tasa de fallo

### 3. Base de Datos

#### Tabla: `QuantumPattern`
Almacena los patrones detectados.

```prisma
model QuantumPattern {
  id             Int          @id @default(autoincrement())
  usuarioId      Int
  patternType    PatternType  // GOLDEN_HOUR, KEYSTONE_HABIT, CURSED_DAY
  confidence     Float        // 0.0 - 1.0 (solo mostrar si >0.75)
  
  // Golden Hour
  goldenTimeSlot TimeSlot?
  successRate    Float?
  
  // Keystone Habit
  keystoneTaskId Int?
  affectedTaskId Int?
  correlationDiff Float?
  
  // Cursed Day
  cursedDay      Int?
  failureRate    Float?
  
  sampleSize     Int
  lastCalculated DateTime
  isActive       Boolean
  viewedByUser   Boolean
  
  Insights       QuantumInsight[]
}
```

#### Tabla: `QuantumInsight`
Almacena los "insights" (revelaciones) que se muestran al usuario.

```prisma
model QuantumInsight {
  id           Int      @id
  patternId    Int
  usuarioId    Int
  
  title        String   // "Patrón de Éxito Detectado"
  message      String   // Texto generado por QUANTUM
  actionButton String?  // "Ajustar Agenda Inteligente"
  actionUrl    String?  // "/dashboard/agenda"
  
  iconEmoji    String   // "🧬", "🌅", "🔗", "⚠️"
  chartData    Json?    // Datos para gráfico mini
  
  viewed       Boolean
  dismissed    Boolean
  actionTaken  Boolean
}
```

### 4. APIs

#### `GET /api/quantum/insights`
Obtiene insights activos no vistos del usuario.

**Response**:
```json
{
  "success": true,
  "insights": [
    {
      "id": 42,
      "title": "Patrón de Éxito Detectado",
      "message": "Eres un guerrero nocturno. Tus tareas de Finanzas...",
      "iconEmoji": "🌅",
      "actionButton": "Ajustar Agenda Inteligente",
      "actionUrl": "/dashboard/agenda",
      "patternType": "GOLDEN_HOUR",
      "confidence": 95,
      "chartData": { "type": "GOLDEN_HOUR", "value": 95 }
    }
  ]
}
```

#### `POST /api/quantum/insights/[id]/viewed`
Marca un insight como visto (cuando el usuario hace clic en el botón de acción).

#### `POST /api/quantum/insights/[id]/dismiss`
Descarta un insight (cuando el usuario cierra la tarjeta).

### 5. UX/UI: La Tarjeta de Revelación

**Componente**: `<QuantumInsightCard />`

**Ubicación**: Dashboard principal (widget superior).

**Diseño**:
- Icono pulsante (🧬, 🌅, 🔗, ⚠️)
- Título: "Patrón de Éxito Detectado"
- Badge de confianza: "95% de certeza"
- Mensaje revelador (1-2 frases)
- Gráfico mini (barra de progreso animada)
- Botón de acción: "Ajustar Agenda Inteligente"
- Navegación si hay múltiples insights

**Estados**:
1. **Oculto**: No hay insights activos o confianza <75%
2. **Visible**: Animación de entrada suave
3. **Visto**: Marcado cuando el usuario toma acción
4. **Descartado**: Usuario cierra manualmente

**Animaciones**:
- Entrada: fade-in + scale-up (0.4s)
- Icono: pulso continuo (2s loop)
- Gráfico: barra animada (1s)
- Botón: hover scale-up

### 6. System Prompt para QUANTUM (Generación de Texto)

```
Analiza los siguientes datos estadísticos del usuario: {DATA_JSON}.
Encuentra la correlación más fuerte positiva o negativa.
Redacta un 'Insight' de una sola frase que sea sorprendente y accionable.

Tono: Científico pero revelador, como si hubieras descubierto un secreto.

Ejemplo: "Tus finanzas sufren cuando ignoras tu salud. Los días sin ejercicio, tus registros de gastos caen a cero."

Características:
- Máximo 2 frases
- Usar números específicos (ej: "+40%", "90% de éxito")
- Mencionar áreas específicas (Finanzas, Salud, Relaciones)
- Sugerir causa-efecto clara
- Tono motivador pero realista
```

## Flujo de Usuario

### 1. Usuario Completa Tareas Normalmente
- El sistema captura metadatos automáticamente
- No hay fricción ni pasos extra

### 2. Domingo 11 PM - Job Semanal
```bash
# Ejecutado por cron o scheduler
node scripts/quantum-weekly-analysis.js
```

- Analiza usuarios activos (con tareas en el último mes)
- Detecta patrones con confianza >75%
- Guarda en `QuantumPattern` y `QuantumInsight`

### 3. Usuario Entra al Dashboard
- Componente `<QuantumInsightCard />` hace fetch a `/api/quantum/insights`
- Si hay insights activos, muestra la tarjeta animada
- Usuario lee la revelación

### 4. Usuario Toma Acción
**Opción A**: Clic en "Ajustar Agenda Inteligente"
- Marca como `viewed: true`
- Redirige a `/dashboard/agenda`
- (Futuro) Agenda sugiere reorganización automática

**Opción B**: Clic en X (descartar)
- Marca como `dismissed: true`
- Oculta la tarjeta
- No vuelve a mostrarse

## Instalación y Configuración

### 1. Migrar Database Schema
```bash
npx prisma db push
```

### 2. Instalar Dependencias
```bash
npm install framer-motion
```

### 3. Agregar Componente al Dashboard
```tsx
// app/dashboard/participante/page.tsx
import QuantumInsightCard from '@/components/quantum/QuantumInsightCard';

export default function Dashboard() {
  return (
    <div>
      {/* Otros componentes */}
      <QuantumInsightCard />
    </div>
  );
}
```

### 4. Configurar Cron Job
```bash
# crontab -e
0 23 * * 0 cd /app && node scripts/quantum-weekly-analysis.js
```

O usando un scheduler como Vercel Cron:
```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/quantum-analysis",
      "schedule": "0 23 * * 0"
    }
  ]
}
```

## Testing

### 1. Datos de Prueba
```bash
# Crear tareas con metadatos simulados
node scripts/seed-quantum-test-data.js
```

### 2. Ejecutar Análisis Manualmente
```bash
node scripts/quantum-weekly-analysis.js
```

### 3. Verificar en UI
1. Login como usuario de prueba
2. Ir a `/dashboard`
3. Verificar que aparece `<QuantumInsightCard />`
4. Probar acciones (tomar acción, descartar)

## Métricas y KPIs

### Tasa de Detección
- Meta: >40% de usuarios activos tienen al menos 1 patrón
- Actual: Se calcula en cada ejecución del job

### Engagement con Insights
- `viewed_rate` = insights vistos / insights mostrados
- `action_taken_rate` = acciones tomadas / insights vistos
- `dismiss_rate` = insights descartados / insights mostrados

### Correlación con Retención
- ¿Los usuarios que ven insights tienen mayor retención?
- ¿Los usuarios que toman acción mejoran su tasa de cumplimiento?

## Roadmap Futuro

### Fase 2: Ajuste Automático de Agenda
Cuando el usuario hace clic en "Ajustar Agenda Inteligente":
- Reorganizar tareas automáticamente según Golden Hour detectado
- Sugerir reducir carga en Cursed Day
- Mover tareas afectadas después de Keystone Habit

### Fase 3: Más Patrones
- **Streak Booster**: Combinación de tareas que aumenta rachas
- **Energy Pattern**: Correlación con niveles de energía reportados
- **Mood Correlation**: Patrones basados en estados de ánimo
- **Social Influence**: Impacto de ver progreso de otros usuarios

### Fase 4: Quantum AI (GPT Integration)
Reemplazar el algoritmo estadístico con un modelo de IA:
- Enviar datos de usuario a GPT-4
- Generar insights con lenguaje más natural y personalizado
- Detectar patrones más complejos

### Fase 5: Predictive Suggestions
No solo analizar el pasado, sino predecir el futuro:
- "Esta semana tienes 80% de probabilidad de fallar el Martes"
- "Recomendación: Mueve 2 tareas del Martes al Miércoles"

## Troubleshooting

### El job no detecta patrones
- Verificar que los usuarios tengan >10 tareas en las últimas 4 semanas
- Revisar que los metadatos (`dayOfWeek`, `timeSlot`) se estén guardando correctamente
- Reducir el umbral de confianza temporalmente (de 0.75 a 0.60)

### Los insights no aparecen en el UI
- Verificar que `viewed: false` y `dismissed: false`
- Verificar que `Pattern.isActive: true`
- Revisar console del navegador para errores de fetch

### El mensaje del insight es genérico
- Mejorar la lógica de generación de texto en `quantum-engine.ts`
- Agregar más contexto (nombres de tareas, áreas específicas)
- Futura integración con GPT-4 para mensajes más naturales

## Seguridad y Privacidad

- Los insights son **privados** (solo el usuario los ve)
- Los patrones se calculan solo con datos del propio usuario
- No se comparten datos entre usuarios
- El usuario puede descartar insights en cualquier momento

## Conclusión

Quantum Patterns transforma datos en **epifanías**. No es solo analítica, es una experiencia que genera el momento "¡Wow, esto me conoce!".

**Resultado Esperado**: Lealtad inquebrantable. El usuario piensa: "Esta app me entiende mejor que yo mismo."

---

**Última actualización**: Diciembre 2025
**Autor**: Equipo Plataforma FRUTOS
**Status**: ✅ Implementado - Listo para Testing
