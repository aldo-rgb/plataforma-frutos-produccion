# 🌟 Sistema de Reviews y Promoción Automática de Mentores

## 📋 Descripción General

Sistema completo para gestionar reseñas de mentorías y promoción automática de niveles basado en métricas de rendimiento.

---

## 🗄️ Base de Datos

### Campos Agregados a `PerfilMentor`

```prisma
model PerfilMentor {
  // ... campos existentes ...
  
  // 🔥 NUEVO: Sistema de ratings calculado
  completedSessionsCount Int       @default(0) // Total de sesiones completadas
  ratingSum              Decimal   @default(0) @db.Decimal(10, 2) // Suma acumulada de calificaciones
  ratingCount            Int       @default(0) // Total de calificaciones recibidas
  
  // Campos legacy (se mantienen actualizados automáticamente)
  calificacionPromedio   Float     @default(0) // Calculado: ratingSum / ratingCount
  totalResenas           Int       @default(0) // Alias de ratingCount
}
```

### Tabla `ResenasMentoria` Actualizada

```prisma
model ResenasMentoria {
  id                Int       @id @default(autoincrement())
  
  solicitudId       Int       @unique
  solicitud         SolicitudMentoria @relation(...)
  
  clienteId         Int
  cliente           Usuario   @relation(...)
  
  perfilMentorId    Int
  perfilMentor      PerfilMentor @relation(...)
  
  calificacion      Int       // 1-5 estrellas
  comentario        String?   @db.Text // ✅ Cambiado a TEXT
  
  // 🔥 NUEVO
  verificadaSesion  Boolean   @default(true) // Confirma que sesión se completó
  updatedAt         DateTime  @default(now()) @updatedAt // Tracking de actualizaciones
  
  createdAt         DateTime  @default(now())
  
  @@index([perfilMentorId]) // ✅ Índice para queries rápidos
  @@index([clienteId])
}
```

---

## 🎯 Umbrales de Promoción

### Configuración de Niveles

```typescript
const UMBRALES_NIVEL = {
  SENIOR: {
    sesionesMinimas: 20,      // 20 sesiones completadas
    ratingMinimo: 4.5,        // Promedio de 4.5/5.0 estrellas
    resenasMinimas: 10        // 10 reseñas recibidas
  },
  MASTER: {
    sesionesMinimas: 50,      // 50 sesiones completadas
    ratingMinimo: 4.7,        // Promedio de 4.7/5.0 estrellas
    resenasMinimas: 30        // 30 reseñas recibidas
  }
};
```

### Flujo de Promoción

```
JUNIOR (inicial)
  ↓
  ├─ 20 sesiones completadas
  ├─ Rating ≥ 4.5
  └─ 10+ reseñas
  ↓
SENIOR
  ↓
  ├─ 50 sesiones completadas
  ├─ Rating ≥ 4.7
  └─ 30+ reseñas
  ↓
MASTER (nivel máximo)
```

---

## 🔧 API Endpoints

### 1. POST `/api/mentorias/reviews`

**Descripción**: Crear una reseña para una sesión completada.

**Body**:
```json
{
  "solicitudId": 123,
  "perfilMentorId": 45,
  "calificacion": 5,
  "comentario": "Excelente sesión, aprendí mucho sobre estrategia de negocio."
}
```

**Response**:
```json
{
  "success": true,
  "message": "Reseña creada exitosamente",
  "data": {
    "resena": { /* datos de la reseña */ },
    "perfil": { /* perfil actualizado del mentor */ }
  }
}
```

**Lógica Automática**:
1. ✅ Crea la reseña en la DB
2. ✅ Actualiza `ratingSum`, `ratingCount`, `calificacionPromedio`
3. ✅ Evalúa si el mentor cumple umbrales para promoción
4. ✅ Si cumple, actualiza automáticamente el campo `nivel`

---

### 2. POST `/api/mentorias/sesiones/completar`

**Descripción**: Marcar una sesión como completada (solo ADMIN/STAFF).

**Body**:
```json
{
  "solicitudId": 123
}
```

**Response**:
```json
{
  "success": true,
  "message": "Sesión completada exitosamente",
  "data": {
    "solicitudId": 123
  }
}
```

**Lógica Automática**:
1. ✅ Cambia estado de `SolicitudMentoria` a `COMPLETADA`
2. ✅ Incrementa `completedSessionsCount` del mentor
3. ✅ Incrementa `totalSesiones` del mentor
4. ✅ Evalúa promoción automática

---

### 3. GET `/api/mentorias/estadisticas/[id]`

**Descripción**: Obtener estadísticas completas de un mentor.

**Response**:
```json
{
  "success": true,
  "data": {
    "nivel": "SENIOR",
    "ratingPromedio": "4.8",
    "totalResenas": 25,
    "sesionesCompletadas": 42,
    "totalSesiones": 45,
    "proximoNivel": "MASTER",
    "progresoPorcentaje": 78,
    "resenas": [ /* últimas 10 reseñas */ ],
    "umbralesProximoNivel": {
      "sesionesMinimas": 50,
      "ratingMinimo": 4.7,
      "resenasMinimas": 30
    }
  }
}
```

---

## 🤖 Cron Job: Evaluación Masiva

### Script: `scripts/evaluar-promociones-mentores.ts`

**Ejecución Manual**:
```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/evaluar-promociones-mentores.ts
```

**Configuración en Crontab** (Ejecutar diariamente a las 2 AM):
```bash
0 2 * * * cd /path/to/app && npx ts-node scripts/evaluar-promociones-mentores.ts >> /var/log/promociones-mentores.log 2>&1
```

**Funcionalidad**:
- Evalúa todos los mentores activos
- Verifica si cumplen umbrales para promoción
- Actualiza niveles automáticamente
- Registra todas las promociones en log

**Output de Ejemplo**:
```
🚀 Iniciando evaluación masiva de promociones de mentores...

📊 Umbrales configurados:
  SENIOR: { sesionesMinimas: 20, ratingMinimo: 4.5, resenasMinimas: 10 }
  MASTER: { sesionesMinimas: 50, ratingMinimo: 4.7, resenasMinimas: 30 }

✅ EVALUACIÓN COMPLETADA
   Total evaluados: 15
   Promociones realizadas: 2

🎉 PROMOCIONES REALIZADAS:
   - Mentor ID 5 (Usuario 42)
     JUNIOR → SENIOR
     Métricas: { sesionesCompletadas: 22, ratingPromedio: 4.6, totalResenas: 12 }
   
   - Mentor ID 8 (Usuario 67)
     SENIOR → MASTER
     Métricas: { sesionesCompletadas: 52, ratingPromedio: 4.9, totalResenas: 35 }
```

---

## 🎨 Componentes Frontend

### 1. `FormularioReview.tsx`

**Uso**:
```tsx
import FormularioReview from '@/components/mentorias/FormularioReview';

<FormularioReview
  solicitudId={123}
  perfilMentorId={45}
  nombreMentor="Roberto Martínez"
  onSuccess={() => {
    // Callback después de enviar reseña
    console.log('Reseña enviada!');
    router.refresh();
  }}
  onCancel={() => {
    // Cerrar modal
    setShowModal(false);
  }}
/>
```

**Features**:
- ⭐ Sistema de 5 estrellas interactivo (hover effect)
- 💬 Textarea para comentario (max 500 caracteres)
- 🔒 Validación de calificación obligatoria
- ⏳ Loading states con spinner
- ✅ Callback de éxito personalizable
- 🎨 UI moderna con Tailwind CSS

---

### 2. `ProgresoPromocion.tsx`

**Uso**:
```tsx
import ProgresoPromocion from '@/components/mentorias/ProgresoPromocion';

<ProgresoPromocion perfilMentorId={45} />
```

**Features**:
- 📊 4 cards de estadísticas (Rating, Sesiones, Total, Progreso)
- 📈 Barra de progreso hacia próximo nivel
- ✅ Checklist de requisitos con colores dinámicos
- 💬 Últimas 3 reseñas con avatares
- 🏆 Badge de "Nivel Máximo Alcanzado" para MASTER
- 🎨 Diseño responsive

---

## 📊 Lógica de Cálculo

### Rating Promedio

```typescript
// Al crear una reseña:
const nuevoRatingSum = Number(perfilMentor.ratingSum) + calificacion;
const nuevoRatingCount = perfilMentor.ratingCount + 1;
const nuevoRatingPromedio = nuevoRatingSum / nuevoRatingCount;

// Actualizar en DB:
await prisma.perfilMentor.update({
  where: { id: perfilMentorId },
  data: {
    ratingSum: nuevoRatingSum,
    ratingCount: nuevoRatingCount,
    calificacionPromedio: nuevoRatingPromedio
  }
});
```

### Evaluación de Promoción

```typescript
// Obtener perfil actual
const perfil = await prisma.perfilMentor.findUnique({ where: { id } });

// Evaluar MASTER
if (
  perfil.completedSessionsCount >= 50 &&
  perfil.calificacionPromedio >= 4.7 &&
  perfil.ratingCount >= 30
) {
  await prisma.perfilMentor.update({
    where: { id },
    data: { nivel: 'MASTER' }
  });
  console.log('🎉 Promoción a MASTER!');
}

// Evaluar SENIOR
else if (
  perfil.nivel === 'JUNIOR' &&
  perfil.completedSessionsCount >= 20 &&
  perfil.calificacionPromedio >= 4.5 &&
  perfil.ratingCount >= 10
) {
  await prisma.perfilMentor.update({
    where: { id },
    data: { nivel: 'SENIOR' }
  });
  console.log('🎉 Promoción a SENIOR!');
}
```

---

## 🔄 Flujo de Usuario Completo

### 1. Cliente Solicita Mentoría
```
1. Cliente va a /dashboard/mentorias
2. Ve catálogo de mentores (con nivel y rating)
3. Click "Ver Perfil Completo"
4. Selecciona servicio (Asesoría / Mentoría / Consultoría)
5. Completa formulario de solicitud
6. Estado: PENDIENTE
```

### 2. Admin Aprueba y Completa Sesión
```
1. Admin va a panel de gestión de solicitudes
2. Cambia estado a ACEPTADA
3. Después de la sesión, marca como COMPLETADA
4. POST /api/mentorias/sesiones/completar
5. Sistema actualiza completedSessionsCount
6. Sistema evalúa promoción automática
```

### 3. Cliente Deja Review
```
1. Cliente recibe notificación de sesión completada
2. Se muestra FormularioReview
3. Cliente selecciona estrellas (1-5)
4. Escribe comentario (opcional)
5. Click "Enviar Reseña"
6. POST /api/mentorias/reviews
7. Sistema actualiza ratingSum, ratingCount, calificacionPromedio
8. Sistema evalúa promoción automática
9. Si cumple umbrales → nivel actualizado automáticamente
```

### 4. Mentor Ve su Progreso
```
1. Mentor va a su dashboard
2. Ve componente ProgresoPromocion
3. Observa:
   - Nivel actual (JUNIOR/SENIOR/MASTER)
   - Rating promedio (4.8/5.0)
   - Total de sesiones completadas
   - Barra de progreso hacia próximo nivel
   - Requisitos pendientes con checklist
   - Últimas reseñas recibidas
```

---

## 🧪 Testing Manual

### 1. Crear Review
```bash
curl -X POST http://localhost:3000/api/mentorias/reviews \
  -H "Content-Type: application/json" \
  -d '{
    "solicitudId": 1,
    "perfilMentorId": 1,
    "calificacion": 5,
    "comentario": "Excelente mentor!"
  }'
```

### 2. Completar Sesión
```bash
curl -X POST http://localhost:3000/api/mentorias/sesiones/completar \
  -H "Content-Type: application/json" \
  -d '{
    "solicitudId": 1
  }'
```

### 3. Obtener Estadísticas
```bash
curl http://localhost:3000/api/mentorias/estadisticas/1
```

### 4. Evaluar Promociones Masivas
```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/evaluar-promociones-mentores.ts
```

---

## 📝 Migración Aplicada

**Archivo**: `20251215132831_add_mentor_rating_system/migration.sql`

```sql
-- Agregar campos de tracking
ALTER TABLE "PerfilMentor" ADD COLUMN "completedSessionsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PerfilMentor" ADD COLUMN "ratingSum" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "PerfilMentor" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- Actualizar ResenasMentoria
ALTER TABLE "ResenasMentoria" ADD COLUMN "verificadaSesion" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ResenasMentoria" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
ALTER TABLE "ResenasMentoria" ALTER COLUMN "comentario" TYPE TEXT;

-- Índices para performance
CREATE INDEX "ResenasMentoria_perfilMentorId_idx" ON "ResenasMentoria"("perfilMentorId");
CREATE INDEX "ResenasMentoria_clienteId_idx" ON "ResenasMentoria"("clienteId");
```

**Estado**: ✅ Aplicada exitosamente

---

## 🎯 Checklist de Implementación

### Base de Datos
- ✅ Agregar campos `completedSessionsCount`, `ratingSum`, `ratingCount` a `PerfilMentor`
- ✅ Actualizar modelo `ResenasMentoria` (verificadaSesion, updatedAt)
- ✅ Crear migración SQL
- ✅ Aplicar migración con `npx prisma migrate deploy`
- ✅ Regenerar Prisma Client

### Backend (Servicios)
- ✅ Crear `lib/mentor-rating-service.ts` con funciones:
  - `crearReview()`
  - `completarSesion()`
  - `evaluarPromocionNivel()`
  - `obtenerEstadisticasMentor()`
  - `evaluarPromocionesTodosLosMentores()`

### Backend (APIs)
- ✅ `POST /api/mentorias/reviews` - Crear reseña
- ✅ `POST /api/mentorias/sesiones/completar` - Completar sesión
- ✅ `GET /api/mentorias/estadisticas/[id]` - Estadísticas de mentor

### Frontend (Componentes)
- ✅ `FormularioReview.tsx` - UI para dejar reseñas
- ✅ `ProgresoPromocion.tsx` - Dashboard de progreso del mentor

### Automatización
- ✅ `scripts/evaluar-promociones-mentores.ts` - Cron job para evaluación masiva
- ⏳ Configurar crontab en servidor (pendiente deploy)

### Documentación
- ✅ `SISTEMA-REVIEWS-PROMOCIONES.md` - Documentación completa

---

## 🚀 Próximos Pasos

1. **Testing en Staging**:
   - Crear 5-10 sesiones de prueba
   - Generar reviews con diferentes calificaciones
   - Verificar que promociones se disparen correctamente

2. **Notificaciones**:
   - Email al mentor cuando sea promovido
   - Notificación in-app de nueva reseña recibida
   - Badge "¡Nuevo nivel!" en dashboard

3. **Analytics**:
   - Dashboard admin con métricas de mentores
   - Gráficas de evolución de ratings
   - Reporte mensual de promociones

4. **Gamificación**:
   - Badges especiales (ej. "100 sesiones", "5.0 rating perfecto")
   - Leaderboard de mentores top-rated
   - Sistema de recompensas por milestone

---

## 📞 Soporte

Para preguntas sobre el sistema de reviews y promociones, contactar al equipo de desarrollo.

**Documentación creada**: 15 de diciembre de 2025
