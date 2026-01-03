# 💰 Commission Ledger System - Quick Start Guide

## 🎯 ¿Qué es esto?

Sistema completo de gestión de pagos a mentores con registro inmutable de comisiones. Cada servicio completado se registra automáticamente.

---

## 📍 Acceso Rápido

### Panel Admin
```
URL: /dashboard/admin/pagos
Rol requerido: ADMIN
```

### APIs
```
GET  /api/admin/commissions              # Obtener ledger
POST /api/admin/commissions/process-payout  # Marcar como pagado
GET  /api/admin/commissions/export       # Descargar CSV
```

---

## ✨ Características Principales

### 1. Registro Automático
Cada vez que un mentor completa una sesión:
- ✅ Se crea entrada en CommissionLedger
- ✅ Se congela precio y comisión del momento
- ✅ Status inicial: PENDING

### 2. Panel Visual
- 📊 4 KPIs: Total Generado, Revenue, Nómina Pendiente, Seleccionado
- 🔍 Filtros: Estado, Tipo, Mentor, Fecha
- ☑️ Selección múltiple para pago masivo
- 📥 Exportar CSV para banco

### 3. Flujo de Pago
1. Admin filtra comisiones pendientes
2. Selecciona registros (checkbox)
3. Click "Procesar Pago"
4. Descarga CSV o confirma manualmente
5. Sistema marca como PAID

---

## 🗄️ Estructura de Datos

```typescript
CommissionLedger {
  id: string                   // Unique ID
  mentorId: number            // Quien recibe
  sourceType: enum            // MENTORSHIP_SESSION | DISCIPLINE_CALL
  totalAmount: decimal        // Precio completo
  platformFee: decimal        // Tu ganancia
  platformPercent: number     // % congelado
  payableAmount: decimal      // Para el mentor
  status: enum                // PENDING | PAID | CANCELLED
  completedAt: datetime       // Cuando se hizo
  paidAt: datetime?           // Cuando se pagó
  payoutBatchId: string?      // ID del lote
}
```

---

## 🔄 Flujo Automático

```
┌─────────────────┐
│ Sesión Completa │
│  (COMPLETED)    │
└────────┬────────┘
         │
         ▼
┌─────────────────────────┐
│ API: complete-session   │
│ Trigger automático      │
└────────┬────────────────┘
         │
         ▼
┌──────────────────────────────┐
│ lib/commissionCalculator.ts  │
│ - Obtiene comisión mentor    │
│ - Calcula platformFee        │
│ - Crea ledger entry          │
└────────┬─────────────────────┘
         │
         ▼
┌──────────────────────┐
│ CommissionLedger DB  │
│ Status: PENDING      │
└──────────────────────┘
```

---

## 💡 Ejemplos de Uso

### Ejemplo 1: Mentoría $1,000 MXN

```
Cliente paga: $1,000
Comisión plataforma: 15%
─────────────────────
Tu ganancia:  $150  (platformFee)
Al mentor:    $850  (payableAmount)

Ledger entry:
{
  totalAmount: 1000,
  platformFee: 150,
  platformPercent: 15,
  payableAmount: 850,
  status: 'PENDING'
}
```

### Ejemplo 2: Llamada Disciplina

```
Precio fijo: $90
Comisión plataforma: 30%
─────────────────────
Tu ganancia:  $27   (platformFee)
Al mentor:    $63   (payableAmount)

Ledger entry:
{
  totalAmount: 90,
  platformFee: 27,
  platformPercent: 30,
  payableAmount: 63,
  status: 'PENDING'
}
```

---

## 🎨 Vista del Panel

```
┌─────────────────────────────────────────────────┐
│  💰 Commission Ledger                           │
│  Panel Maestro de Finanzas y Comisiones        │
└─────────────────────────────────────────────────┘

┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Total Gen.   │ Revenue      │ 🔴 Nómina    │ Seleccionado │
│ $15,000      │ $2,250       │ $12,750      │ $3,500       │
│ 15 trans.    │ Tu ganancia  │ Por pagar    │ 4 registros  │
└──────────────┴──────────────┴──────────────┴──────────────┘

┌─────────────────────────────────────────────────┐
│ 🔍 Filtros                                      │
│ [Pendientes ▾] [Todos ▾] [Todos mentores ▾]    │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│ ☑ 4 comisiones seleccionadas | Total: $3,500   │
│                  [📥 CSV] [💳 Procesar Pago]   │
└─────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────┐
│ ☑ │ Fecha      │ Mentor   │ Concepto  │ $1,000 │
│ ☐ │ 2 Ene 2026 │ Roberto  │ Mentoría  │ $850   │
│ ☑ │ 1 Ene 2026 │ Ana      │ Disciplina│ $63    │
│ ☐ │ 31 Dic 2025│ Carlos   │ Mentoría  │ $850   │
└────────────────────────────────────────────────────┘
```

---

## 🚀 Cómo Usarlo (Paso a Paso)

### Para Admin (Pago de Comisiones)

1. **Ir al Panel**
   ```
   /dashboard/admin/pagos
   ```

2. **Filtrar Pendientes**
   - Estado: "Pendientes"
   - Fecha desde: Primera día del mes

3. **Revisar Comisiones**
   - Ver KPI "Nómina Pendiente"
   - Verificar mentores y montos

4. **Seleccionar Registros**
   - Click checkbox individual
   - O click encabezado para "Seleccionar Todo"

5. **Procesar Pago**
   - Opción A: Click "Exportar CSV" → Banco
   - Opción B: Click "Procesar Pago" → Confirmar

6. **Confirmar**
   - Modal: "¿Realizaste las transferencias?"
   - Click "Confirmar Pago"
   - Sistema marca como PAID

### Para Mentor (Ver Comisiones)
_⏳ Próximamente en Fase 2_

---

## 🔧 Configuración de Comisiones

### Por Mentor (Individual)

Las comisiones se configuran en `PerfilMentor`:

```typescript
// Por defecto
comisionPlataforma: 30%  // Tú ganas 30%
comisionMentor: 70%      // Mentor gana 70%

// Mentor Senior (negociado)
comisionPlataforma: 15%  // Tú ganas 15%
comisionMentor: 85%      // Mentor gana 85%

// Mentor Master (estrella)
comisionPlataforma: 10%  // Tú ganas 10%
comisionMentor: 90%      // Mentor gana 90%
```

### Editar Comisión

```sql
UPDATE "PerfilMentor"
SET "comisionPlataforma" = 20,
    "comisionMentor" = 80
WHERE "usuarioId" = 5;
```

O via API (futuro):
```typescript
PUT /api/admin/mentors/:id/commission
{
  platformPercent: 20
}
```

---

## 📊 Reportes Disponibles

### 1. CSV de Pago
```csv
mentorId,mentorName,mentorEmail,amount,currency,reference
5,Roberto Martínez,roberto@mail.com,850.00,MXN,PAYOUT-cm123
```

### 2. Resumen por Mentor
```json
{
  "mentorId": 5,
  "mentorName": "Roberto Martínez",
  "totalSales": 15000,
  "platformRevenue": 2250,
  "mentorPayable": 12750,
  "entriesCount": 15
}
```

### 3. Reporte Mensual
```
Mes: Enero 2026
─────────────────────────
Total Ventas:    $45,000
Tu Ganancia:     $6,750  (15%)
Pagado Mentores: $38,250 (85%)
Transacciones:   45
```

---

## ⚠️ Reglas Importantes

### Ausencias
- ✅ **Alumno falta:** SE PAGA al mentor
- ❌ **Mentor falta:** NO se genera comisión

### Precios
- 🔒 Precio se congela al momento de reserva
- 🔒 Comisión se congela al momento de reserva
- 🔒 No afectan cambios posteriores

### Estados
- `PENDING`: Por pagar (default)
- `PAID`: Ya pagado al mentor
- `CANCELLED`: Sesión cancelada, no se paga
- `DISPUTED`: En disputa, revisar
- `REFUNDED`: Reembolsado al cliente

---

## 🐛 Troubleshooting

### Problema: No aparecen comisiones

**Verificar:**
1. ¿La sesión está COMPLETED?
2. ¿Es tipo MENTORSHIP o DISCIPLINE?
3. ¿Hay Transaction asociada?

**Solución:**
```typescript
// Crear entrada manual
await onMentorshipSessionCompleted(
  bookingId,
  mentorId,
  studentId,
  amount,
  scheduledAt
);
```

### Problema: CSV vacío

**Verificar:**
1. ¿Hay registros seleccionados?
2. ¿Status es PENDING?

**Solución:**
- Seleccionar registros antes de exportar
- Filtrar status "Pendientes"

### Problema: No se puede marcar como PAID

**Verificar:**
1. ¿Eres ADMIN?
2. ¿Status actual es PENDING?

**Solución:**
- Solo PENDING → PAID permitido
- No se puede pagar dos veces

---

## 📞 Soporte

**Documentación completa:**
```
/COMMISSION-LEDGER-SYSTEM.md
```

**Archivos clave:**
```
/lib/commissionCalculator.ts              # Lógica
/app/dashboard/admin/pagos/page.tsx       # Panel
/app/api/admin/commissions/route.ts       # API GET
/app/api/admin/commissions/process-payout # API POST
/prisma/schema.prisma                     # Tabla
```

**Migración:**
```
npx prisma db push
```

---

## ✅ Checklist de Implementación

- [x] Tabla CommissionLedger creada
- [x] Enums CommissionSource y CommissionStatus
- [x] Servicio calculador (lib/commissionCalculator.ts)
- [x] Integración con complete-session
- [x] Panel admin visual
- [x] Filtros avanzados
- [x] KPIs en tiempo real
- [x] Selección múltiple
- [x] Exportar CSV
- [x] Procesar pago masivo
- [x] Modal de confirmación
- [x] APIs REST completas
- [x] Documentación completa

---

**Status:** ✅ Sistema 100% operativo  
**Versión:** 1.0.0  
**Fecha:** 2 de enero de 2026

🎉 **¡Listo para producción!**
