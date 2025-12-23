# 💰 Sistema de Transacciones Financieras

## Descripción General

Sistema completo de gestión financiera para mentorías que registra pagos, calcula comisiones y controla el flujo de dinero entre estudiantes, mentores y la plataforma.

---

## 📊 Estructura de Base de Datos

### Modelo `Transaction`

```prisma
model Transaction {
  id             Int         @id @default(autoincrement())
  bookingId      Int         @unique // Una transacción por reserva
  booking        CallBooking @relation(fields: [bookingId], references: [id])
  
  amountTotal    Float       // Lo que pagó el alumno (ej. $1500)
  platformFee    Float       // Comisión de la plataforma (ej. $450)
  mentorEarnings Float       // Ganancias del mentor (ej. $1050)
  
  status         String      @default("HELD") // HELD | RELEASED | REFUNDED
  releasedAt     DateTime?   // Cuándo se liberó el pago al mentor
  createdAt      DateTime    @default(now())
  updatedAt      DateTime    @updatedAt
}
```

### Relación con `CallBooking`

Cada reserva de tipo `MENTORSHIP` tiene **una transacción única** que registra:
- Monto total pagado
- Distribución de comisiones
- Estado del pago

---

## 💸 Flujo de Dinero

### 1. **HELD (Retenido)** - Estado Inicial
Cuando se hace una reserva de mentoría:

```typescript
// El dinero se "congela" hasta que se complete la sesión
Transaction {
  status: "HELD",
  amountTotal: 1500,
  platformFee: 450,    // 30% comisión
  mentorEarnings: 1050  // 70% para mentor
}
```

**¿Qué significa?**
- El estudiante ya pagó
- El dinero está en "custodia"
- El mentor no puede retirarlo todavía
- Esperamos que se complete la sesión

### 2. **RELEASED (Liberado)** - Sesión Completada
Cuando la mentoría se completa exitosamente:

```typescript
// Se libera el pago al mentor
Transaction {
  status: "RELEASED",
  releasedAt: "2025-12-16T10:30:00Z"
}
```

**Flujo:**
1. CallBooking.status → `COMPLETED`
2. Transaction.status → `RELEASED`
3. El mentor puede retirar su dinero
4. La plataforma se queda su comisión

### 3. **REFUNDED (Reembolsado)** - Cancelación
Si la sesión se cancela o no se completa:

```typescript
Transaction {
  status: "REFUNDED"
}
```

**Acciones:**
- Devolver dinero al estudiante
- No se cobra comisión
- No se paga al mentor

---

## 🔧 Implementación en el API

### Creación de Reserva con Transacción

**Endpoint:** `POST /api/student/booking`

```typescript
// PASO 1: Obtener datos financieros del mentor
const mentorProfile = await prisma.perfilMentor.findUnique({
  where: { usuarioId: mentorId },
  select: { 
    precioBase: true,        // Precio por sesión
    comisionPlataforma: true // % de comisión
  }
});

const price = mentorProfile.precioBase || 1000;
const commission = mentorProfile.comisionPlataforma || 30;

// PASO 2: Calcular distribución
const platformShare = (price * commission) / 100;  // $300
const mentorShare = price - platformShare;          // $700

// PASO 3: Crear reserva
const booking = await prisma.callBooking.create({
  data: {
    studentId,
    mentorId,
    scheduledAt,
    type: 'MENTORSHIP',
    status: 'PENDING'
  }
});

// PASO 4: Registrar transacción (dinero retenido)
await prisma.transaction.create({
  data: {
    bookingId: booking.id,
    amountTotal: price,
    platformFee: platformShare,
    mentorEarnings: mentorShare,
    status: 'HELD'
  }
});
```

---

## 📈 Consultas Financieras Útiles

### Balance Total de la Plataforma

```typescript
const totalRevenue = await prisma.transaction.aggregate({
  _sum: { platformFee: true },
  where: { status: 'RELEASED' }
});

console.log(`Ingresos plataforma: $${totalRevenue._sum.platformFee}`);
```

### Ganancias Pendientes de un Mentor

```typescript
const pending = await prisma.transaction.aggregate({
  _sum: { mentorEarnings: true },
  where: {
    booking: { mentorId: 21 },
    status: 'HELD'
  }
});

console.log(`Pendiente de liberar: $${pending._sum.mentorEarnings}`);
```

### Ganancias Disponibles para Retiro

```typescript
const available = await prisma.transaction.aggregate({
  _sum: { mentorEarnings: true },
  where: {
    booking: { mentorId: 21 },
    status: 'RELEASED'
  }
});

console.log(`Disponible para retiro: $${available._sum.mentorEarnings}`);
```

---

## 🎯 Casos de Uso

### 1. Completar Mentoría y Liberar Pago

```typescript
await prisma.$transaction(async (tx) => {
  // Marcar sesión como completada
  const booking = await tx.callBooking.update({
    where: { id: bookingId },
    data: { 
      status: 'COMPLETED',
      completedAt: new Date()
    }
  });

  // Liberar pago al mentor
  await tx.transaction.update({
    where: { bookingId: bookingId },
    data: { 
      status: 'RELEASED',
      releasedAt: new Date()
    }
  });
});
```

### 2. Cancelación con Reembolso

```typescript
await prisma.$transaction(async (tx) => {
  // Cancelar reserva
  await tx.callBooking.update({
    where: { id: bookingId },
    data: { status: 'CANCELLED' }
  });

  // Marcar transacción como reembolsada
  await tx.transaction.update({
    where: { bookingId: bookingId },
    data: { status: 'REFUNDED' }
  });

  // TODO: Procesar reembolso real con Stripe/PayPal
});
```

---

## 🔐 Reglas de Negocio

### 1. **Solo MENTORSHIP tiene transacciones**
- Las llamadas de `DISCIPLINE` (15 min) son parte de la suscripción
- Solo las mentorías pagadas (60 min) generan transacciones

### 2. **Una transacción por reserva**
- Relación 1:1 garantizada por `@unique`
- No puede haber duplicados

### 3. **Estados Inmutables**
```
HELD → RELEASED  ✅ (Sesión completada)
HELD → REFUNDED  ✅ (Cancelación)
RELEASED → HELD  ❌ (No se puede revertir)
```

### 4. **Cálculo de Comisiones**
```typescript
// Siempre desde el perfil del mentor
platformFee = (precioBase * comisionPlataforma) / 100
mentorEarnings = precioBase - platformFee
```

---

## 📊 Dashboard Financiero (Próximos Pasos)

### Para Mentores
- Balance disponible para retiro
- Historial de transacciones
- Gráfica de ingresos mensuales

### Para Administradores
- Ingresos totales de la plataforma
- Pagos pendientes de liberar
- Reembolsos procesados

---

## ✅ Verificación

Ejecuta el script de prueba:

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-transacciones.ts
```

**Output esperado:**
```
💰 TEST: Sistema de Transacciones Financieras

📋 Mentor: Ana Marina Lara (ID: 21)
📋 Estudiante: Aldo 1 (ID: 17)

💵 CÁLCULOS FINANCIEROS:
   Precio base: $1500
   Comisión plataforma: 30%
   Para la plataforma: $450
   Para el mentor: $1050

✅ RESERVA CREADA
✅ TRANSACCIÓN REGISTRADA
✅ RELACIÓN VERIFICADA

🎉 TEST COMPLETADO EXITOSAMENTE
```

---

## 🚀 Estado Actual

- ✅ Modelo `Transaction` creado
- ✅ Relación con `CallBooking`
- ✅ API de booking registra transacciones
- ✅ Cálculo automático de comisiones
- ✅ Status HELD por defecto
- ⏳ Pendiente: Liberar pagos al completar sesión
- ⏳ Pendiente: Integración con pasarela de pagos
- ⏳ Pendiente: Dashboard financiero

---

**Fecha:** 16 de diciembre de 2025
**Estado:** Implementado y probado exitosamente 💰
