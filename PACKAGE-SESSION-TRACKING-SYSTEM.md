# 💳 Sistema de Tracking de Sesiones - Paquetes de Mentoría

## ✅ Implementación Completada

### 🎯 Objetivo
Implementar sistema completo de tracking de sesiones consumidas de paquetes de 18 sesiones, incluyendo:
- ✅ Validación de créditos disponibles antes de agendar
- ✅ Consumo automático de créditos al agendar
- ✅ Reembolso de créditos al cancelar
- ✅ Prevención de doble comisión en sesiones de paquetes
- ✅ API para consultar paquetes activos

---

## 🗄️ Cambios en Base de Datos

### 1. **Nuevo Campo en `CallBooking`**

```prisma
model CallBooking {
  // ... campos existentes
  packageOrderId  String?  // 📦 Vincula sesión con paquete
  
  // Relación
  MentorPackageOrder MentorPackageOrder? @relation(fields: [packageOrderId], references: [id], onDelete: SetNull)
  
  // Índice
  @@index([packageOrderId])
}
```

**Propósito:**
- Vincular cada sesión agendada con el paquete original
- Identificar sesiones pagadas vs gratuitas (disciplina)
- Prevenir doble comisión

---

### 2. **Nueva Tabla `PackageSessionCredits`**

```prisma
model PackageSessionCredits {
  id                String    @id @default(cuid())
  packageOrderId    String    @unique // 1:1 con MentorPackageOrder
  totalSessions     Int       // Total comprado (18)
  usedSessions      Int       @default(0) // Consumidas
  remainingSessions Int       // Disponibles
  expiresAt         DateTime? // Expiración opcional
  isActive          Boolean   @default(true)
  createdAt         DateTime  @default(now())
  updatedAt         DateTime  @updatedAt
  
  MentorPackageOrder MentorPackageOrder @relation(fields: [packageOrderId], references: [id], onDelete: Cascade)

  @@index([packageOrderId])
  @@index([isActive])
  @@index([expiresAt])
}
```

**Características:**
- Relación 1:1 con paquete
- Expiración a 6 meses (configurable)
- Balance calculado: `remainingSessions = totalSessions - usedSessions`

---

### 3. **Actualización en `MentorPackageOrder`**

```prisma
model MentorPackageOrder {
  // ... campos existentes
  CallBooking         CallBooking[]  // 📦 Sesiones del paquete
  PackageSessionCredits PackageSessionCredits? // 💳 Balance de créditos
}
```

---

## 📦 Nuevos Servicios

### `/lib/packageSessionManager.ts`

#### **Funciones Principales:**

1. **`createPackageCredits(packageOrderId, totalSessions, expiresAt?)`**
   - Se ejecuta automáticamente al completar pago
   - Crea balance inicial de sesiones
   - Configura expiración a 6 meses

2. **`validateSessionCredits(userId, mentorId)`**
   - Valida si usuario tiene paquete activo con el mentor
   - Verifica créditos disponibles
   - Verifica expiración
   - Retorna: `{ hasCredits, packageOrderId, remainingSessions, message }`

3. **`consumeSessionCredit(packageOrderId)`**
   - Decrementa créditos al agendar sesión
   - Actualiza `usedSessions` y `remainingSessions`
   - Transacción atómica

4. **`refundSessionCredit(packageOrderId)`**
   - Devuelve crédito al cancelar sesión
   - Incrementa `remainingSessions`
   - Previene valores negativos

5. **`getPackageCreditsStatus(packageOrderId)`**
   - Obtiene estado completo del paquete
   - Incluye sesiones agendadas
   - Calcula porcentaje usado
   - Detecta expiración próxima (7 días)

6. **`getUserActivePackages(userId)`**
   - Lista todos los paquetes activos del usuario
   - Filtra por créditos disponibles
   - Incluye info del mentor y visión

7. **`checkExpiredPackages()`**
   - Cron job para marcar paquetes expirados
   - Marca `isActive = false` si expiresAt < now()

---

### `/lib/bookingCancelationHandler.ts`

#### **Funciones:**

1. **`cancelBookingWithRefund(bookingId)`**
   - Cancela sesión
   - Reembolsa crédito si es de paquete
   - Manejo robusto de errores

2. **`cancelMultipleBookingsWithRefund(bookingIds[])`**
   - Cancela en batch
   - Reembolsa todos los créditos
   - Retorna resumen de resultados

3. **`shouldSkipCommissionRegistration(booking)`**
   - Helper para validar si debe saltar comisión
   - Previene doble pago

---

## 🔄 Flujo Completo Integrado

### **Escenario 1: Compra de Paquete**

```
1. Usuario paga $4,500 por 18 sesiones
   ↓
2. PayPal/Stripe confirma pago
   ↓
3. /api/participante/payment-success ejecuta:
   ├─ Marca orden como COMPLETED
   ├─ 💰 onPackagePurchaseCompleted() → Commission Ledger
   ├─ 💳 createPackageCredits(18 sesiones, expires: 6 meses)
   ├─ Asigna mentor al usuario
   └─ Redirige a dashboard
   
4. Estado final:
   ✅ MentorPackageOrder: status = COMPLETED
   ✅ CommissionLedger: entrada con $4,500
   ✅ PackageSessionCredits: 18/18 disponibles
```

---

### **Escenario 2: Agendar Sesión con Paquete**

```
1. Participante selecciona horario con su mentor
   ↓
2. Frontend envía: { usePackageCredit: true }
   ↓
3. /api/student/booking valida:
   ├─ validateSessionCredits(userId, mentorId)
   │  └─ ¿Tiene paquete activo? ✅
   │  └─ ¿Tiene créditos? ✅ (18 disponibles)
   │  └─ ¿Está expirado? ❌
   ↓
4. Si validación exitosa:
   ├─ Crea CallBooking con packageOrderId
   ├─ NO crea Transaction (ya pagado)
   ├─ consumeSessionCredit(packageId)
   │  └─ usedSessions: 0 → 1
   │  └─ remainingSessions: 18 → 17
   └─ ✅ Sesión agendada

5. Estado final:
   ✅ CallBooking: packageOrderId = "cm123abc"
   ✅ PackageSessionCredits: 17/18 disponibles
   ❌ NO se crea Commission Ledger (ya pagado)
```

---

### **Escenario 3: Cancelar Sesión de Paquete**

```
1. Usuario cancela sesión agendada
   ↓
2. Sistema detecta: packageOrderId != null
   ↓
3. cancelBookingWithRefund(bookingId)
   ├─ Marca CallBooking como CANCELLED
   ├─ refundSessionCredit(packageId)
   │  └─ usedSessions: 1 → 0
   │  └─ remainingSessions: 17 → 18
   └─ ✅ Crédito devuelto

4. Estado final:
   ✅ CallBooking: status = CANCELLED
   ✅ PackageSessionCredits: 18/18 disponibles (restaurado)
```

---

### **Escenario 4: Completar Sesión de Paquete**

```
1. Mentor marca sesión como completada
   ↓
2. /api/mentor/complete-session ejecuta:
   ├─ Actualiza CallBooking: status = COMPLETED
   ├─ onMentorshipSessionCompleted(bookingId...)
   │  └─ 🔍 Detecta packageOrderId != null
   │  └─ ⚠️ SKIP commission (ya pagado en compra)
   └─ ✅ Sesión completada

3. Estado final:
   ✅ CallBooking: status = COMPLETED
   ✅ PackageSessionCredits: 17/18 (crédito consumido permanentemente)
   ❌ NO se registra comisión adicional
```

---

## 🔌 Nuevos Endpoints API

### **GET `/api/participante/package-credits`**

**Descripción:** Obtiene paquetes activos del usuario

**Query Params:**
- `mentorId` (opcional): Valida créditos con mentor específico

**Respuesta sin mentorId:**
```json
{
  "success": true,
  "packages": [
    {
      "id": "cm123abc",
      "mentorId": 8,
      "mentorName": "Juan Pérez",
      "mentorPhoto": "https://...",
      "visionId": 1,
      "visionName": "Visión 2026",
      "totalSessions": 18,
      "usedSessions": 3,
      "remainingSessions": 15,
      "expiresAt": "2026-07-02T00:00:00.000Z",
      "paidAt": "2026-01-02T18:00:00.000Z",
      "precioTotal": 4500,
      "currency": "MXN"
    }
  ]
}
```

**Respuesta con mentorId:**
```json
{
  "success": true,
  "validation": {
    "hasCredits": true,
    "packageOrderId": "cm123abc",
    "remainingSessions": 15,
    "message": "Tienes 15 sesiones disponibles"
  }
}
```

---

## 🛡️ Validaciones y Reglas de Negocio

### ✅ **Al Agendar Sesión**

1. **Validar créditos disponibles**
   - `remainingSessions > 0`
   - `isActive = true`
   - `expiresAt > now()` (si existe)

2. **Validar mentor correcto**
   - Solo puede usar créditos con el mentor del paquete
   - Evita transferencia de sesiones entre mentores

3. **Tipo de sesión**
   - Solo MENTORSHIP puede usar créditos
   - DISCIPLINE nunca usa créditos (siempre gratis)

### ✅ **Al Cancelar Sesión**

1. **Verificar si es de paquete**
   - Si `packageOrderId != null` → reembolsar crédito
   - Si no → solo cancelar

2. **Validar estado**
   - Solo se reembolsa si no está completada
   - No se puede cancelar sesiones COMPLETED

### ✅ **Al Completar Sesión**

1. **Prevenir doble comisión**
   - Si `packageOrderId != null` → skip comisión
   - Comisión ya registrada en compra del paquete

2. **Crédito permanente**
   - No se devuelve crédito al completar
   - Sesión consumida exitosamente

---

## 🧪 Testing

### **Caso de Prueba 1: Flujo Completo**

```bash
# 1. Comprar paquete
POST /api/participante/crear-orden-paquete
{ visionId: 1, mentorId: 8, cantidad: 18, precioTotal: 4500 }

# 2. Procesar pago
POST /api/participante/procesar-pago-paquete
{ orderId: "cm123abc", metodoPago: "paypal" }

# 3. Simular callback de PayPal
GET /api/participante/payment-success?orderId=cm123abc&PayerID=ABC123

# 4. Verificar créditos creados
SELECT * FROM "PackageSessionCredits" WHERE "packageOrderId" = 'cm123abc';
# Esperado: totalSessions=18, usedSessions=0, remainingSessions=18

# 5. Consultar paquetes activos
GET /api/participante/package-credits
# Esperado: 1 paquete con 18 sesiones disponibles

# 6. Agendar sesión con paquete
POST /api/student/booking
{
  "date": "2026-01-10",
  "time": "10:00",
  "mentorId": 8,
  "type": "MENTORSHIP",
  "usePackageCredit": true
}

# 7. Verificar crédito consumido
SELECT * FROM "PackageSessionCredits" WHERE "packageOrderId" = 'cm123abc';
# Esperado: usedSessions=1, remainingSessions=17

# 8. Verificar CallBooking vinculado
SELECT * FROM "CallBooking" WHERE "packageOrderId" = 'cm123abc';
# Esperado: 1 registro con packageOrderId

# 9. Verificar NO hay transaction
SELECT * FROM "Transaction" WHERE "bookingId" = [bookingId];
# Esperado: NULL (no se cobra sesión individual)

# 10. Cancelar sesión
# (Usar función cancelBookingWithRefund)

# 11. Verificar crédito reembolsado
SELECT * FROM "PackageSessionCredits" WHERE "packageOrderId" = 'cm123abc';
# Esperado: usedSessions=0, remainingSessions=18 (restaurado)
```

---

### **Caso de Prueba 2: Validación de Créditos**

```bash
# Intentar agendar sin créditos
POST /api/student/booking
{
  "date": "2026-01-10",
  "time": "10:00",
  "mentorId": 99,  # Mentor diferente
  "type": "MENTORSHIP",
  "usePackageCredit": true
}

# Esperado:
# Status: 403
# Error: "No tienes un paquete activo con este mentor"
```

---

### **Caso de Prueba 3: Prevención de Doble Comisión**

```bash
# 1. Agendar sesión de paquete
POST /api/student/booking
{ ..., "usePackageCredit": true }

# 2. Completar sesión
POST /api/mentor/complete-session
{ bookingId: 123 }

# 3. Verificar Commission Ledger
SELECT * FROM "CommissionLedger" WHERE "sourceId" = 123;
# Esperado: NULL (no debe existir)

# 4. Verificar log
# Esperado: "⚠️ Sesión X es de paquete Y. Saltando comisión (ya pagada)."
```

---

## 📊 Queries Útiles

### **Ver paquetes activos de un usuario**
```sql
SELECT 
  mpo.id,
  mpo."usuarioId",
  mpo."mentorId",
  u.nombre as mentor_nombre,
  psc."totalSessions",
  psc."usedSessions",
  psc."remainingSessions",
  psc."expiresAt",
  psc."isActive"
FROM "MentorPackageOrder" mpo
JOIN "PackageSessionCredits" psc ON psc."packageOrderId" = mpo.id
JOIN "Usuario" u ON u.id = mpo."mentorId"
WHERE mpo."usuarioId" = 5 
  AND mpo.status = 'COMPLETED'
  AND psc."isActive" = true
  AND psc."remainingSessions" > 0;
```

---

### **Ver sesiones agendadas de un paquete**
```sql
SELECT 
  cb.id,
  cb."scheduledAt",
  cb.status,
  cb.type,
  cb."completedAt"
FROM "CallBooking" cb
WHERE cb."packageOrderId" = 'cm123abc'
ORDER BY cb."scheduledAt" ASC;
```

---

### **Ver consumo de créditos**
```sql
SELECT 
  psc."packageOrderId",
  psc."totalSessions",
  psc."usedSessions",
  psc."remainingSessions",
  ROUND((psc."usedSessions"::numeric / psc."totalSessions") * 100, 1) as percentage_used,
  COUNT(cb.id) as sessions_booked
FROM "PackageSessionCredits" psc
LEFT JOIN "CallBooking" cb ON cb."packageOrderId" = psc."packageOrderId"
WHERE psc."isActive" = true
GROUP BY psc.id, psc."packageOrderId", psc."totalSessions", psc."usedSessions", psc."remainingSessions";
```

---

## 🚀 Próximas Mejoras

### Prioridad Alta
1. ✅ **Dashboard de paquetes para participante**
   - Ver sesiones restantes
   - Historial de sesiones usadas
   - Fecha de expiración

2. ✅ **Notificaciones automáticas**
   - Email al comprar paquete
   - Recordatorio cuando quedan 3 sesiones
   - Alerta 7 días antes de expirar

### Prioridad Media
3. **Transferencia de paquetes**
   - Permitir cambiar de mentor (con aprobación admin)
   - Transferir créditos entre usuarios

4. **Reportes analíticos**
   - Tasa de consumo de paquetes
   - Tiempo promedio de uso completo
   - Mentores con más ventas de paquetes

### Prioridad Baja
5. **Paquetes variables**
   - Paquetes de 10, 18, 25 sesiones
   - Precios dinámicos
   - Descuentos por volumen

---

## 📝 Notas Importantes

### ⚠️ **Prevención de Doble Comisión**
Las sesiones de paquetes **NO** deben generar comisiones individuales porque:
- La comisión completa se registra al momento de la compra
- Ya está en Commission Ledger con tipo `PACKAGE_SESSION`
- Registrar comisiones por sesión individual = doble pago al mentor

### 💡 **Expiración de Paquetes**
- Por defecto: 6 meses desde compra
- Se puede modificar en `payment-success.ts`
- Cron job debe ejecutarse diariamente: `checkExpiredPackages()`

### 🔐 **Seguridad**
- Solo el dueño del paquete puede usar créditos
- No se pueden transferir créditos sin autorización
- Validación de mentor en cada agendamiento
- Transacciones atómicas para prevenir race conditions

---

**Fecha de implementación:** 2 de enero de 2026  
**Versión:** 1.0.0  
**Status:** ✅ Producción Ready
