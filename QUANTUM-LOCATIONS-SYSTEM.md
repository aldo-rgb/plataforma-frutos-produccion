# 📍 QUANTUM LOCATIONS & SERVICE LADDER

Sistema phygital de validación de presencia física y gamificación de servicio mediante NFC/QR + Geolocalización.

---

## 🎯 OBJETIVO

Validar la presencia física del usuario en sucursales y gamificar su trayectoria de contribución con recompensas duales:
- **XP (Experiencia)**: Por presencia física (Tap/Check-in)
- **PC (Puntos Cuánticos)**: Por servicio con evidencia aprobada (Hacer)

**Restricción crítica**: Solo usuarios con `vision` o roles especiales (`COORDINADOR`, `MENTOR`, `GAMECHANGER`, `ADMINISTRADOR`) pueden hacer check-in.

---

## 🗄️ BASE DE DATOS

### 1. Tabla `Location`
Catálogo de sucursales/ubicaciones físicas:

```prisma
model Location {
  id              Int       @id @default(autoincrement())
  name            String    // "Sede Central", "Sede Norte"
  description     String?
  latitude        Float     // 25.6866
  longitude       Float     // -100.3161
  radiusMeter     Int       @default(50) // Radio de tolerancia
  nfcTagId        String?   @unique // ID del chip NFC físico
  qrCodeHash      String    @unique // Hash rotativo del QR
  qrRotationDate  DateTime  @default(now())
  isActive        Boolean   @default(true)
  address         String?
  city            String?
  country         String    @default("México")
  imageUrl        String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}
```

### 2. Tabla `CheckIn`
Registro de presencia física (TAP = XP):

```prisma
model CheckIn {
  id            Int      @id @default(autoincrement())
  usuarioId     Int
  locationId    Int
  checkInMethod String   // 'NFC' o 'QR'
  latitude      Float    // Ubicación real del usuario
  longitude     Float
  distance      Float    // Distancia calculada en metros
  xpGranted     Int      @default(50) // XP otorgado
  createdAt     DateTime @default(now())
  
  // Restricción: Solo 1 check-in por usuario/ubicación/día
  @@unique([usuarioId, locationId, createdAt])
}
```

**Recompensa**: +50 XP por check-in exitoso.

### 3. Tabla `UserServiceContribution`
Evidencias de servicio (HACER = PC):

```prisma
model UserServiceContribution {
  id              Int                   @id @default(autoincrement())
  usuarioId       Int
  locationId      Int
  serviceLevel    ServiceLevel
  evidenciaUrl    String   // Foto obligatoria
  description     String?
  status          ServiceApprovalStatus @default(PENDING)
  pcGranted       Int      @default(0)
  submittedAt     DateTime @default(now())
  reviewedAt      DateTime?
  reviewedBy      Int?
  feedbackMentor  String?
}

enum ServiceLevel {
  CONTRIBUCION_NIVEL_1  // 200 PC
  CONTRIBUCION_NIVEL_2  // 500 PC
  SERVICIO_FIN_SEMANA   // 800 PC
  STAFF_NIVEL_1         // 1000 PC
  STAFF_NIVEL_2         // 1500 PC
  STAFF_NIVEL_3         // 2500 PC (Game Changer)
}

enum ServiceApprovalStatus {
  PENDING
  APPROVED
  REJECTED
}
```

**Flujo**:
1. Usuario hace check-in → Sistema pregunta "¿Vienes a servir hoy?"
2. Si SÍ → Selecciona rol + sube foto (evidencia obligatoria)
3. Evidencia va a mentor/coordinador para aprobación
4. Al aprobar → Usuario recibe PC según nivel

### 4. Tabla `ServiceLadderProgress`
Progreso en la Escalera de Servicio:

```prisma
model ServiceLadderProgress {
  id                      Int      @id @default(autoincrement())
  usuarioId               Int      @unique
  nivel1Count             Int      @default(0)
  nivel2Count             Int      @default(0)
  finDeSemanaCount        Int      @default(0)
  staffNivel1Count        Int      @default(0)
  staffNivel2Count        Int      @default(0)
  staffNivel3Count        Int      @default(0)
  superNovaUnlocked       Boolean  @default(false)
  superNovaUnlockedAt     DateTime?
  totalServiceContributions Int    @default(0)
  visitedLocations        Int[]    @default([]) // IDs de locations
  explorerBadgeUnlocked   Boolean  @default(false)
  ambassadorBadgeUnlocked Boolean  @default(false)
  xpMultiplier            Float    @default(1.0)
  createdAt               DateTime @default(now())
  updatedAt               DateTime @updatedAt
}
```

---

## 🔐 SEGURIDAD Y VALIDACIONES

### Validación de Check-in (3 capas):

1. **Token válido**: El QR Hash o NFC Tag ID debe existir en DB
2. **Geolocalización**: Distancia usuario-sede < `radiusMeter`
3. **Restricción de grupo**: Usuario debe tener `vision` o rol especial
4. **Limitador temporal**: Solo 1 check-in por ubicación por día

### Fórmula Haversine
Cálculo de distancia entre coordenadas GPS:

```javascript
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radio de la Tierra en metros
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distancia en metros
}
```

---

## 🛡️ THE SERVICE LADDER

Sistema de progresión de contribución con 7 niveles:

| Nivel | PC por Contribución | Descripción |
|-------|---------------------|-------------|
| 🌱 Contribución Nivel 1 | 200 PC | Actividades básicas |
| 🌿 Contribución Nivel 2 | 500 PC | Liderazgo medio |
| 🔥 Servicio Fin de Semana | 800 PC | Inmersión total |
| ⭐ Staff Nivel 1 | 1000 PC | Operaciones |
| 🌟 Staff Nivel 2 | 1500 PC | Coordinación |
| 💫 Staff Nivel 3 | 2500 PC | Game Changer |
| 🌟 **SUPER NOVA** | **10,000 PC** | Status Legendario |

### Desbloqueo de Super Nova
**Requisito**: Al menos 1 evidencia **APROBADA** de cada nivel (1-6).

**Recompensas**:
- 10,000 PC (una vez)
- Badge "SUPER_NOVA"
- Multiplicador de XP permanente: **1.2x**

---

## 🏆 LOGROS GEOGRÁFICOS

### 1. EXPLORADOR SUPREMO 🏆
- **Condición**: Hacer check-in en **todas** las sucursales activas
- **Recompensa**: 
  - 5,000 PC
  - Badge "EXPLORADOR_SUPREMO"

### 2. EMBAJADOR DE LUZ ✨
- **Condición**: Tener al menos **1 evidencia APROBADA** en cada sucursal
- **Recompensa**:
  - 5,000 PC
  - Badge "EMBAJADOR_DE_LUZ"
  - Multiplicador de XP: **1.2x** (acumulable con Super Nova)

---

## 🔌 API ENDPOINTS

### 1. Gestión de Locations (Admin)

#### `GET /api/admin/locations`
Lista todas las ubicaciones (solo ADMIN, COORDINADOR, GAMECHANGER).

**Response**:
```json
{
  "locations": [
    {
      "id": 1,
      "name": "Sede Central",
      "latitude": 25.6866,
      "longitude": -100.3161,
      "radiusMeter": 50,
      "qrCodeHash": "a1b2c3d4...",
      "isActive": true,
      "_count": {
        "CheckIns": 45,
        "UserServiceContributions": 12
      }
    }
  ]
}
```

#### `POST /api/admin/locations`
Crea nueva ubicación (solo ADMIN).

**Request**:
```json
{
  "name": "Sede Central",
  "latitude": 25.6866,
  "longitude": -100.3161,
  "radiusMeter": 50,
  "city": "Monterrey",
  "address": "Av. Constitución 1234"
}
```

**Response**:
```json
{
  "location": { ... },
  "qrCodeHash": "a1b2c3d4..." // Para generar QR físico
}
```

#### `PATCH /api/admin/locations`
Actualiza ubicación existente.

#### `DELETE /api/admin/locations?locationId=1`
Desactiva ubicación (soft delete).

---

### 2. Check-in (Usuario)

#### `POST /api/quantum/check-in`
Realiza check-in con validación física.

**Request**:
```json
{
  "locationIdentifier": "a1b2c3d4...", // qrCodeHash o nfcTagId
  "identifierType": "QR", // 'QR' o 'NFC'
  "userLatitude": 25.6866,
  "userLongitude": -100.3161
}
```

**Response** (éxito):
```json
{
  "success": true,
  "checkIn": { ... },
  "location": {
    "id": 1,
    "name": "Sede Central",
    "distance": 23
  },
  "rewards": {
    "xpGranted": 50,
    "newLevel": 5 // Si subió de nivel
  },
  "badges": {
    "explorerBadgeUnlocked": true // Si desbloqueó
  },
  "message": "¡Check-in exitoso en Sede Central! +50 XP"
}
```

**Errores comunes**:
- `"Solo usuarios asignados a una Visión/Grupo pueden hacer check-in"` (403)
- `"Demasiado lejos de la ubicación. Distancia: 150m. Máximo permitido: 50m"` (400)
- `"Ya hiciste check-in en esta ubicación hoy"` (400)

#### `GET /api/quantum/check-in`
Historial de check-ins del usuario.

**Response**:
```json
{
  "checkIns": [ ... ],
  "stats": {
    "totalCheckIns": 23,
    "locationsVisited": 4,
    "totalLocations": 5,
    "explorerProgress": 80
  }
}
```

---

### 3. Contribuciones de Servicio (Usuario)

#### `POST /api/quantum/service-contribution`
Envía evidencia de servicio.

**Request**:
```json
{
  "locationId": 1,
  "serviceLevel": "STAFF_NIVEL_1",
  "evidenciaUrl": "https://cloudinary.com/...",
  "description": "Apoyo en setup del evento"
}
```

**Validación**: Usuario debe haber hecho check-in HOY en esa ubicación.

**Response**:
```json
{
  "success": true,
  "contribution": { ... },
  "message": "Evidencia de servicio enviada. Esperando aprobación del mentor/coordinador.",
  "potentialReward": 1000
}
```

#### `GET /api/quantum/service-contribution`
Obtiene contribuciones del usuario.

**Response**:
```json
{
  "contributions": [ ... ],
  "serviceLadder": {
    "nivel1Count": 2,
    "nivel2Count": 1,
    "staffNivel1Count": 3,
    "superNovaUnlocked": false,
    "totalServiceContributions": 6
  }
}
```

---

### 4. Validación de Servicios (Mentor)

#### `GET /api/mentor/service-validation`
Lista contribuciones pendientes.

**Permisos**: MENTOR (sus asignados), COORDINADOR+ (todas).

**Response**:
```json
{
  "contributions": [
    {
      "id": 42,
      "Usuario": {
        "id": 10,
        "nombre": "Juan Pérez",
        "vision": "Visión Alpha"
      },
      "Location": {
        "name": "Sede Central"
      },
      "serviceLevel": "STAFF_NIVEL_1",
      "evidenciaUrl": "https://...",
      "submittedAt": "2025-12-23T10:30:00Z"
    }
  ]
}
```

#### `PATCH /api/mentor/service-validation`
Aprueba o rechaza contribución.

**Request**:
```json
{
  "contributionId": 42,
  "action": "APPROVED", // 'APPROVED' o 'REJECTED'
  "feedbackMentor": "Excelente trabajo en el evento"
}
```

**Response** (aprobación):
```json
{
  "success": true,
  "message": "Contribución aprobada. Juan Pérez recibió 1000 PC.",
  "rewards": {
    "pcGranted": 1000,
    "superNovaUnlocked": true, // Si desbloqueó
    "ambassadorUnlocked": false
  }
}
```

**Lógica automática al aprobar**:
1. Otorgar PC según `serviceLevel`
2. Incrementar contador en `ServiceLadderProgress`
3. Verificar si desbloquea Super Nova
4. Verificar si desbloquea Embajador de Luz
5. Registrar en `RewardHistory`

---

## 🎨 COMPONENTES FRONTEND

### 1. `/dashboard/quantum/check-in` - QuantumCheckIn
**Para**: Todos los usuarios con `vision` o rol especial.

**Funciones**:
- Solicita geolocalización automáticamente
- Scanner QR con cámara (html5-qrcode)
- Animación de confetti al check-in exitoso
- Modal "¿Vienes a servir?" post check-in
- Formulario de evidencia de servicio con upload a Cloudinary
- Historial de check-ins recientes
- Stats: Total check-ins, ubicaciones visitadas, progreso explorador

### 2. `/dashboard/quantum/service-ladder` - ServiceLadderProgress
**Para**: Usuarios.

**Funciones**:
- Visualización de la Escalera de Servicio (6 niveles)
- Badges desbloqueados (Super Nova, Explorador, Embajador)
- Progreso hacia Super Nova (grid visual)
- Multiplicador de XP activo
- Historial de contribuciones recientes con status

### 3. `/dashboard/mentor/service-validation` - ServiceValidationPanel
**Para**: MENTOR, COORDINADOR, GAMECHANGER, ADMINISTRADOR.

**Funciones**:
- Lista de contribuciones pendientes
- Vista de evidencia fotográfica (ampliar modal)
- Campo de feedback
- Botones Aprobar/Rechazar
- Notificación de logros desbloqueados (Super Nova, Embajador)

### 4. `/dashboard/admin/locations` - LocationsManagement
**Para**: ADMINISTRADOR.

**Funciones**:
- CRUD completo de ubicaciones
- Generación de QR codes (con descarga)
- Visualización de stats por ubicación (check-ins, servicios)
- Edición de coordenadas GPS y radio de tolerancia
- Soft delete (desactivar)

---

## 📱 FLUJO DE USUARIO

### Escenario 1: Check-in Simple (Solo presencia)

1. Usuario llega a la sucursal
2. Abre `/dashboard/quantum/check-in`
3. Presiona "Escanear Código QR"
4. Apunta la cámara al código impreso
5. Sistema valida:
   - ✅ Token válido
   - ✅ Ubicación dentro del radio
   - ✅ Usuario tiene visión asignada
   - ✅ No hizo check-in hoy aquí
6. **Recompensa inmediata**: +50 XP
7. Modal pregunta: "¿Vienes a servir hoy?"
8. Usuario selecciona "Solo visita"
9. ✅ Check-in completado

### Escenario 2: Check-in + Servicio (Presencia + Evidencia)

1-6. (Igual que Escenario 1)
7. Modal: Usuario selecciona "Sí, vengo a servir"
8. Selecciona nivel: "Staff Nivel 1"
9. Sube foto (con chaleco, en acción, etc.)
10. Descripción opcional: "Apoyo en montaje del escenario"
11. Envía evidencia → Status: PENDING
12. Mentor recibe notificación
13. Mentor accede a `/dashboard/mentor/service-validation`
14. Revisa evidencia fotográfica
15. Aprueba con feedback: "Excelente actitud"
16. **Usuario recibe**: +1000 PC
17. Sistema verifica: ¿Completó todos los niveles?
18. Si SÍ → **SUPER NOVA DESBLOQUEADA**: +10,000 PC + 1.2x XP

---

## 🚀 SETUP Y DEPLOYMENT

### 1. Migración de Base de Datos

```bash
npx prisma db push
npx prisma generate
```

### 2. Seed de Locations de Ejemplo

```bash
node scripts/seed-quantum-locations.js
```

Esto creará 5 locations de ejemplo en Monterrey con QR hashes únicos.

### 3. Instalación de Dependencias

```bash
npm install html5-qrcode qrcode @types/qrcode
```

### 4. Configuración de Cloudinary

Asegúrate de tener en `.env`:

```env
NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME=tu_cloud_name
```

### 5. Generación de Códigos QR

1. Admin accede a `/dashboard/admin/locations`
2. Para cada location, presiona "Ver QR"
3. Descarga la imagen PNG
4. Imprime en tamaño A4 o mayor
5. Plastifica (resistente a humedad)
6. Coloca en lugar visible de la sucursal

**Tip**: Agregar texto: "Escanea para Check-in" + Logo de la organización

### 6. Testing

**Test de Geolocalización**:
```javascript
// En consola del navegador
navigator.geolocation.getCurrentPosition(
  (pos) => console.log(pos.coords.latitude, pos.coords.longitude)
);
```

**Test de Distancia**:
- Simula coordenadas falsas fuera del radio
- Debe rechazar con mensaje de distancia

**Test de Restricción**:
- Usuario sin `vision` → Debe rechazar 403

---

## 🔧 TROUBLESHOOTING

### Error: "Ubicación no disponible"
- **Causa**: Permisos de ubicación denegados en navegador
- **Solución**: Usuario debe permitir ubicación en configuración del navegador

### Error: "Ya hiciste check-in en esta ubicación hoy"
- **Causa**: Limitador 1/día activo
- **Solución**: Esperar al día siguiente o admin puede eliminar el registro

### QR Scanner no inicia cámara
- **Causa**: Permisos de cámara denegados o HTTPS requerido
- **Solución**: 
  - Permitir cámara en navegador
  - Usar HTTPS en producción (localhost funciona en desarrollo)

### Evidencia no se sube a Cloudinary
- **Causa**: Preset no configurado o CLOUD_NAME incorrecto
- **Solución**: Verificar credenciales y crear upload preset "frutos_evidencias" en Cloudinary

### Usuario no ve sus contribuciones pendientes
- **Causa**: Filtro de mentor (`mentorId` vs `assignedMentorId`)
- **Solución**: Ya implementado OR clause en endpoint

---

## 📊 MÉTRICAS Y REPORTES

### Queries útiles para Analytics

**Top Locations por Check-ins**:
```sql
SELECT 
  l.name,
  COUNT(c.id) as total_checkins,
  COUNT(DISTINCT c.usuarioId) as unique_users
FROM "Location" l
LEFT JOIN "CheckIn" c ON c.locationId = l.id
GROUP BY l.id
ORDER BY total_checkins DESC;
```

**Usuarios con Super Nova**:
```sql
SELECT 
  u.nombre,
  s.superNovaUnlockedAt,
  s.totalServiceContributions
FROM "ServiceLadderProgress" s
JOIN "Usuario" u ON u.id = s.usuarioId
WHERE s.superNovaUnlocked = true
ORDER BY s.superNovaUnlockedAt DESC;
```

**Contribuciones pendientes por mentor**:
```sql
SELECT 
  m.nombre as mentor,
  COUNT(*) as pendientes
FROM "UserServiceContribution" c
JOIN "Usuario" u ON u.id = c.usuarioId
JOIN "Usuario" m ON (m.id = u.mentorId OR m.id = u.assignedMentorId)
WHERE c.status = 'PENDING'
GROUP BY m.id;
```

---

## 🎯 ROADMAP FUTURO

### Fase 2: Engagement Avanzado
- [ ] Modo "Streak" de check-ins consecutivos
- [ ] Desafíos semanales de equipo por ubicación
- [ ] Ranking de Top Servidores del mes
- [ ] Integración NFC real (hardware tags)

### Fase 3: Inteligencia
- [ ] Heatmap de presencia por horario
- [ ] Predicción de asistencia con ML
- [ ] Notificaciones push al acercarse a una ubicación
- [ ] Auto-sugerencia de nivel de servicio según historial

### Fase 4: Blockchain
- [ ] NFTs de badges Super Nova
- [ ] Wallet de PC convertibles a tokens
- [ ] Smart contracts para recompensas automáticas

---

## 📞 SOPORTE

Para preguntas sobre este módulo:
- **Backend**: Revisar logs en `/api/quantum/*`
- **Frontend**: Inspeccionar console.log en navegador
- **Base de Datos**: Usar Prisma Studio (`npx prisma studio`)

**Documentación relacionada**:
- [Sistema de Gamificación](./SISTEMA-LEVEL-UP.md)
- [QPC Engine](./QPC-ENGINE-IMPLEMENTATION.md)
- [Sistema de Transacciones](./SISTEMA-TRANSACCIONES.md)

---

**Versión**: 1.0.0  
**Última actualización**: 23 de diciembre de 2025  
**Estado**: ✅ Producción Ready
