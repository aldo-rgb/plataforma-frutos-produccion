# MANUAL DEL PROGRAMADOR - QUANTUM POS

## Sistema de Cobro con Terminal Mercado Pago Point

**Versión:** 1.0  
**Fecha:** Febrero 2026  
**Autor:** Sistema Frutos

---

## 1. DESCRIPCIÓN GENERAL

QUANTUM POS es un sistema integrado que permite a los School Admins cobrar a participantes usando terminales físicas de Mercado Pago Point. El sistema detecta automáticamente el nivel de progreso del participante y genera un ticket correspondiente al completarse el pago.

### Características Principales:
- ✅ Integración con Mercado Pago Point (Payment Intents API)
- ✅ Detección automática de nivel del participante (BASIC → ADVANCED → PL)
- ✅ Generación automática de tickets al confirmar pago
- ✅ Webhook para recibir notificaciones en tiempo real
- ✅ UI integrada en Treasury Quick Widget
- ✅ Modo dual: Efectivo (QR) y Tarjeta (POS)

---

## 2. ARQUITECTURA

### 2.1 Archivos del Sistema

```
/app/api/treasury/
├── participant-info/
│   └── route.ts           # GET: Info de nivel y progresión del participante
├── quantum-pos/
│   ├── route.ts           # GET: Listar devices, POST: Crear payment intent, DELETE: Cancelar
│   └── status/
│       └── route.ts       # GET: Verificar estado de transacción
│
/app/api/webhooks/
└── mercadopago-point/
    └── route.ts           # POST: Webhook para notificaciones de MP

/components/dashboard/
└── TreasuryQuickWidget.tsx  # UI con toggle efectivo/tarjeta

/prisma/
└── schema.prisma          # Modelo QuantumPOSTransaction
```

### 2.2 Flujo de Datos

```
┌──────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│   School Admin   │────▶│   Treasury       │────▶│   API            │
│   (Frontend)     │     │   Widget         │     │   quantum-pos    │
└──────────────────┘     └──────────────────┘     └──────────────────┘
                                                          │
                         ┌──────────────────┐             │
                         │   Terminal POS   │◀────────────┘
                         │   (Físico)       │   Payment Intent
                         └──────────────────┘
                                 │
                                 ▼ Cliente paga
                         ┌──────────────────┐
                         │   Mercado Pago   │
                         │   (Procesador)   │
                         └──────────────────┘
                                 │
                                 ▼ Webhook
                         ┌──────────────────┐     ┌──────────────────┐
                         │   Webhook API    │────▶│   Base de Datos  │
                         │   mercadopago    │     │   + Ticket       │
                         └──────────────────┘     └──────────────────┘
```

---

## 3. MODELO DE DATOS

### 3.1 QuantumPOSTransaction

```prisma
model QuantumPOSTransaction {
  id              Int                @id @default(autoincrement())
  paymentIntentId String             @unique
  deviceId        String
  amount          Decimal            @db.Decimal(10, 2)
  status          QuantumPOSStatus   @default(PENDING)
  
  // Contexto del cobro
  participantId   Int?
  participant     Usuario?           @relation(fields: [participantId], references: [id])
  visionId        Int?
  vision          Vision?            @relation(fields: [visionId], references: [id])
  ticketLevel     VisionLevel?
  
  // Referencia MP
  mpPaymentId     String?
  mpStatus        String?
  mpStatusDetail  String?
  
  // Resultado
  ticketId        Int?               @unique
  ticket          Ticket?            @relation(fields: [ticketId], references: [id])
  
  // Metadata
  description     String?
  createdBy       Int
  organizationId  Int
  
  createdAt       DateTime           @default(now())
  updatedAt       DateTime           @updatedAt
}

enum QuantumPOSStatus {
  PENDING
  PROCESSING
  APPROVED
  REJECTED
  CANCELLED
  ERROR
}
```

---

## 4. APIs

### 4.1 GET /api/treasury/participant-info

Obtiene información del participante incluyendo su nivel actual y el siguiente nivel a pagar.

**Query Parameters:**
- `participantId` (required): ID del participante

**Response:**
```json
{
  "success": true,
  "participant": {
    "id": 123,
    "nombre": "Juan Pérez",
    "email": "juan@example.com"
  },
  "progression": {
    "completedLevels": ["BASIC"],
    "currentLevel": "BASIC",
    "currentLevelName": "Básico",
    "nextLevel": "ADVANCED",
    "nextLevelName": "Avanzado",
    "hasAllLevels": false
  },
  "payment": {
    "pendingTicket": { "id": 456, "codigo": "TKT-123", "saldoPendiente": 500 },
    "pendingAmount": 500
  }
}
```

### 4.2 GET /api/treasury/quantum-pos

Lista dispositivos POS vinculados.

**Response:**
```json
{
  "success": true,
  "configured": true,
  "devices": [
    { "id": "DEVICE_ID_123", "name": "Terminal Principal" }
  ]
}
```

### 4.3 POST /api/treasury/quantum-pos

Crea un Payment Intent y lo envía al dispositivo POS.

**Body:**
```json
{
  "deviceId": "DEVICE_ID_123",
  "amount": 1500.00,
  "description": "Pago Avanzado - Juan Pérez",
  "participantId": 123,
  "visionId": 45,
  "ticketLevel": "ADVANCED"
}
```

**Response:**
```json
{
  "success": true,
  "paymentIntent": {
    "id": "PI_12345",
    "reference": "QP-1707123456-ABC123"
  },
  "transaction": {
    "id": 789
  }
}
```

### 4.4 DELETE /api/treasury/quantum-pos

Cancela un Payment Intent activo.

**Query Parameters:**
- `deviceId`: ID del dispositivo
- `paymentIntentId`: ID del Payment Intent a cancelar

### 4.5 GET /api/treasury/quantum-pos/status

Verifica el estado de una transacción POS.

**Query Parameters:**
- `transactionId` o `paymentIntentId`

---

## 5. WEBHOOK

### 5.1 Endpoint: POST /api/webhooks/mercadopago-point

Recibe notificaciones de Mercado Pago cuando:
- Se procesa un pago (`point_integration_wh`)
- Se actualiza el estado de un pago (`payment`)

### 5.2 Flujo del Webhook

```
1. MP envía notificación → Webhook recibe
2. Verifica firma HMAC SHA256
3. Busca transacción por paymentIntentId o mpPaymentId
4. Si pago aprobado:
   a. Actualiza status a APPROVED
   b. Si hay participante + visión + nivel:
      - Genera ticket automáticamente
      - Vincula ticket a transacción
5. Si pago rechazado:
   a. Actualiza status a REJECTED
```

### 5.3 Verificación de Firma

```typescript
const signature = req.headers.get('x-signature');
const requestId = req.headers.get('x-request-id');

// Formato: ts=TIMESTAMP,v1=HASH
const parts = signature.split(',');
const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];

// Crear string para verificar
const signString = `id:${data.data.id};request-id:${requestId};ts:${ts};`;
const hmac = crypto.createHmac('sha256', WEBHOOK_SECRET);
hmac.update(signString);
const calculated = hmac.digest('hex');

if (calculated !== v1) {
  // Firma inválida
}
```

---

## 6. CONFIGURACIÓN

### 6.1 Variables de Entorno

```env
# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=APP_USR-xxxxx
MERCADO_PAGO_WEBHOOK_SECRET=xxxxx

# Opcional: ID de dispositivo por defecto
MERCADO_PAGO_DEVICE_ID=xxxxx
```

### 6.2 Configurar Webhook en Mercado Pago

1. Ir a [Mercado Pago Developers](https://www.mercadopago.com.mx/developers)
2. Tu aplicación → Webhooks
3. Agregar URL: `https://tu-dominio.com/api/webhooks/mercadopago-point`
4. Eventos: `point_integration_wh`, `payment`
5. Copiar el Secret y agregarlo a `.env`

---

## 7. PROGRESIÓN DE NIVELES

### 7.1 Niveles Disponibles

| Nivel | Enum | Descripción |
|-------|------|-------------|
| Básico | `BASIC` | Primer nivel, entrada |
| Avanzado | `ADVANCED` | Segundo nivel |
| PL | `PL` | Nivel avanzado/líder |

### 7.2 Lógica de Progresión

```typescript
// Determinar siguiente nivel
function getNextLevel(completedLevels: string[]): VisionLevel | null {
  const levelOrder = ['BASIC', 'ADVANCED', 'PL'];
  
  for (const level of levelOrder) {
    if (!completedLevels.includes(level)) {
      return level as VisionLevel;
    }
  }
  
  return null; // Ya completó todos los niveles
}
```

### 7.3 Detección de Niveles Completados

Un nivel se considera completado si existe un ticket con:
- `usuarioId` = participante
- `visionId` = visión actual
- `level` = nivel
- `status` = 'PAGADO' o 'ACTIVO'

---

## 8. COMPONENTE UI

### 8.1 Estados del Widget

```typescript
// Modo de pago
const [paymentMode, setPaymentMode] = useState<'cash' | 'card'>('cash');

// Dispositivos POS
const [posDevices, setPosDevices] = useState<POSDevice[]>([]);
const [selectedDevice, setSelectedDevice] = useState<string>('');
const [posConfigured, setPosConfigured] = useState<boolean | null>(null);

// Estado de transacción
const [loadingPOS, setLoadingPOS] = useState(false);
const [activePOSTransaction, setActivePOSTransaction] = useState<POSTransaction | null>(null);

// Info del participante
const [participantInfo, setParticipantInfo] = useState<ParticipantInfo | null>(null);
```

### 8.2 Flujo de UI

1. Usuario selecciona modo **Tarjeta**
2. Selecciona Visión y Participante
3. Sistema carga `participantInfo` automáticamente
4. Muestra progreso del participante (niveles completados)
5. Auto-llena monto si hay saldo pendiente
6. Usuario hace clic en **Enviar a Terminal POS**
7. Aparece indicador de "Esperando pago..."
8. Cliente paga en terminal física
9. Webhook recibe notificación
10. Sistema actualiza estado y genera ticket

---

## 9. TESTING

### 9.1 Probar API de Participant Info

```bash
curl -X GET "http://localhost:3000/api/treasury/participant-info?participantId=123" \
  -H "Cookie: next-auth.session-token=xxx"
```

### 9.2 Probar Creación de Payment Intent

```bash
curl -X POST "http://localhost:3000/api/treasury/quantum-pos" \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=xxx" \
  -d '{
    "deviceId": "DEVICE123",
    "amount": 1500,
    "description": "Test",
    "participantId": 123
  }'
```

### 9.3 Simular Webhook

```bash
curl -X POST "http://localhost:3000/api/webhooks/mercadopago-point" \
  -H "Content-Type: application/json" \
  -H "x-signature: ts=123,v1=xxx" \
  -H "x-request-id: test-123" \
  -d '{
    "action": "payment.updated",
    "type": "payment",
    "data": { "id": "123456" }
  }'
```

---

## 10. ERRORES COMUNES

### 10.1 "Terminal POS no configurada"

**Causa:** No hay `MERCADO_PAGO_ACCESS_TOKEN` o no hay dispositivos vinculados.

**Solución:**
1. Verificar variable de entorno
2. Verificar que la cuenta MP tiene dispositivos Point vinculados

### 10.2 "Error al crear Payment Intent"

**Causa:** El dispositivo está ocupado o no disponible.

**Solución:**
1. Verificar que el dispositivo está encendido
2. Verificar conexión a internet del dispositivo
3. Cancelar cualquier operación pendiente en el dispositivo

### 10.3 Ticket no se genera

**Causa:** Falta `participantId`, `visionId`, o `ticketLevel` en la transacción.

**Solución:** Asegurar que al crear el Payment Intent se envían todos los datos necesarios.

---

## 11. MIGRACIÓN DE BASE DE DATOS

Para agregar el modelo `QuantumPOSTransaction`:

```bash
npx prisma db push
# o
npx prisma migrate dev --name add_quantum_pos
```

**Nota:** El modelo ya incluye relaciones opcionales a `Usuario`, `Vision`, y `Ticket`.

---

## 12. ROADMAP FUTURO

- [ ] Polling de estado en UI (cada 5 segundos mientras hay transacción activa)
- [ ] Historial de transacciones POS
- [ ] Soporte para devoluciones
- [ ] Notificaciones push al admin cuando se complete pago
- [ ] Múltiples terminales por organización
- [ ] Reportes de cobros por terminal

---

## 13. SOPORTE

Para dudas técnicas sobre este sistema:
1. Revisar logs de consola del navegador
2. Revisar logs del servidor (webhooks)
3. Verificar estado de transacciones en tabla `QuantumPOSTransaction`
4. Consultar documentación de Mercado Pago Point

---

*Documento generado automáticamente. Última actualización: Febrero 2026*
