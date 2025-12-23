# 🚀 Sistema de Ascenso Automático de Mentores

## 📋 Descripción General

Sistema automático que evalúa y promociona mentores basándose en su desempeño:
- **Sesiones completadas**
- **Rating promedio de calificaciones**
- **Actualización automática de comisiones**

## 🎯 Niveles y Reglas

### 🟢 JUNIOR (Nivel Inicial)
- **Comisión Mentor**: 70%
- **Comisión Plataforma**: 30%
- Sin requisitos mínimos

### 🔵 SENIOR (Nivel Intermedio)
- **Requisitos**:
  - ✅ 20+ sesiones completadas
  - ⭐ Rating promedio ≥ 4.5
- **Comisión Mentor**: 85%
- **Comisión Plataforma**: 15%

### 🟣 MASTER (Nivel Máximo)
- **Requisitos**:
  - ✅ 50+ sesiones completadas
  - ⭐ Rating promedio ≥ 4.7
- **Comisión Mentor**: 90%
- **Comisión Plataforma**: 10%

## ⚙️ Funcionamiento Automático

### 1. Eventos que Disparan Evaluación

El sistema se ejecuta automáticamente después de:

#### a) Completar una Sesión
```typescript
// En: app/api/mentorias/sesiones/completar/route.ts
import { evaluateMentorLevel } from '@/lib/levelUpSystem';

// Después de marcar sesión como completada:
await evaluateMentorLevel(mentorId);
```

#### b) Recibir una Review
```typescript
// En: lib/mentor-rating-service.ts
import { evaluateMentorLevel } from './levelUpSystem';

// Después de crear review y actualizar ratings:
await evaluateMentorLevel(mentorId);
```

### 2. Proceso de Evaluación

```typescript
// lib/levelUpSystem.ts

export async function evaluateMentorLevel(mentorId: number) {
  // 1. Obtener estadísticas actuales
  const perfil = await prisma.perfilMentor.findUnique({
    where: { usuarioId: mentorId },
    select: {
      completedSessionsCount: true,
      ratingSum: true,
      ratingCount: true,
      nivel: true
    }
  });

  // 2. Calcular rating promedio
  const currentRating = perfil.ratingCount > 0 
    ? Number(perfil.ratingSum) / perfil.ratingCount 
    : 0;

  // 3. Determinar nivel correcto
  let newLevel = 'JUNIOR';
  
  if (sessions >= 50 && rating >= 4.7) {
    newLevel = 'MASTER';
  } else if (sessions >= 20 && rating >= 4.5) {
    newLevel = 'SENIOR';
  }

  // 4. Actualizar si hay cambio
  if (newLevel !== perfil.nivel) {
    await prisma.perfilMentor.update({
      where: { id: perfil.id },
      data: { 
        nivel: newLevel,
        comisionMentor: newCommission,
        comisionPlataforma: newPlatformCommission
      }
    });
  }
}
```

## 🔧 Integración en APIs

### API: Completar Sesión
**Endpoint**: `POST /api/mentorias/sesiones/completar`

```typescript
import { completarSesion } from '@/lib/mentor-rating-service';

// completarSesion() internamente llama a evaluateMentorLevel()
const resultado = await completarSesion(solicitudId);
```

### API: Crear Review
**Endpoint**: `POST /api/mentorias/reviews`

```typescript
import { crearReview } from '@/lib/mentor-rating-service';

// crearReview() internamente llama a evaluateMentorLevel()
const resultado = await crearReview({
  solicitudId,
  clienteId,
  perfilMentorId,
  calificacion,
  comentario
});
```

## 📊 Evaluación Masiva (Opcional)

Para evaluar todos los mentores manualmente:

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/evaluar-todos-mentores.ts
```

Este script es útil para:
- ✅ Migración inicial de datos
- ✅ Ajuste de reglas
- ✅ Auditorías periódicas
- ✅ Corrección de inconsistencias

## 📝 Logs del Sistema

El sistema genera logs automáticos:

```
📊 Evaluando Mentor 7: 25 sesiones | Rating: 4.60
🚀 ¡LEVEL UP! Mentor 7 ahora es SENIOR (Comisión Mentor: 85% | Plataforma: 15%)
```

```
📊 Evaluando Mentor 12: 55 sesiones | Rating: 4.85
🚀 ¡LEVEL UP! Mentor 12 ahora es MASTER (Comisión Mentor: 90% | Plataforma: 10%)
```

```
✅ Mentor 5 mantiene nivel JUNIOR (Cumple requisitos actuales)
```

## 🎨 Visualización en Frontend

### Dashboard del Mentor
Mostrar progreso hacia el siguiente nivel:

```tsx
import { obtenerEstadisticasMentor } from '@/lib/mentor-rating-service';

const stats = await obtenerEstadisticasMentor(perfilMentorId);

// stats incluye:
// - nivel: 'JUNIOR' | 'SENIOR' | 'MASTER'
// - sesionesCompletadas: number
// - ratingPromedio: number
// - proximoNivel: 'SENIOR' | 'MASTER' | null
// - progresoPorcentaje: number (0-100)
```

### Ejemplo de UI
```tsx
<div className="bg-slate-900 p-6 rounded-xl">
  <h3 className="text-white font-bold mb-4">Tu Progreso</h3>
  
  <div className="mb-4">
    <div className="flex justify-between text-sm mb-2">
      <span className="text-slate-400">Nivel Actual</span>
      <span className={`font-bold ${getLevelColor(stats.nivel)}`}>
        {stats.nivel}
      </span>
    </div>
    
    <div className="flex justify-between text-sm mb-2">
      <span className="text-slate-400">Sesiones Completadas</span>
      <span className="text-white font-bold">{stats.sesionesCompletadas}</span>
    </div>
    
    <div className="flex justify-between text-sm mb-2">
      <span className="text-slate-400">Rating Promedio</span>
      <span className="text-white font-bold">
        ⭐ {stats.ratingPromedio}
      </span>
    </div>
  </div>

  {stats.proximoNivel && (
    <div>
      <div className="flex justify-between text-xs text-slate-400 mb-2">
        <span>Progreso a {stats.proximoNivel}</span>
        <span>{stats.progresoPorcentaje}%</span>
      </div>
      <div className="w-full bg-slate-800 rounded-full h-2">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all"
          style={{ width: `${stats.progresoPorcentaje}%` }}
        />
      </div>
    </div>
  )}
</div>
```

## 🛠️ Modificar Reglas

Para ajustar los umbrales, editar `lib/levelUpSystem.ts`:

```typescript
const RULES = {
  SENIOR: { 
    minSessions: 20,    // Cambiar según necesidad
    minRating: 4.5      // Cambiar según necesidad
  },
  MASTER: { 
    minSessions: 50,    // Cambiar según necesidad
    minRating: 4.7      // Cambiar según necesidad
  }
};
```

Después de cambiar las reglas, ejecutar:
```bash
npx ts-node scripts/evaluar-todos-mentores.ts
```

## ⚠️ Consideraciones Importantes

1. **No bloquea el flujo principal**: La evaluación se ejecuta sin `await` en algunos casos para no afectar la experiencia del usuario

2. **Manejo de errores**: Los errores en la evaluación se registran pero no detienen el proceso principal

3. **Transacciones**: Las actualizaciones de nivel y comisiones son atómicas

4. **Logs**: Todas las evaluaciones se registran en console para auditoría

## 🔐 Seguridad

- Solo usuarios con rol `ADMINISTRADOR` o `STAFF` pueden marcar sesiones como completadas
- Las reviews solo pueden crearse para sesiones completadas
- No se permiten reviews duplicadas para la misma sesión

## 📈 Métricas Recomendadas

Monitorear en el dashboard de administración:
- Distribución de mentores por nivel
- Tiempo promedio para alcanzar SENIOR
- Tiempo promedio para alcanzar MASTER
- Mentores cercanos a promoción
- Histórico de promociones

## 🎯 Roadmap Futuro

- [ ] Envío de email al mentor cuando sube de nivel
- [ ] Notificación en la plataforma
- [ ] Badge especial en el perfil
- [ ] Registro de auditoría de cambios de nivel
- [ ] Dashboard de progreso en tiempo real
- [ ] Puntos cuánticos bonus por level up
