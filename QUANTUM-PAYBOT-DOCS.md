# 🤖 Quantum Pay-Bot - Sistema de Automatización de Comprobantes WhatsApp

## Descripción

Quantum Pay-Bot es un sistema automatizado que gestiona los pagos por transferencia bancaria mediante WhatsApp Business API. Cuando un usuario selecciona "Pago por Transferencia", el robot envía automáticamente los datos bancarios y luego recibe/procesa los comprobantes.

## Flujo del Sistema

```
┌─────────────────────────────────────────────────────────────────┐
│  1. USUARIO SELECCIONA PAGO POR TRANSFERENCIA                   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. SE CREA PendingTransferOrder EN BD                          │
│     - Status: PENDING_PAYMENT                                    │
│     - Se genera orderReference: TRF-XXXXX                        │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  3. PAY-BOT ENVÍA WHATSAPP AUTOMÁTICO                           │
│     "¡Hola {nombre}! Tu orden {ref} está lista.                 │
│      Monto: ${amount}                                           │
│      CLABE: {clabe}                                             │
│      Responde con foto del comprobante..."                      │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌────────────────────────┐  ┌────────────────────────┐
│ A. MISMO USUARIO       │  │ B. TERCERO PAGA        │
│    Envía comprobante   │  │    (Familiar, amigo)   │
└────────────────────────┘  └────────────────────────┘
           │                           │
           ▼                           ▼
┌────────────────────────┐  ┌────────────────────────┐
│ Webhook recibe imagen  │  │ Webhook pide referencia│
│ Matchea por teléfono   │  │ Usuario envía TRF-XXX  │
│ Status: RECEIPT_RCVD   │  │ Se vincula comprobante │
└────────────────────────┘  └────────────────────────┘
                    │                   │
                    └─────────┬─────────┘
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. ADMIN REVISA EN PANEL                                       │
│     /dashboard/school-admin/auditar-transferencias              │
└─────────────────────────────────────────────────────────────────┘
                              │
                    ┌─────────┴─────────┐
                    ▼                   ▼
┌────────────────────────┐  ┌────────────────────────┐
│ ✅ APROBAR             │  │ ❌ RECHAZAR            │
│ - Crea usuario         │  │ - Notifica motivo      │
│ - Crea boleto          │  │ - Usuario puede        │
│ - WhatsApp: ¡Aprobado! │  │   reenviar otro        │
│ - Envía credenciales   │  │   comprobante          │
└────────────────────────┘  └────────────────────────┘
```

## Archivos del Sistema

### Core
| Archivo | Descripción |
|---------|-------------|
| `lib/whatsapp.ts` | Funciones de envío WhatsApp (Pay-Bot) |
| `app/api/webhooks/whatsapp/route.ts` | Webhook para recibir mensajes |
| `app/api/checkout/create-transfer-order/route.ts` | Crea orden y envía WhatsApp inicial |
| `app/api/admin/transfer-orders/route.ts` | API para aprobar/rechazar |
| `app/dashboard/school-admin/auditar-transferencias/page.tsx` | Panel de administración |

### Modelos de BD
```prisma
model PendingTransferOrder {
  id                String    @id @default(uuid())
  orderReference    String    @unique // TRF-XXXXXX
  organizationId    Int
  visionId          Int?
  amount            Float
  ticketSelection   String    // BASIC_ONLY | FULL_VISION
  status            String    // PENDING_PAYMENT | RECEIPT_RECEIVED | CONFIRMED | REJECTED | EXPIRED
  
  // Datos usuario
  userEmail         String
  userName          String
  userPhone         String?
  
  // Pay-Bot
  receiptImageUrl   String?   // Imagen del comprobante
  receiptMediaId    String?   // Media ID de WhatsApp
  receiptReceivedAt DateTime? // Cuándo llegó el comprobante
  whatsappPhone     String?   // Teléfono normalizado
  whatsappMessageId String?   // ID del mensaje enviado
  rejectionReason   String?   // Motivo de rechazo
  rejectionCount    Int       // Veces rechazado
  
  // Confirmación
  confirmedAt       DateTime?
  confirmedBy       Int?
  createdUserId     Int?
}

model OrphanReceipt {
  id            String    @id @default(uuid())
  mediaId       String    // ID del media de WhatsApp
  senderPhone   String    // Teléfono del remitente
  senderName    String?   // Nombre de WhatsApp
  processedAt   DateTime? // Cuando se vinculó
  linkedOrderId String?   // Orden vinculada
}
```

## Configuración

### Variables de Entorno
```env
# WhatsApp Business API (Meta Cloud API)
WHATSAPP_PHONE_NUMBER_ID="tu-phone-number-id"
WHATSAPP_ACCESS_TOKEN="tu-access-token"
WHATSAPP_API_VERSION="v18.0"
WHATSAPP_WEBHOOK_VERIFY_TOKEN="quantum-paybot-verify"

# Supabase Storage (para guardar comprobantes)
NEXT_PUBLIC_SUPABASE_URL="tu-supabase-url"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"
```

### Configurar Webhook en Meta
1. Ve a [Meta Business Manager](https://business.facebook.com/)
2. Tu App → WhatsApp → Configuration
3. Webhook URL: `https://tu-dominio.com/api/webhooks/whatsapp`
4. Verify Token: `quantum-paybot-verify`
5. Suscribirse a: `messages`, `message_media`

### Crear Bucket en Supabase
1. Ve a Supabase Dashboard → Storage
2. Crear bucket: `comprobantes`
3. Hacer público (o configurar policies según necesidad)

## Estados de las Órdenes

| Estado | Descripción |
|--------|-------------|
| `PENDING_PAYMENT` | Orden creada, esperando que usuario transfiera |
| `RECEIPT_RECEIVED` | Comprobante recibido, pendiente de revisión |
| `CONFIRMED` | Pago aprobado, usuario creado |
| `REJECTED` | Comprobante rechazado, puede reenviar |
| `EXPIRED` | Orden expirada (72 horas sin pago) |
| `CANCELLED` | Orden cancelada |

## Mensajes del Bot

### 1. Al crear orden
```
🤖 *Quantum Pay-Bot* 

¡Hola {nombre}! 👋

Tu orden *TRF-XXXXX* está lista.

💰 *Monto a transferir:* $X,XXX MXN
🎫 *Concepto:* Boleto Básico

📋 *Datos bancarios:*
🏦 Banco: BBVA
📝 CLABE: 0123456789012345678
👤 Beneficiario: Quantum Matter SA

*IMPORTANTE:* Cuando realices la transferencia, responde a este mensaje con una *foto del comprobante*.

⏰ Tu orden expira en 72 horas.

_Si alguien más va a pagar por ti, dile que envíe el comprobante con tu referencia: *TRF-XXXXX*_
```

### 2. Comprobante recibido
```
✅ *Comprobante Recibido*

¡Gracias {nombre}! 

Hemos recibido tu comprobante para la orden *TRF-XXXXX*.

🔍 El Director/Administrador lo está revisando.

_Tiempo estimado de revisión: 1-24 horas_
```

### 3. Pago aprobado
```
🎉 *¡PAGO APROBADO!* 🎉

¡Felicidades {nombre}! Tu pago ha sido verificado.

📋 *Orden:* TRF-XXXXX

🚀 *Ya puedes acceder:*
🔗 https://plataforma.com/login

📧 *Tu correo:* usuario@email.com
🔑 *Contraseña temporal:* FrutosXXXX!

¡Bienvenido/a a Quantum Matter! 🌟
```

### 4. Pago rechazado
```
⚠️ *Comprobante No Válido*

Hola {nombre}, revisamos tu comprobante pero no pudimos validarlo.

📝 *Motivo:* {razón}

Por favor envía un nuevo comprobante que muestre:
✅ Monto correcto
✅ CLABE de destino
✅ Fecha y hora
✅ Número de autorización
```

### 5. Teléfono no reconocido
```
🤖 *Quantum Pay-Bot*

¡Hola! Recibí tu comprobante, pero no encontré una orden asociada a este número.

Si estás pagando *por otra persona*, envía el *código de referencia* (TRF-XXXXX).
```

## Panel de Administración

Acceso: `/dashboard/school-admin/auditar-transferencias`

Características:
- Vista de órdenes por estado
- Filtro y búsqueda
- Vista previa de comprobantes
- Botones Aprobar / Rechazar
- Modal para motivo de rechazo
- Auto-refresh cada 30 segundos
- Stats en tiempo real

## Seguridad

1. **Webhook verificado**: El webhook de Meta verifica el token
2. **Rate limiting**: Las APIs tienen rate limiting configurado
3. **Permisos**: Solo SCHOOL_ADMIN y SUPER_ADMIN pueden aprobar
4. **Logs**: Todas las acciones se registran en logger

## Mantenimiento

### Limpiar órdenes expiradas
```sql
UPDATE "PendingTransferOrder"
SET status = 'EXPIRED'
WHERE status = 'PENDING_PAYMENT'
  AND "expiresAt" < NOW();
```

### Ver stats de Pay-Bot
```sql
SELECT status, COUNT(*) 
FROM "PendingTransferOrder" 
GROUP BY status;
```

## Troubleshooting

### WhatsApp no envía mensajes
1. Verificar `WHATSAPP_ACCESS_TOKEN` no expirado
2. Verificar `WHATSAPP_PHONE_NUMBER_ID` correcto
3. Revisar logs: `console.log` en `lib/whatsapp.ts`

### Comprobantes no se guardan
1. Verificar bucket `comprobantes` existe en Supabase
2. Verificar `SUPABASE_SERVICE_ROLE_KEY` tiene permisos
3. Revisar logs del webhook

### Orden no se encuentra por teléfono
1. Verificar normalización de teléfono
2. Buscar por referencia TRF-XXXXX
3. Revisar `OrphanReceipt` para comprobantes huérfanos

---

*Desarrollado para Plataforma Frutos - Quantum Matter*
