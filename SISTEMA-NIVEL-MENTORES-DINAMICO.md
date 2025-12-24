# 🎯 Sistema de Niveles Dinámicos para Mentores - ANÁLISIS Y PROPUESTA

## 📊 Estado Actual del Sistema

### ✅ YA IMPLEMENTADO

Tu plataforma **YA TIENE** un sistema completo de promoción automática de mentores basado en métricas. Aquí está lo que ya funciona:

#### 1. **Métricas que ya se rastrean** (Tabla `PerfilMentor`)
```prisma
completedSessionsCount    Int       @default(0)  // ✅ Sesiones completadas
ratingSum                 Decimal   @default(0)  // ✅ Suma de calificaciones
ratingCount               Int       @default(0)  // ✅ Cantidad de reviews
calificacionPromedio      Float     @default(0)  // ✅ Rating promedio calculado
totalSesiones             Int       @default(0)  // ✅ Total de sesiones
totalResenas              Int       @default(0)  // ✅ Total de reseñas
```

#### 2. **Sistema de Level-Up Automático** (`/lib/levelUpSystem.ts`)
```typescript
// REGLAS ACTUALES:
SENIOR: {
  minSessions: 20,    // 20 sesiones completadas
  minRating: 4.5      // Rating ≥ 4.5 estrellas
}

MASTER: {
  minSessions: 50,    // 50 sesiones completadas
  minRating: 4.7      // Rating ≥ 4.7 estrellas
}

// Se ejecuta automáticamente después de:
✅ Completar una sesión → incrementa completedSessionsCount
✅ Recibir una review → actualiza ratingSum y ratingCount
```

#### 3. **Actualización de Comisiones Automática**
```typescript
// Cuando sube de nivel, automáticamente:
JUNIOR  → 70% mentor / 30% plataforma
SENIOR  → 85% mentor / 15% plataforma
MASTER  → 90% mentor / 10% plataforma
```

#### 4. **Flujo Completo Implementado**
```mermaid
graph TD
    A[Sesión Completada] --> B[Incrementa completedSessionsCount]
    B --> C[Cliente deja review]
    C --> D[Actualiza ratingSum + ratingCount]
    D --> E[evaluateMentorLevel()]
    E --> F{¿Cumple requisitos?}
    F -->|Sí| G[LEVEL UP + Comisiones]
    F -->|No| H[Mantiene nivel]
```

---

## 🚀 PROPUESTA: Expansión con Métricas de Mentorados

### Problema Detectado
El sistema actual solo mide:
- ✅ Cantidad de sesiones (completedSessionsCount)
- ✅ Calidad del servicio (rating)

**Pero NO mide:**
- ❌ Cantidad de mentorados activos
- ❌ Calidad de evidencias HIGH QUALITY de sus mentorados
- ❌ XP total generado por sus mentorados

### Solución: Métricas de Impacto

#### Nuevos Campos en `PerfilMentor`:
```prisma
model PerfilMentor {
  // ... campos actuales ...
  
  // 📊 NUEVAS MÉTRICAS DE IMPACTO
  mentoradosActivos          Int       @default(0)    // Participantes activos bajo su mentoría
  mentoradosTotales          Int       @default(0)    // Total histórico de mentorados
  evidenciasHighQuality      Int       @default(0)    // Evidencias 85+ de sus mentorados
  xpTotalMentorados          Int       @default(0)    // XP acumulado por todos sus mentorados
  
  // 📈 MÉTRICAS DERIVADAS (calculadas)
  promedioXPPorMentorado     Float     @default(0)    // xpTotal / mentoradosActivos
  tasaRetención              Float     @default(0)    // % de mentorados que completan programa
  
  // 🎯 MÉTRICAS DE CALIDAD
  porcentajeHighQuality      Float     @default(0)    // % evidencias HIGH QUALITY vs total
}
```

---

## 🎨 Reglas Dinámicas Propuestas

### Opción A: Modelo Híbrido (Sesiones + Impacto)
```typescript
const REGLAS_NIVEL = {
  SENIOR: {
    // Requisitos ACTUALES (mantener):
    minSessions: 20,
    minRating: 4.5,
    
    // Requisitos NUEVOS (agregar):
    minMentorados: 10,              // Al menos 10 mentorados activos
    minEvidenciasHQ: 50,            // 50 evidencias HIGH QUALITY de sus mentorados
    minPromedioXP: 1000             // Promedio de 1000 XP por mentorado
  },
  
  MASTER: {
    minSessions: 50,
    minRating: 4.7,
    minMentorados: 25,
    minEvidenciasHQ: 150,
    minPromedioXP: 2000,
    minTasaRetencion: 0.8           // 80% de mentorados completan
  }
};
```

### Opción B: Sistema de Puntos (Más Flexible)
```typescript
// Cada métrica otorga puntos, total debe superar umbral

function calcularPuntosMentor(perfil: PerfilMentor): number {
  let puntos = 0;
  
  // Sesiones (peso: 3 pts por sesión)
  puntos += perfil.completedSessionsCount * 3;
  
  // Rating (peso: 20 pts por estrella)
  puntos += perfil.calificacionPromedio * 20;
  
  // Mentorados activos (peso: 5 pts por mentorado)
  puntos += perfil.mentoradosActivos * 5;
  
  // Evidencias HIGH QUALITY (peso: 2 pts por evidencia)
  puntos += perfil.evidenciasHighQuality * 2;
  
  // XP generado (peso: 1 pt por cada 100 XP)
  puntos += Math.floor(perfil.xpTotalMentorados / 100);
  
  return puntos;
}

const UMBRALES = {
  SENIOR: 500,   // 500 puntos para SENIOR
  MASTER: 1500   // 1500 puntos para MASTER
};
```

---

## 📊 Cálculo Automático de Métricas

### Función: Actualizar Métricas del Mentor
```typescript
// /lib/mentorMetricsUpdater.ts

export async function actualizarMetricasMentor(mentorId: number) {
  // 1. Contar mentorados activos
  const mentoradosActivos = await prisma.usuario.count({
    where: {
      OR: [
        { mentorId: mentorId },
        { assignedMentorId: mentorId }
      ],
      isActive: true,
      rol: 'PARTICIPANTE'
    }
  });
  
  // 2. Contar evidencias HIGH QUALITY de mentorados
  const evidenciasHQ = await prisma.evidenciaAccion.count({
    where: {
      usuario: {
        OR: [
          { mentorId: mentorId },
          { assignedMentorId: mentorId }
        ]
      },
      highQuality: true,
      estado: 'APROBADA'
    }
  });
  
  // 3. Sumar XP total de mentorados
  const mentorados = await prisma.usuario.findMany({
    where: {
      OR: [
        { mentorId: mentorId },
        { assignedMentorId: mentorId }
      ],
      isActive: true
    },
    select: {
      experienciaXP: true
    }
  });
  
  const xpTotal = mentorados.reduce((sum, m) => sum + m.experienciaXP, 0);
  const promedioXP = mentoradosActivos > 0 ? xpTotal / mentoradosActivos : 0;
  
  // 4. Actualizar perfil
  await prisma.perfilMentor.update({
    where: { usuarioId: mentorId },
    data: {
      mentoradosActivos,
      evidenciasHighQuality: evidenciasHQ,
      xpTotalMentorados: xpTotal,
      promedioXPPorMentorado: promedioXP
    }
  });
  
  // 5. Re-evaluar nivel con nuevas métricas
  await evaluateMentorLevel(mentorId);
}
```

### Triggers Automáticos:
```typescript
// Actualizar métricas del mentor cuando:

// ✅ Mentorado completa evidencia HIGH QUALITY
// En: /app/api/evidencias/[id]/review/route.ts
if (accion.highQuality) {
  const mentor = evidencia.usuario.mentorId || evidencia.usuario.assignedMentorId;
  if (mentor) {
    await actualizarMetricasMentor(mentor);
  }
}

// ✅ Mentorado gana XP
// En: /lib/rewardEngine.ts
await prisma.usuario.update({
  where: { id: usuarioId },
  data: { experienciaXP: nuevoXP }
});
// Notificar al mentor
const mentor = usuario.mentorId || usuario.assignedMentorId;
if (mentor) {
  await actualizarMetricasMentor(mentor);
}

// ✅ Se asigna nuevo mentorado
// En: /app/api/usuarios/route.ts (crear usuario PARTICIPANTE)
if (mentorId) {
  await actualizarMetricasMentor(mentorId);
}
```

---

## 🎯 Dashboard de Mentor: Nuevas Estadísticas

### Agregar Card de "Impacto":
```tsx
// En /app/dashboard/mentor/page.tsx

<div className="grid grid-cols-1 md:grid-cols-4 gap-4">
  {/* Cards existentes: Sesiones, Rating, Ingresos */}
  
  {/* NUEVA CARD: Impacto */}
  <Card>
    <CardHeader>
      <CardTitle className="flex items-center gap-2">
        <Users className="w-5 h-5 text-purple-500" />
        Impacto Total
      </CardTitle>
    </CardHeader>
    <CardContent>
      <div className="space-y-3">
        <div>
          <p className="text-2xl font-bold">{mentoradosActivos}</p>
          <p className="text-sm text-muted-foreground">Mentorados Activos</p>
        </div>
        
        <div>
          <p className="text-lg font-semibold text-yellow-500">
            {evidenciasHighQuality} ⭐
          </p>
          <p className="text-xs text-muted-foreground">
            Evidencias HIGH QUALITY
          </p>
        </div>
        
        <div>
          <p className="text-lg font-semibold text-blue-500">
            {xpTotalMentorados.toLocaleString()} XP
          </p>
          <p className="text-xs text-muted-foreground">
            XP Generado Total
          </p>
        </div>
        
        <Progress 
          value={(evidenciasHighQuality / mentoradosActivos) * 10} 
          className="h-2"
        />
        <p className="text-xs text-center text-muted-foreground">
          Promedio: {(evidenciasHighQuality / mentoradosActivos).toFixed(1)} HQ por mentorado
        </p>
      </div>
    </CardContent>
  </Card>
</div>
```

---

## 🚀 Plan de Implementación

### Fase 1: Base de Datos (30 min)
- [ ] Agregar campos nuevos a `PerfilMentor` en schema.prisma
- [ ] `npx prisma db push`
- [ ] `npx prisma generate`

### Fase 2: Cálculo de Métricas (1 hora)
- [ ] Crear `/lib/mentorMetricsUpdater.ts`
- [ ] Implementar función `actualizarMetricasMentor()`
- [ ] Crear script de migración para calcular métricas históricas

### Fase 3: Integración con Level-Up (1 hora)
- [ ] Actualizar `/lib/levelUpSystem.ts` con nuevas reglas
- [ ] Decidir: ¿Opción A (Híbrido) u Opción B (Puntos)?
- [ ] Agregar triggers en evidencias y recompensas

### Fase 4: Dashboard (1 hora)
- [ ] Actualizar `/app/dashboard/mentor/page.tsx`
- [ ] Agregar card de "Impacto"
- [ ] Mostrar progreso hacia siguiente nivel

### Fase 5: Testing (30 min)
- [ ] Probar con mentor actual (mentor@frutos.com)
- [ ] Simular evidencias HIGH QUALITY de mentorados
- [ ] Verificar level-up automático

---

## 💡 Recomendaciones

### 1. Mantén lo que ya funciona
El sistema actual de sesiones + rating es **sólido**. No lo elimines, solo **expándelo**.

### 2. Usa la Opción B (Sistema de Puntos)
Es más flexible y permite ajustar pesos sin cambiar lógica. Ejemplo:
```typescript
// Si quieres priorizar calidad sobre cantidad:
evidencias_HQ_peso = 5  // (en lugar de 2)

// Si quieres priorizar mentorados:
mentorados_activos_peso = 10  // (en lugar de 5)
```

### 3. Actualización Incremental
No necesitas calcular todo en tiempo real. Usa un **cron job diario**:
```typescript
// /lib/cron/update-mentor-metrics.ts
export async function cronActualizarMentores() {
  const mentores = await prisma.perfilMentor.findMany({
    select: { usuarioId: true }
  });
  
  for (const mentor of mentores) {
    await actualizarMetricasMentor(mentor.usuarioId);
  }
}

// Ejecutar diariamente a las 2 AM
// O después de eventos importantes (aprobar evidencia, completar sesión)
```

### 4. Badge de "High Impact Mentor"
Crea un badge visible para mentores que generen:
- +80% de evidencias HIGH QUALITY en sus mentorados
- Promedio de +2000 XP por mentorado
- Retención +90%

---

## 📈 Proyección de Impacto

### Antes (solo sesiones):
```
Mentor completa 50 sesiones → MASTER
(Pero... ¿sus mentorados mejoran?)
```

### Después (sesiones + impacto):
```
Mentor completa 50 sesiones → Revisa métricas
✅ 30 mentorados activos
✅ 200 evidencias HIGH QUALITY
✅ 60,000 XP generado (2000 promedio)
→ MASTER merecido ⭐

vs.

Mentor completa 50 sesiones → Revisa métricas
❌ 5 mentorados activos
❌ 20 evidencias HIGH QUALITY
❌ 3,000 XP generado (600 promedio)
→ Mantiene SENIOR (necesita mejorar impacto)
```

---

## ✅ Conclusión

**TU SISTEMA YA ESTÁ 80% LISTO.** Solo necesitas:

1. ✅ Agregar 4-5 campos a `PerfilMentor`
2. ✅ Crear función de cálculo de métricas (60 líneas)
3. ✅ Actualizar reglas de level-up (20 líneas)
4. ✅ Agregar card en dashboard (50 líneas)

**Tiempo total estimado: 3-4 horas** para un sistema de promoción de mentores **épicamente dinámico** que mide el impacto real sobre los mentorados.

¿Quieres que lo implemente? 🚀
