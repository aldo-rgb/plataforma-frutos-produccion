# ⚔️ QUANTUM ARENA - Sistema de Duelos 1v1

## ✅ Status: IMPLEMENTADO - Listo para Testing

**Fecha de Implementación**: 23 de Diciembre de 2025

---

## 🎯 Concepto Core

**"The Quantum Arena"** es un sistema de duelos 1v1 con apuestas en PC (Puntos Cuánticos) que aprovecha la **psicología de aversión a la pérdida** para maximizar el cumplimiento de tareas.

### Promesa al Usuario
> "Apuesta 500 PC. Enfrenta a un rival de tu nivel. El ganador se lleva todo."

### Mecánica Central
- Usuario apuesta 500 PC
- Sistema encuentra rival automáticamente (mismo nivel)
- Duelo dura 1 semana (Lunes a Domingo)
- Ambos arrancan con 100 HP
- Cada día sin 100% cumplimiento = -15 HP
- El que tenga más HP el domingo gana 1000 PC

---

## 📦 Implementación Completa

### 1. Schema de Base de Datos

**Tablas Creadas**:
- ✅ `ArenaDuel` - Registra cada duelo
- ✅ `ArenaDailyUpdate` - Actualizaciones diarias de HP
- ✅ `ArenaTaunt` - Sistema de provocaciones
- ✅ `ArenaQueue` - Cola de búsqueda de rivales
- ✅ `ArenaStats` - Estadísticas históricas del usuario

**Enums Creados**:
- ✅ `DuelStatus` (MATCHING, ACTIVE, COMPLETED, CANCELLED)
- ✅ `ResolutionType` (WIN, TIE, DOUBLE_KO)
- ✅ `QueueStatus` (SEARCHING, MATCHED, EXPIRED, CANCELLED)
- ✅ `TauntType` (5 provocaciones predefinidas)

### 2. Motor de Emparejamiento (Matchmaker)

**Archivo**: `lib/arena-matchmaker.ts`

**Funciones**:
- `searchMatch(usuarioId)` - Buscar rival
- `cancelSearch(usuarioId)` - Cancelar búsqueda
- `cleanExpiredQueues()` - Limpiar colas expiradas

**Algoritmo de Matching**:
```typescript
1. Validar fondos (>= 500 PC)
2. Buscar rival en cola con:
   - Mismo nivel (rangoActual)
   - Zona horaria similar (opcional)
3. Si encuentra rival:
   - Crear duelo
   - Descontar 500 PC a cada uno (Escrow)
   - Iniciar con 100 HP cada uno
4. Si no hay rival:
   - Agregar a cola de búsqueda
   - Expira en 24 horas
```

**Transacción Atómica (Escrow)**:
```typescript
await prisma.$transaction(async (tx) => {
  // Descontar PC
  await tx.usuario.update({
    where: { id: player1Id },
    data: { puntosGamificacion: { decrement: 500 } }
  });
  
  // Crear duelo con 1000 PC en el pozo
  const duel = await tx.arenaDuel.create({
    data: {
      player1Id,
      player2Id,
      escrowTotal: 1000,
      status: 'ACTIVE'
    }
  });
});
```

### 3. Motor de Reglas (Referee Engine)

**Archivo**: `lib/arena-referee.ts`

**Funciones Principales**:
- `updateDailyHP(duelId, date)` - Actualizar HP cada noche
- `resolveSundayDuels()` - Resolver duelos los domingos
- `resolveEarlyKO(duelId)` - K.O. anticipado (HP = 0)

**Reglas de Daño**:
```typescript
const HP_LOSS_PER_FAILURE = 15; // Por cada día sin 100% cumplimiento

// Verificar cumplimiento diario
const tasks = await prisma.taskInstance.findMany({
  where: {
    usuarioId,
    dueDate: today
  }
});

const completionRate = completedTasks / totalTasks;
if (completionRate < 1.0) {
  playerHP -= 15; // Daño
}
```

**Escenarios de Resolución**:

| Escenario | Condición | Resultado |
|-----------|-----------|-----------|
| **WIN** | Player1 HP > Player2 HP | Ganador recibe 1000 PC |
| **TIE** | Ambos >0 HP, diferencia <20 | Refund 500 PC + 50 PC bonus c/u |
| **DOUBLE_KO** | Ambos <50% cumplimiento | 1000 PC se queman (burn) |

### 4. Narrador IA (QUANTUM Caster)

**Archivo**: `lib/arena-narrator.ts`

**Función**: `generateNarration(context)`

**Ejemplos de Narrativas**:

```typescript
// Usuario va perdiendo
"⚠️ ¡CUIDADO! Rival es una máquina. Tropezaste ayer (-15 HP) y ahora lidera con 30 HP de ventaja. ¡Recupera terreno HOY o pierdes tu apuesta!"

// Usuario va ganando
"🔥 ¡DOMINACIÓN TOTAL! Rival cayó ayer (-15 HP). Su botín de PC ya casi es tuyo. Mantén la presión, quedan 3 días."

// Empate tenso
"⚡ Choque de titanes. Ambos cumplieron ayer. 85 HP vs 85 HP. El primero que parpadee, pierde."
```

**Futuro: Integración con GPT-4**
```typescript
const prompt = `Eres QUANTUM, narrador épico de duelos 1v1...
CONTEXTO: Usuario tiene ${myHP} HP, Rival tiene ${rivalHP} HP...
Genera una frase urgente y motivacional.`;

const response = await openai.chat.completions.create({
  model: "gpt-4",
  messages: [{ role: "system", content: prompt }]
});
```

### 5. APIs REST

**Endpoints Creados**:

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/arena/search-match` | POST | Buscar rival |
| `/api/arena/cancel-search` | POST | Cancelar búsqueda |
| `/api/arena/active-duel` | GET | Obtener duelo activo |
| `/api/arena/taunt` | POST | Enviar provocación |
| `/api/arena/stats` | GET | Estadísticas del usuario |

**Ejemplo de Respuesta (`/api/arena/active-duel`)**:
```json
{
  "duel": {
    "id": 123,
    "status": "ACTIVE",
    "escrowTotal": 1000,
    "daysRemaining": 3,
    "myHP": 85,
    "rivalHP": 70,
    "rival": {
      "id": 456,
      "nombre": "Carlos Pérez",
      "nivel": "CRONISTA_EXPERIMENTADO",
      "avatar": "https://..."
    },
    "history": [
      {
        "date": "2025-12-22",
        "myHP": 85,
        "rivalHP": 70,
        "narration": "🔥 Rival cayó ayer. Mantén presión."
      }
    ]
  }
}
```

### 6. Componente UI

**Archivo**: `components/arena/ArenaWidget.tsx` (304 líneas)

**Características**:
- ✅ Vista "Sin Duelo": Botón para buscar rival
- ✅ Vista "Duelo Activo": Ring completo
- ✅ Barras de HP animadas (gradiente según HP)
- ✅ Pozo de PC pulsante en el centro
- ✅ Avatares de ambos jugadores
- ✅ Narración del día
- ✅ 3 botones de provocación

**Provocaciones (Taunts)**:
- 🛡️ **No Fallo**: "¡Hoy no fallaré!"
- ⚔️ **¿Es Todo?**: "¿Eso es todo lo que tienes?"
- 🤝 **GG**: "¡Buen trabajo!"

**Estados de la Barra de HP**:
```typescript
HP > 50: Verde (dominando)
HP 25-50: Amarillo (presión)
HP < 25: Rojo (peligro)
HP = 0: Muerte súbita
```

### 7. Jobs Automáticos

**Job Diario** (`scripts/arena-daily-update.js`):
```bash
# Ejecutar cada noche a las 11:59 PM
0 23 * * * node /app/scripts/arena-daily-update.js

# Acciones:
- Calcular cumplimiento del día
- Aplicar daño (-15 HP si <100%)
- Generar narración épica
- Verificar K.O. anticipado
```

**Job Domingo** (`scripts/arena-sunday-resolution.js`):
```bash
# Ejecutar cada Domingo a las 11:59 PM
0 23 * * 0 node /app/scripts/arena-sunday-resolution.js

# Acciones:
- Calcular cumplimiento semanal
- Determinar ganador
- Distribuir PC según escenario
- Actualizar estadísticas
- Enviar notificaciones
```

---

## 🔄 Flujo Completo del Sistema

### Fase 1: Matchmaking (Lunes)
```
Usuario hace clic en "Buscar Duelo"
  ↓
Validar 500 PC en wallet
  ↓
Buscar rival en cola (mismo nivel)
  ↓
¿Rival encontrado?
  SÍ → Crear duelo + Descontar PC
  NO → Agregar a cola de búsqueda
```

### Fase 2: Duelo Activo (Lunes-Domingo)
```
Cada noche a las 11:59 PM:
  ↓
Verificar cumplimiento de ambos jugadores
  ↓
¿100% de tareas completadas?
  SÍ → Mantener HP
  NO → HP -= 15
  ↓
Generar narración épica
  ↓
¿Alguien llegó a 0 HP?
  SÍ → K.O. anticipado, resolver ahora
  NO → Continuar duelo
```

### Fase 3: Resolución (Domingo)
```
Domingo 11:59 PM:
  ↓
Calcular % cumplimiento semanal
  ↓
¿Diferencia de HP < 20 y ambos >0?
  SÍ → EMPATE: Refund 500 + 50 bonus
  ↓
¿Ambos <50% cumplimiento?
  SÍ → DOUBLE K.O.: Quemar 1000 PC
  ↓
Si no → VICTORIA: Ganador recibe 1000 PC
  ↓
Actualizar estadísticas
  ↓
Enviar notificaciones
```

---

## 📊 Economía del Sistema

### Flujos de PC

**Entrada al Duelo**:
- Usuario A: -500 PC
- Usuario B: -500 PC
- Escrow: +1000 PC

**Escenario WIN**:
- Ganador: +1000 PC (neto: +500 PC)
- Perdedor: +0 PC (neto: -500 PC)

**Escenario TIE**:
- Ambos: +550 PC (neto: +50 PC c/u)
- Sistema: -100 PC (costo del bonus)

**Escenario DOUBLE_KO**:
- Ambos: +0 PC (neto: -500 PC c/u)
- PC Quemados: 1000 PC (control de inflación)

### Balance Económico

**Objetivo**: Sistema deflacionario (quemar PC)

```typescript
// Probabilidades estimadas
- WIN: 70% de duelos → 0 PC quemados
- TIE: 20% de duelos → -100 PC por duelo
- DOUBLE_KO: 10% de duelos → -1000 PC por duelo

// Balance neto por 100 duelos:
= (70 × 0) + (20 × -100) + (10 × -1000)
= 0 - 2000 - 10000
= -12,000 PC quemados

// Control de inflación: ✅
```

---

## 🎮 Psicología del Sistema

### Aversión a la Pérdida
> "El usuario cumplirá sus tareas el viernes por la noche **no por ganar**, sino para **no perder** sus 500 puntos frente a un desconocido."

**Principios Aplicados**:
1. **Loss Aversion** (Daniel Kahneman): La gente siente más el dolor de perder que el placer de ganar
2. **Sunk Cost Fallacy**: Una vez apostado, el usuario no quiere "tirar" los 500 PC
3. **Social Pressure**: Saber que hay un rival real aumenta el compromiso
4. **Near Miss Effect**: Ver al rival fallar aumenta la motivación ("puedo ganarle")

### Triggers Emocionales

**Día 1-2**: Confianza
- Narración: "Ambos arrancan fuertes"
- Emoción: Optimismo

**Día 3-5**: Tensión
- Narración: "Rival te lleva ventaja de 15 HP"
- Emoción: Urgencia, recuperación

**Día 6-7**: Crítico
- Narración: "Último día. 85 HP vs 70 HP. No falles."
- Emoción: Presión máxima, aversión a la pérdida

---

## 🧪 Testing

### 1. Test de Matchmaking
```bash
# Crear 2 usuarios de prueba con mismo nivel
node scripts/create-test-users.js

# Usuario 1 busca match
curl -X POST http://localhost:3000/api/arena/search-match \
  -H "Cookie: session_token_user1..."

# Usuario 2 busca match (debería emparejar con Usuario 1)
curl -X POST http://localhost:3000/api/arena/search-match \
  -H "Cookie: session_token_user2..."
```

### 2. Test de HP Diario
```bash
# Ejecutar manualmente el job
node scripts/arena-daily-update.js

# Verificar en BD
SELECT * FROM "ArenaDuel" WHERE status = 'ACTIVE';
SELECT * FROM "ArenaDailyUpdate" ORDER BY date DESC LIMIT 5;
```

### 3. Test de Resolución
```bash
# Simular domingo
node scripts/arena-sunday-resolution.js

# Verificar estadísticas
SELECT * FROM "ArenaStats" WHERE usuarioId IN (1, 2);
```

---

## 📋 Próximos Pasos

### Integración Inmediata
1. **Agregar Widget al Dashboard**:
```tsx
// app/dashboard/participante/page.tsx
import ArenaWidget from '@/components/arena/ArenaWidget';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        {/* Otros widgets */}
      </div>
      <div>
        <ArenaWidget />
      </div>
    </div>
  );
}
```

2. **Configurar Cron Jobs** (Vercel Cron):
```typescript
// app/api/cron/arena-daily/route.ts
export async function GET() {
  const { updateDailyHP } = await import('@/lib/arena-referee');
  // Lógica...
}

// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/arena-daily",
      "schedule": "0 23 * * *"
    },
    {
      "path": "/api/cron/arena-sunday",
      "schedule": "0 23 * * 0"
    }
  ]
}
```

3. **Sistema de Notificaciones**:
- Email cuando se encuentra rival
- Email con narración diaria
- Email al ganar/perder

### Features Fase 2
- [ ] **Replays**: Ver historial de duelos pasados
- [ ] **Leaderboard**: Top 10 guerreros del mes
- [ ] **Torneos**: Eliminatorias con premios mayores
- [ ] **Spectator Mode**: Ver duelos de otros en vivo
- [ ] **Custom Taunts**: Crear provocaciones personalizadas
- [ ] **Badges Especiales**: "UNDEFEATED_WEEK", "TITAN_SLAYER"

---

## ✅ Checklist de Implementación

- [x] Schema de base de datos (5 tablas)
- [x] Motor de matchmaking (`arena-matchmaker.ts`)
- [x] Motor de reglas (`arena-referee.ts`)
- [x] Narrador IA (`arena-narrator.ts`)
- [x] 5 APIs REST
- [x] Componente UI (`ArenaWidget.tsx`)
- [x] 2 Jobs automáticos (diario + domingo)
- [x] Documentación completa
- [x] Migración aplicada
- [x] Servidor compilando
- [ ] Integración en dashboard
- [ ] Configuración de Cron Jobs
- [ ] Sistema de notificaciones
- [ ] Testing con usuarios reales

---

**Última Actualización**: 23 de Diciembre de 2025, 9:30 AM  
**Status**: ✅ **IMPLEMENTADO Y COMPILANDO**  
**Servidor**: http://localhost:3000
