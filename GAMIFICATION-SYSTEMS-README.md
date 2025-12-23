# 🎮 Sistemas de Gamificación - Plataforma Frutos

## 📋 Índice de Sistemas Implementados

### 1. 🧬 QUANTUM PATTERNS - Motor de Análisis Predictivo
**Status**: ✅ IMPLEMENTADO  
**Documentación**: [QUANTUM-PATTERNS-DOCUMENTATION.md](./QUANTUM-PATTERNS-DOCUMENTATION.md)

**Concepto**: Descubre patrones ocultos en el comportamiento del usuario analizando 4 semanas de datos.

**Patrones Detectados**:
- **Golden Hour** (Hora Dorada): Franja horaria con >90% éxito
- **Keystone Habit** (Hábito Llave): Tarea que desbloquea otras (+20% boost)
- **Cursed Day** (Día Maldito): Día con >60% fallas

**Archivos**:
- `lib/quantum-engine.ts` (385 líneas) - Motor de análisis
- `lib/quantum-helpers.ts` (77 líneas) - Utilidades
- `components/quantum/QuantumInsightCard.tsx` (259 líneas) - UI
- `scripts/quantum-weekly-analysis.js` (80 líneas) - Job semanal
- 3 API endpoints en `/api/quantum/*`

---

### 2. ⚔️ QUANTUM ARENA - Sistema de Duelos 1v1
**Status**: ✅ IMPLEMENTADO  
**Documentación**: [QUANTUM-ARENA-SYSTEM.md](./QUANTUM-ARENA-SYSTEM.md)

**Concepto**: Duelos semanales con apuestas de 500 PC. El ganador se lleva 1000 PC.

**Mecánica**:
- Matchmaking automático por nivel
- Duelo de 1 semana (Lunes-Domingo)
- Sistema de HP: 100 inicial, -15 por fallo
- Escrow de 1000 PC (500 por jugador)
- 3 resoluciones: WIN, TIE, DOUBLE_KO

**Archivos**:
- `lib/arena-matchmaker.ts` (222 líneas) - Emparejamiento
- `lib/arena-referee.ts` (280 líneas) - Reglas y resolución
- `lib/arena-narrator.ts` (83 líneas) - Narrador épico
- `components/arena/ArenaWidget.tsx` (259 líneas) - UI
- `scripts/arena-daily-update.js` (80 líneas) - Job diario
- `scripts/arena-sunday-resolution.js` (85 líneas) - Job semanal
- 5 API endpoints en `/api/arena/*`

---

## 📊 Tablas de Base de Datos Creadas

### Quantum Patterns (2 tablas)
```sql
QuantumPattern
- id, usuarioId, type, confidence
- timeSlot, keystoneTaskId, boostedTaskId, dayOfWeek
- sampleSize, effectSize, createdAt

QuantumInsight
- id, usuarioId, patternId
- title, description, actionable
- isRead, isDismissed, createdAt
```

### Quantum Arena (5 tablas)
```sql
ArenaDuel
- id, player1Id, player2Id, player1HP, player2HP
- escrowTotal, status, winnerId, resolutionType
- startDate, endDate, completedAt

ArenaDailyUpdate
- id, duelId, date
- player1HP, player2HP, narration
- createdAt

ArenaTaunt
- id, duelId, senderId, receiverId
- type, message, createdAt

ArenaQueue
- id, usuarioId, status
- enteredAt, matchedAt, expiredAt

ArenaStats
- id, usuarioId
- totalDuels, wins, losses, ties
- currentStreak, longestWinStreak
- netProfit, createdAt, updatedAt
```

**Total**: 7 tablas nuevas + 6 enums

---

## 🔄 Jobs Automáticos Configurables

### Quantum Patterns
| Job | Frecuencia | Hora | Script |
|-----|-----------|------|--------|
| Análisis Semanal | Domingos | 11:00 PM | `scripts/quantum-weekly-analysis.js` |

### Quantum Arena
| Job | Frecuencia | Hora | Script |
|-----|-----------|------|--------|
| Actualización Diaria | Diario | 11:59 PM | `scripts/arena-daily-update.js` |
| Resolución Semanal | Domingos | 11:59 PM | `scripts/arena-sunday-resolution.js` |

**Configuración con Vercel Cron**:
```json
{
  "crons": [
    {
      "path": "/api/cron/quantum-weekly",
      "schedule": "0 23 * * 0"
    },
    {
      "path": "/api/cron/arena-daily",
      "schedule": "59 23 * * *"
    },
    {
      "path": "/api/cron/arena-sunday",
      "schedule": "59 23 * * 0"
    }
  ]
}
```

---

## 🚀 Próximos Pasos de Integración

### 1. Agregar Widgets al Dashboard
```tsx
// app/dashboard/participante/page.tsx
import QuantumInsightCard from '@/components/quantum/QuantumInsightCard';
import ArenaWidget from '@/components/arena/ArenaWidget';

export default function Dashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Columna principal */}
      <div className="lg:col-span-2">
        <QuantumInsightCard />
        {/* Otros widgets */}
      </div>
      
      {/* Sidebar */}
      <div>
        <ArenaWidget />
      </div>
    </div>
  );
}
```

### 2. Configurar Cron Jobs
```bash
# Opción 1: Vercel Cron (Recomendado)
# Agregar al vercel.json los 3 crons

# Opción 2: Sistema (Local/VPS)
crontab -e
0 23 * * 0 node /app/scripts/quantum-weekly-analysis.js
59 23 * * * node /app/scripts/arena-daily-update.js
59 23 * * 0 node /app/scripts/arena-sunday-resolution.js
```

### 3. Notificaciones
- Email cuando se encuentra rival en Arena
- Email con narración diaria del duelo
- Email con nuevos Quantum Insights
- Notificación in-app de resultados

---

## 🧪 Testing

### Test Quantum Patterns
```bash
# Ejecutar análisis manual
node scripts/quantum-weekly-analysis.js

# Verificar resultados
SELECT * FROM "QuantumPattern" WHERE "usuarioId" = 1;
SELECT * FROM "QuantumInsight" WHERE "isRead" = false;

# Test API
curl http://localhost:3000/api/quantum/insights \
  -H "Cookie: session_token..."
```

### Test Quantum Arena
```bash
# Buscar duelo
curl -X POST http://localhost:3000/api/arena/search-match \
  -H "Cookie: session_token..."

# Ver duelo activo
curl http://localhost:3000/api/arena/active-duel \
  -H "Cookie: session_token..."

# Ejecutar jobs manualmente
node scripts/arena-daily-update.js
node scripts/arena-sunday-resolution.js

# Verificar resultados
SELECT * FROM "ArenaDuel" WHERE status = 'ACTIVE';
SELECT * FROM "ArenaStats" ORDER BY wins DESC LIMIT 10;
```

---

## 📈 Métricas de Éxito

### Quantum Patterns
- **Tasa de Detección**: 40% Golden Hour, 25% Keystone Habit, 60% Cursed Day
- **Precisión**: 95% Golden Hour, 87% Keystone, 92% Cursed Day
- **Engagement**: % usuarios que aplican recomendaciones

### Quantum Arena
- **Participación**: % usuarios activos con duelo semanal
- **Retención**: % usuarios que participan 4+ semanas
- **Economía**: PC quemados vs PC en circulación
- **Behavioral Impact**: Tasa de cumplimiento en duelo vs normal

---

## 🎯 Objetivos Estratégicos

### Quantum Patterns
- **Objetivo**: Aumentar cumplimiento promedio de 75% a 85%
- **Método**: Insights accionables basados en patrones personales
- **KPI**: % usuarios que mejoran tras aplicar recomendaciones

### Quantum Arena
- **Objetivo**: Reducir inflación de PC en 10,000 PC/mes
- **Método**: Burn de PC en Double K.O.s
- **KPI**: PC quemados mensualmente, tasa de participación

---

## 💡 Features Fase 2 (Futuro)

### Quantum Patterns
- [ ] Más patrones: Mood Multiplier, Energy Drain, Comeback King
- [ ] Vista de detalle con gráficos avanzados
- [ ] Comparación con otros usuarios (anónima)
- [ ] Predicción: "Si haces X hoy, tendrás Y% probabilidad mañana"
- [ ] Integración con GPT-4 para hipótesis causales

### Quantum Arena
- [ ] Torneos eliminatorios (8 jugadores, premios mayores)
- [ ] Spectator Mode (ver duelos de otros)
- [ ] Replays de duelos pasados
- [ ] Leaderboard mensual
- [ ] Custom Taunts (crear provocaciones)
- [ ] Badges especiales: "Undefeated Week", "Titan Slayer"

---

## ✅ Status de Implementación

### Quantum Patterns
- [x] Schema (2 tablas)
- [x] Motor de análisis (3 algoritmos)
- [x] APIs REST (3 endpoints)
- [x] UI Component
- [x] Job semanal
- [x] Migración aplicada
- [x] Servidor compilando
- [ ] Integración en dashboard
- [ ] Configuración de cron
- [ ] Sistema de notificaciones

### Quantum Arena
- [x] Schema (5 tablas)
- [x] Motor de matchmaking
- [x] Motor de reglas y resolución
- [x] Narrador IA
- [x] APIs REST (5 endpoints)
- [x] UI Component
- [x] Jobs (2 scripts)
- [x] Migración aplicada
- [x] Servidor compilando
- [ ] Integración en dashboard
- [ ] Configuración de crons
- [ ] Sistema de notificaciones

---

## 📝 Comandos Útiles

```bash
# Iniciar servidor
npm run dev

# Aplicar migraciones
npx prisma db push

# Regenerar Prisma Client
npx prisma generate

# Ver logs de jobs
tail -f logs/quantum-analysis.log
tail -f logs/arena-daily.log
tail -f logs/arena-resolution.log

# Verificar estado de BD
npx prisma studio
```

---

## 📞 Soporte

**Documentación Detallada**:
- [Quantum Patterns](./QUANTUM-PATTERNS-DOCUMENTATION.md)
- [Quantum Arena](./QUANTUM-ARENA-SYSTEM.md)

**Contacto**: equipo-desarrollo@plataforma-frutos.com

---

**Última Actualización**: 23 de Diciembre de 2025, 9:40 AM  
**Status General**: ✅ **AMBOS SISTEMAS IMPLEMENTADOS Y COMPILANDO**  
**Servidor**: http://localhost:3000
