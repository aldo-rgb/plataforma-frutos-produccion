# 🌟 Sistema "El Cruce" - Pre-Registro Avanzado en Tiempo Real

## Descripción
Sistema de gamificación para capturar decisiones de participantes durante entrenamientos en vivo. Cuando el trainer pregunta "¿Quién elige continuar?", los participantes se levantan, van con un Staff a escanear su gafete, y la pantalla gigante muestra una animación épica en tiempo real.

## Flujo de Usuario

```
1. Trainer: "¿Quién elige ir al siguiente nivel?"
2. Participante: Se levanta
3. Staff: Escanea gafete (QR/NFC)
4. Pantalla Gigante: ¡BOOM! Animación de cruce
5. Celular Participante: Alerta con countdown para pagar
6. Participante: Paga antes de las 11:59pm del último día
```

## Componentes

### 1. Pantalla Gigante (`/el-cruce/[sessionId]`)
- Visualización de dos zonas: "En Espera" vs "Avanzado"
- Animación con partículas cuando alguien cruza
- Contador central con estadísticas en tiempo real
- Audio cinematográfico (BOOM al cruzar)

### 2. App Staff (`/staff/scan/[sessionId]`)
- Escaneo rápido QR/NFC/Manual
- Feedback inmediato (vibración + pantalla verde)
- Sin formularios - One-tap interaction

### 3. Widget Coordinador (`ElCruceControlWidget`)
- Crear sesiones de El Cruce
- Seleccionar nivel destino (Avanzado/Liderato)
- Controlar estado (Iniciar/Pausar/Terminar)
- Links para pantalla y staff

### 4. Alerta Participante (`AdvancedPreRegistrationAlert`)
- Se activa automáticamente vía WebSocket
- Countdown en tiempo real
- Precios comparativos
- Botón directo a checkout

### 5. Checkout (`/checkout/advanced`)
- Countdown visible en header
- Múltiples métodos de pago
- Precio dinámico según deadline

## APIs

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/api/el-cruce/session` | GET/POST/PATCH/DELETE | CRUD de sesiones |
| `/api/el-cruce/scan` | POST/GET | Escaneo rápido y verificación |
| `/api/el-cruce/pre-registration` | GET/PATCH/PUT | Gestión de pre-registros |

## Modelos Prisma

```prisma
model AdvancedPreRegistration {
  id                  String
  userId              Int
  currentProductId    Int     // Básico actual
  targetProductId     Int     // Avanzado destino
  scannedByStaffId    Int
  scanMethod          ScanMethod  // QR, NFC, MANUAL
  status              PreRegistrationStatus
  promoPrice          Float
  regularPrice        Float
  promoDeadline       DateTime    // 11:59pm último día
  paidAt              DateTime?
  paymentAmount       Float?
  paymentMethod       String?
}

model CrossingSession {
  id                  String
  productId           Int
  targetLevel         ProductLevelType
  status              CrossingSessionStatus
  totalParticipants   Int
  crossedCount        Int
  soundEnabled        Boolean
  visualTheme         String
}
```

## Socket.IO Events

### Emitidos por Backend
- `participant_crossed` - Alguien escaneó (para pantalla gigante)
- `crossing_stats_update` - Actualización de contadores
- `crossing_session_status` - Cambio de estado de sesión
- `pre_registration_alert` - Alerta al celular del participante

### Escuchados por Backend
- `join_crossing_session` - Unirse a sala de sesión
- `join_crossing_staff` - Staff listo para escanear
- `join_crossing_display` - Pantalla gigante conectada

## Sonidos Necesarios

Colocar en `/public/sounds/`:
- `crossing-boom.mp3` - Efecto de cruce (cinematográfico)
- `ambient-epic.mp3` - Música de fondo (opcional)

Recomendados: Freesound.org o Mixkit.co (royalty free)

## Configuración de Precios

Los precios se toman del `SchoolProduct` destino:
- `promoPrice` → Precio promocional (hasta 11:59pm último día)
- `basePrice` → Precio regular (después del deadline)

## Variables de Entorno

```env
NEXT_PUBLIC_SOCKET_URL=http://localhost:3000  # URL del servidor Socket.IO
CRON_SECRET=tu_secret_para_cron               # Para expirar pre-registros
```

## Uso Típico

### Para Coordinador:
1. Ir al dashboard del producto Básico
2. Widget "El Cruce" → "Iniciar El Cruce"
3. Seleccionar producto destino
4. Copiar link de pantalla gigante → Proyector
5. Copiar link staff → WhatsApp al equipo
6. Dar click "Iniciar" cuando trainer lo indique

### Para Staff:
1. Abrir link en celular
2. Esperar que sesión esté "ACTIVA"
3. Escanear gafetes uno por uno
4. Pantalla verde = OK, seguir con el siguiente

### Para Participante:
1. Levantarse cuando decida
2. Ir con staff a escanear gafete
3. Ver su nombre en pantalla gigante 🎉
4. Recibir alerta en su celular
5. Pagar antes del deadline

## Troubleshooting

**La pantalla no reacciona:**
- Verificar conexión WebSocket (indicador verde)
- Click en pantalla para habilitar audio

**El escaneo falla:**
- Verificar que sesión esté "ACTIVA"
- Probar modo MANUAL con código

**No llega alerta al participante:**
- Verificar que esté logueado
- Socket debe estar conectado a `user:{userId}`

---
*Sistema desarrollado para Plataforma Frutos - Enero 2026*
