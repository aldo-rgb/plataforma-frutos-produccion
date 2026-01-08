# 🎫 Quantum Ticket System - Quick Start Guide

## ⚡ Quick Setup (5 minutos)

### 1. Verificar Base de Datos
```bash
# Asegúrate de que la BD tiene los nuevos modelos
npx prisma generate
npx prisma db push
```

### 2. Crear Datos de Prueba
```bash
# Crea 3 tickets de ejemplo
node test-ticket-system.js
```

### 3. Iniciar Servidor
```bash
npm run dev
```

### 4. Probar el Sistema
1. Login en la plataforma con el usuario de prueba: `v1@zero.com`
2. Ir a Sidebar → **Mis Tickets** (icono de ticket cyan)
3. Verás 3 tickets:
   - 🌱 BASIC (ACTIVO) - Transferible ✅
   - ⚡ ADVANCED (PENDIENTE PAGO) - No transferible ❌
   - 👑 PL (TRANSFERIDO) - Ya usado ❌

### 5. Probar Transferencia
1. Clic en **"Transferir"** del ticket BASIC
2. Ingresa: `test-recipient@example.com`
3. Clic **"Validar"**
4. Verifica datos del destinatario
5. Clic **"Confirmar Transferencia"**
6. ✨ ¡Transferencia exitosa!

---

## 🎯 URLs del Sistema

| Ruta | Descripción |
|------|-------------|
| `/dashboard/my-tickets` | Wallet de tickets |
| `/dashboard/my-tickets?filter=active` | Solo tickets activos |
| `/api/tickets/my-tickets` | GET tickets del usuario |
| `/api/tickets/validate-transfer` | POST validar transferencia |
| `/api/tickets/transfer` | POST ejecutar transferencia |

---

## 🔑 Datos de Prueba Creados

Después de ejecutar `test-ticket-system.js`:

```
📦 Organización: Zero Mty (ID: 1)
🎯 Visión: ZERO V1 (ID: 1)
👤 Usuario: v1@zero.com

🎫 3 Tickets:
   1. BASIC - ACTIVE - $5,000 (Transferible ✅)
   2. ADVANCED - PENDING - $7,000 (Pendiente pago)
   3. PL - TRANSFERRED - $10,000 (Ya transferido)

💰 Precios configurados:
   - Regular: $5,000
   - Promo: $4,000
```

---

## 🎨 Diseño Quantum

### Colores por Estado
```css
ACTIVE         → Cyan (#00F0FF) con glow
PENDING        → Amber (#F59E0B) 
TRANSFERRED    → Gray (#64748B)
EXPIRED        → Slate (#475569)
```

### Iconos de Nivel
```
🌱 BASIC     - Básico
⚡ ADVANCED  - Avanzado  
👑 PL        - Liderato
```

---

## 🚨 Reglas Importantes

### ✅ Puede Transferirse Si:
- Status = ACTIVE
- isTransferable = true
- Ahora < Inicio del evento
- Ahora < (Inicio del evento + 1 hora)

### ❌ NO Puede Transferirse Si:
- Status = PENDING_PAYMENT (pendiente de pago)
- Status = TRANSFERRED (ya transferido antes)
- Status = EXPIRED (expirado)
- isTransferable = false
- Pasó el tiempo límite (1hr después del inicio)

### 👤 Shadow Users
- Se crean automáticamente si el destinatario no existe
- Reciben email temporal
- Status = PENDIENTE
- Deben establecer su propia contraseña al registrarse

---

## 🧪 Testing Manual

### Test 1: Ver Wallet
```
1. Login como v1@zero.com
2. Ir a /dashboard/my-tickets
3. Verificar que se ven 3 tickets
4. Verificar estadísticas: Total=3, Activos=1, Pendientes=1, Transferidos=1
```

### Test 2: Filtrar Tickets
```
1. En wallet, usar filtros del menú
2. Seleccionar "Activos"
3. Verificar que solo se muestra el ticket BASIC
```

### Test 3: Transferencia Exitosa
```
1. Clic "Transferir" en ticket BASIC
2. Ingresar email: newuser@test.com
3. Completar flujo de 3 pasos
4. Verificar que ticket ahora muestra status TRANSFERRED
5. Verificar que no se puede volver a transferir
```

### Test 4: Transferencia Rechazada
```
1. Intentar transferir ticket PENDING
2. Botón "Transferir" debe estar deshabilitado
3. Tooltip debe explicar: "Solo tickets activos"
```

### Test 5: API Directa
```bash
# GET mis tickets
curl -X GET http://localhost:3000/api/tickets/my-tickets \
  -H "Cookie: next-auth.session-token=TU_TOKEN"

# POST validar transferencia
curl -X POST http://localhost:3000/api/tickets/validate-transfer \
  -H "Cookie: next-auth.session-token=TU_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"ticketId":"UUID","recipientEmail":"test@example.com"}'
```

---

## 🐛 Troubleshooting

### Error: "Ticket no encontrado"
```
✅ Verificar que ejecutaste: node test-ticket-system.js
✅ Verificar que el usuario está autenticado
✅ Verificar que el ticketId es correcto (UUID)
```

### Error: "No autorizado"
```
✅ Verificar sesión activa de NextAuth
✅ Verificar que el email del usuario coincide
✅ Revisar cookies del navegador
```

### Error: "Solo puedes transferir tickets activos"
```
✅ Verificar status del ticket en DB
✅ Verificar que isTransferable = true
✅ Verificar fecha de la visión
```

### Error: "El tiempo para transferir ha expirado"
```
✅ La visión debe tener startDate en el futuro
✅ O máximo 1 hora después de startDate
✅ Ajustar fecha de la visión si es necesario
```

---

## 📱 Navegación en la App

```
Dashboard
  └── Sidebar
       └── 🎫 Mis Tickets (nuevo enlace con glow cyan)
            └── Wallet Page
                 ├── Stats Cards (Total, Activos, Pendientes, Transferidos)
                 ├── Filtros (Todos, Activos, Pendientes, Transferidos)
                 └── Grid de Tickets
                      └── TicketCard
                           └── [Transferir] → TransferModal
                                 ├── Paso 1: Formulario
                                 ├── Paso 2: Confirmación
                                 └── Paso 3: Éxito
```

---

## 🔍 Verificar en Base de Datos

```sql
-- Ver todos los tickets
SELECT id, level, status, "isTransferable", "ownerId" 
FROM "Ticket";

-- Ver tickets activos transferibles
SELECT t.id, t.level, t.status, u.email as owner
FROM "Ticket" t
JOIN "Usuario" u ON t."ownerId" = u.id
WHERE t.status = 'ACTIVE' 
  AND t."isTransferable" = true;

-- Ver historial de transferencias
SELECT t.id, t.level, 
       owner.email as "from",
       recipient.email as "to",
       t."transferredAt"
FROM "Ticket" t
JOIN "Usuario" owner ON t."transferredTo" = owner.id
JOIN "Usuario" recipient ON t."ownerId" = recipient.id
WHERE t.status = 'TRANSFERRED';
```

---

## 📚 Archivos Clave

| Archivo | Propósito |
|---------|-----------|
| `/app/dashboard/my-tickets/page.tsx` | Wallet principal |
| `/app/dashboard/my-tickets/components/TicketCard.tsx` | Card de ticket |
| `/app/dashboard/my-tickets/components/TransferModal.tsx` | Modal de transferencia |
| `/app/api/tickets/my-tickets/route.ts` | GET tickets |
| `/app/api/tickets/validate-transfer/route.ts` | Validar transfer |
| `/app/api/tickets/transfer/route.ts` | Ejecutar transfer |
| `/messages/es.json` | Traducciones español |
| `/messages/en.json` | Traducciones inglés |
| `/components/dashboard/Sidebar.tsx` | Navegación (enlace agregado) |
| `/test-ticket-system.js` | Script de prueba |

---

## ✨ Funcionalidades Implementadas

- [x] Modelo de datos completo (Ticket, TicketPriceConfig, PaymentGatewayConfig)
- [x] Wallet UI con stats y filtros
- [x] TicketCard con estados visuales
- [x] TransferModal de 3 pasos
- [x] API GET my-tickets
- [x] API POST validate-transfer
- [x] API POST transfer
- [x] Shadow user creation
- [x] Validaciones de negocio
- [x] i18n completo (ES/EN)
- [x] Diseño Quantum
- [x] Navegación en Sidebar
- [x] Test suite completo

---

## 🎁 Bonus Features

### Sistema de Referidos
```typescript
// Usuario que invita tiene:
usuario.referralCode = "ABC123";
usuario.invitedCount = 5;

// Usuario invitado tiene:
usuario.invitedBy = 123; // ID del referrer
```

### Campos Extendidos en Signup
```typescript
{
  profession: "Ingeniero",
  birthdate: "1990-01-01",
  children: 2,
  goals: "Crecer profesionalmente"
}
```

---

## 🚀 Próximos Pasos Sugeridos

1. **Checkout**: Sistema de compra de tickets
2. **Emails**: Notificaciones de transferencias
3. **Admin**: Panel para organizaciones
4. **QR Codes**: Para check-in de eventos
5. **Mobile**: App móvil nativa

---

**¿Listo para empezar?**
```bash
node test-ticket-system.js && npm run dev
```

¡Disfruta tu nuevo sistema de tickets! 🎫✨
