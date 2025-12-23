# 🎯 SISTEMA DE VISIONES - Jerarquía Organizacional

## 📋 Resumen Ejecutivo

El **Sistema de Visiones** organiza la estructura jerárquica del programa F.R.U.T.O.S. de forma escalable y controlada:

```
COORDINADOR
    └── VISIÓN (crea y administra)
        ├── GAME CHANGERS (asigna)
        │   └── PARTICIPANTES (asigna a cada Game Changer)
        └── PARTICIPANTES (vista completa)
```

---

## 🎯 Objetivos

1. **Aislamiento de Datos**: Cada coordinador solo ve su visión
2. **Delegación Controlada**: Game Changers solo ven sus participantes asignados
3. **Escalabilidad**: Múltiples visiones independientes
4. **Trazabilidad**: Registro de quién asigna a quién

---

## 🏗️ Arquitectura de Base de Datos

### Modelo Vision

```prisma
model Vision {
  id                Int                @id @default(autoincrement())
  nombre            String             // "Visión Norte 2025"
  descripcion       String?            // Descripción de la visión
  coordinadorId     Int                // Coordinador responsable
  isActive          Boolean            @default(true)
  createdAt         DateTime           @default(now())
  updatedAt         DateTime           @updatedAt
  
  Coordinador       Usuario            @relation("VisionCoordinador")
  GameChangers      VisionGameChanger[]
  Participantes     VisionParticipante[]
}
```

### Modelo VisionGameChanger

```prisma
model VisionGameChanger {
  id            Int      @id @default(autoincrement())
  visionId      Int
  gameChangerId Int      // Usuario con rol GAMECHANGER
  asignadoPorId Int      // Coordinador que lo asignó
  createdAt     DateTime @default(now())
  
  Vision        Vision   @relation(...)
  GameChanger   Usuario  @relation("GameChangerEnVision")
  AsignadoPor   Usuario  @relation("AsignadorGameChanger")
  
  @@unique([visionId, gameChangerId])
}
```

### Modelo VisionParticipante

```prisma
model VisionParticipante {
  id              Int      @id @default(autoincrement())
  visionId        Int
  participanteId  Int      // Usuario con rol PARTICIPANTE
  gameChangerId   Int      // Game Changer responsable
  asignadoPorId   Int      // Quien lo asignó (coordinador o GC)
  createdAt       DateTime @default(now())
  
  Vision          Vision   @relation(...)
  Participante    Usuario  @relation("ParticipanteEnVision")
  GameChanger     Usuario  @relation("GameChangerResponsable")
  AsignadoPor     Usuario  @relation("AsignadorParticipante")
  
  @@unique([visionId, participanteId])
}
```

---

## 🔐 Permisos y Accesos

### Coordinador
✅ Crear visiones
✅ Ver/editar su visión
✅ Asignar Game Changers a su visión
✅ Asignar Participantes a Game Changers
✅ Ver todos los participantes de su visión
✅ Reasignar participantes entre Game Changers
❌ Ver visiones de otros coordinadores

### Game Changer
✅ Ver participantes asignados a él/ella
✅ Ver datos completos de sus participantes
✅ Gestionar evidencias de sus participantes
✅ Ver progreso de sus participantes
❌ Ver participantes de otros Game Changers
❌ Asignar/reasignar participantes
❌ Ver la visión completa

### Participante
✅ Ver su propio progreso
✅ Subir evidencias
✅ Ver su Game Changer asignado
✅ Activar Protocolo Fénix (notifica a GC, Mentor, Coordinador)
❌ Ver otros participantes
❌ Cambiar de Game Changer

---

## 📡 API Endpoints

### 1. Crear Visión (Coordinador)
```
POST /api/admin/visiones/crear
Authorization: Bearer token (rol: COORDINADOR)

Body:
{
  "nombre": "Visión Norte 2025",
  "descripcion": "Programa para región norte"
}

Response:
{
  "id": 1,
  "nombre": "Visión Norte 2025",
  "coordinadorId": 5
}
```

### 2. Asignar Game Changer (Coordinador)
```
POST /api/admin/visiones/:visionId/game-changers
Authorization: Bearer token (rol: COORDINADOR)

Body:
{
  "gameChangerId": 10
}

Response:
{
  "success": true,
  "message": "Game Changer asignado a la visión"
}
```

### 3. Asignar Participante (Coordinador)
```
POST /api/admin/visiones/:visionId/participantes
Authorization: Bearer token (rol: COORDINADOR)

Body:
{
  "participanteId": 25,
  "gameChangerId": 10
}

Response:
{
  "success": true,
  "message": "Participante asignado a Game Changer"
}
```

### 4. Listar Mis Participantes (Game Changer)
```
GET /api/game-changer/mis-participantes
Authorization: Bearer token (rol: GAMECHANGER)

Response:
{
  "participantes": [
    {
      "id": 25,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "asignadoDesde": "2025-01-01",
      "progreso": {
        "tareasCompletadas": 45,
        "streakActual": 7
      }
    }
  ]
}
```

### 5. Ver Visión Completa (Coordinador)
```
GET /api/admin/visiones/:visionId
Authorization: Bearer token (rol: COORDINADOR)

Response:
{
  "id": 1,
  "nombre": "Visión Norte 2025",
  "gameChangers": [
    {
      "id": 10,
      "nombre": "Maria García",
      "participantesAsignados": 12
    }
  ],
  "totalParticipantes": 48,
  "estadisticas": {
    "activos": 45,
    "inactivos": 3
  }
}
```

---

## 🔄 Flujos de Trabajo

### Flujo 1: Crear Nueva Visión
1. Coordinador accede a `/dashboard/admin/visiones`
2. Click en "Crear Nueva Visión"
3. Ingresa nombre y descripción
4. Sistema crea visión y la asigna al coordinador
5. Coordinador puede comenzar a asignar Game Changers

### Flujo 2: Asignar Game Changer
1. Coordinador selecciona su visión
2. Click en "Agregar Game Changer"
3. Selecciona usuario con rol GAMECHANGER
4. Sistema valida que no esté ya asignado
5. Crea registro en VisionGameChanger

### Flujo 3: Asignar Participante
1. Coordinador ve lista de participantes sin asignar
2. Selecciona participante
3. Elige Game Changer de su visión
4. Sistema crea registro en VisionParticipante
5. Actualiza `gameChangerId` en Usuario (para compatibilidad)

### Flujo 4: Game Changer ve sus participantes
1. Game Changer accede a `/dashboard/game-changer`
2. Sistema consulta VisionParticipante WHERE gameChangerId = currentUserId
3. Muestra solo participantes asignados a él/ella
4. Puede ver progreso, evidencias, y estadísticas

---

## 🚀 Migración de Datos Existentes

### Script de Migración
```javascript
// scripts/migrate-to-vision-system.js

async function migrateExistingData() {
  // 1. Crear visión por defecto para cada coordinador
  const coordinadores = await prisma.usuario.findMany({
    where: { rol: 'COORDINADOR' }
  });
  
  for (const coord of coordinadores) {
    const vision = await prisma.vision.create({
      data: {
        nombre: `Visión ${coord.nombre}`,
        descripcion: 'Visión migrada automáticamente',
        coordinadorId: coord.id
      }
    });
    
    // 2. Migrar Game Changers
    const gameChangers = await prisma.usuario.findMany({
      where: { 
        rol: 'GAMECHANGER',
        coordinadorId: coord.id 
      }
    });
    
    for (const gc of gameChangers) {
      await prisma.visionGameChanger.create({
        data: {
          visionId: vision.id,
          gameChangerId: gc.id,
          asignadoPorId: coord.id
        }
      });
      
      // 3. Migrar Participantes
      const participantes = await prisma.usuario.findMany({
        where: { 
          rol: 'PARTICIPANTE',
          gameChangerId: gc.id 
        }
      });
      
      for (const part of participantes) {
        await prisma.visionParticipante.create({
          data: {
            visionId: vision.id,
            participanteId: part.id,
            gameChangerId: gc.id,
            asignadoPorId: coord.id
          }
        });
      }
    }
  }
}
```

---

## 📊 Dashboard Views

### Vista Coordinador
```
┌─────────────────────────────────────────┐
│  MIS VISIONES                           │
├─────────────────────────────────────────┤
│  📊 Visión Norte 2025                   │
│     • 5 Game Changers                   │
│     • 48 Participantes                  │
│     • 92% Tasa de actividad             │
│  [Ver Detalles]                         │
│                                         │
│  [+ Crear Nueva Visión]                 │
└─────────────────────────────────────────┘
```

### Vista Game Changer
```
┌─────────────────────────────────────────┐
│  MIS PARTICIPANTES                      │
├─────────────────────────────────────────┤
│  👤 Juan Pérez        🔥 Streak: 7      │
│     Progreso: 45/100 tareas             │
│  [Ver Perfil]                           │
│                                         │
│  👤 María López       🔥 Streak: 12     │
│     Progreso: 78/100 tareas             │
│  [Ver Perfil]                           │
└─────────────────────────────────────────┘
```

---

## 🧪 Testing

### Test 1: Aislamiento de Datos
```javascript
test('Coordinador solo ve su visión', async () => {
  const coord1 = await createUser({ rol: 'COORDINADOR' });
  const coord2 = await createUser({ rol: 'COORDINADOR' });
  
  const vision1 = await createVision({ coordinadorId: coord1.id });
  const vision2 = await createVision({ coordinadorId: coord2.id });
  
  const result = await getVisionesCoordinador(coord1.id);
  
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(vision1.id);
});
```

### Test 2: Game Changer solo ve sus participantes
```javascript
test('Game Changer solo ve participantes asignados', async () => {
  const gc1 = await createUser({ rol: 'GAMECHANGER' });
  const gc2 = await createUser({ rol: 'GAMECHANGER' });
  
  await assignParticipante({ gcId: gc1.id, participanteId: 1 });
  await assignParticipante({ gcId: gc2.id, participanteId: 2 });
  
  const result = await getParticipantesGC(gc1.id);
  
  expect(result).toHaveLength(1);
  expect(result[0].id).toBe(1);
});
```

---

## 📈 Métricas y KPIs

### Por Visión
- Total de participantes
- Tasa de actividad (últimos 7 días)
- Promedio de tareas completadas
- Game Changers activos

### Por Game Changer
- Participantes asignados
- Tasa de respuesta a SOS
- Evidencias revisadas
- Tiempo promedio de respuesta

---

## 🔮 Futuras Mejoras

1. **Transferencia de Visiones**: Permitir transferir visión a otro coordinador
2. **Co-Game Changers**: Un participante con múltiples GCs (mentoría cruzada)
3. **Visiones Temporales**: Programas con fecha de inicio/fin
4. **Reportes Automáticos**: Envío semanal de estadísticas
5. **Alertas Proactivas**: Notificar GC si participante tiene >3 días sin actividad

---

## ✅ Checklist de Implementación

- [x] Crear modelos en Prisma schema
- [x] Aplicar migración a base de datos
- [x] Actualizar scripts de backup/restore
- [ ] Crear API endpoints
- [ ] Crear middleware de autorización
- [ ] Crear vista admin de visiones
- [ ] Crear vista Game Changer
- [ ] Script de migración de datos existentes
- [ ] Tests de integración
- [ ] Documentación de usuario
