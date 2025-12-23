# 💰 Sistema Financiero para Administradores

## Descripción General

Panel de control financiero que permite a los administradores ver todas las transacciones, comisiones y el revenue de la plataforma en tiempo real.

## 🎯 Características Principales

### 1. Dashboard Visual
- **Volumen Total**: Monto bruto procesado en la plataforma
- **Tu Revenue**: Comisiones cobradas a mentores (30% por defecto)
- **A Dispersar**: Dinero que pertenece a los mentores (70%)
- **Desglose por Estado**: HELD (retenido), RELEASED (liberado), REFUNDED (reembolsado)

### 2. Tabla de Transacciones
- Historial completo de movimientos
- Información de mentor y estudiante
- Montos desglosa dos (total, comisión plataforma, pago mentor)
- Estados con códigos de color
- Fechas de creación y liberación

### 3. Métricas Avanzadas
- Total de transacciones procesadas
- Comisión efectiva promedio
- Ticket promedio por mentoría
- Dinero retenido vs liberado

## 📂 Archivos del Sistema

### API Endpoint
**Ruta**: `app/api/admin/finances/route.ts`

```typescript
GET /api/admin/finances
```

**Respuesta**:
```json
{
  "transactions": [
    {
      "id": 1,
      "bookingId": 1,
      "amountTotal": 1500,
      "platformFee": 450,
      "mentorEarnings": 1050,
      "status": "RELEASED",
      "releasedAt": "2025-12-16T12:00:00Z",
      "createdAt": "2025-12-15T10:00:00Z",
      "booking": {
        "mentor": { "full_name": "Ana Marina Lara" },
        "student": { "full_name": "Aldo 1" }
      }
    }
  ],
  "stats": {
    "totalSales": 1500,
    "platformProfit": 450,
    "mentorPayouts": 1050,
    "held": 0,
    "released": 1050,
    "refunded": 0
  },
  "count": 1
}
```

**Seguridad**: 
- ✅ Requiere autenticación (Next-Auth)
- ✅ Verifica rol `ADMIN` (403 si no es administrador)

### Componente de Dashboard
**Ruta**: `app/dashboard/admin/finanzas/page.tsx`

Componente cliente (`"use client"`) que:
1. Carga datos del API al montar
2. Muestra 3 tarjetas de métricas principales
3. Renderiza tabla interactiva de transacciones
4. Desglose de estados (HELD, RELEASED, REFUNDED)

### Script de Prueba
**Ruta**: `scripts/test-sistema-financiero.ts`

```bash
npx ts-node --compiler-options '{"module":"commonjs"}' scripts/test-sistema-financiero.ts
```

**Output esperado**:
```
💰 RESUMEN FINANCIERO:
════════════════════════════════════════════════════════════
📈 Volumen Total Procesado:    $1500.00 MXN
✨ Tu Revenue (Plataforma):    $450.00 MXN
👨‍🏫 A Dispersar (Mentores):     $1050.00 MXN
────────────────────────────────────────────────────────────
⏳ Retenido (HELD):            $0.00 MXN
✅ Liberado (RELEASED):        $1050.00 MXN
↩️  Reembolsado (REFUNDED):     $0.00 MXN
```

## 🎨 Diseño Visual

### Paleta de Colores

| Estado | Color | Uso |
|--------|-------|-----|
| **Volumen Total** | Azul (`bg-blue-900/20`) | Tarjeta principal |
| **Revenue Plataforma** | Verde (`bg-green-900/20`) | Tu ganancia |
| **Mentores** | Morado (`bg-purple-900/20`) | Pagos pendientes |
| **HELD** | Ámbar (`bg-amber-500/10`) | Dinero retenido |
| **RELEASED** | Verde (`bg-green-500/10`) | Dinero liberado |
| **REFUNDED** | Rojo (`bg-red-500/10`) | Reembolsos |

### Iconos (Lucide React)
- `DollarSign` - Título principal
- `TrendingUp` - Volumen total
- `Wallet` - Revenue neto
- `ArrowUpRight` - Dispersiones
- `ArrowDownLeft` - Transacciones
- `Loader2` - Estados de carga

## 🔒 Seguridad

### Validaciones del API
1. **Autenticación**: Verifica sesión activa
   ```typescript
   const session = await getServerSession(authOptions);
   if (!session?.user) return 401;
   ```

2. **Autorización**: Solo administradores
   ```typescript
   if (session.user.rol !== 'ADMIN') return 403;
   ```

3. **Cache**: Deshabilitado para datos en tiempo real
   ```typescript
   export const dynamic = 'force-dynamic';
   ```

### Validaciones del Frontend
- Manejo de errores con try/catch
- Loading states durante fetch
- Mensajes de error visibles al usuario

## 📊 Cálculos Financieros

### Estadísticas Calculadas

```typescript
const stats = transactions.reduce((acc, tx) => {
  acc.totalSales += tx.amountTotal;        // Suma de todos los montos
  acc.platformProfit += tx.platformFee;    // Tu ganancia acumulada
  acc.mentorPayouts += tx.mentorEarnings;  // Deuda total a mentores
  
  // Desglose por estado
  if (tx.status === 'HELD') acc.held += tx.mentorEarnings;
  if (tx.status === 'RELEASED') acc.released += tx.mentorEarnings;
  if (tx.status === 'REFUNDED') acc.refunded += tx.amountTotal;
  
  return acc;
}, initialStats);
```

### Validación de Integridad
Verifica que: `platformFee + mentorEarnings = amountTotal`

```typescript
const isValid = transactions.every(tx => {
  const sum = tx.platformFee + tx.mentorEarnings;
  const diff = Math.abs(sum - tx.amountTotal);
  return diff < 0.01; // Tolerancia de centavos
});
```

## 🚀 Uso del Sistema

### Para Administradores

1. **Acceder al Panel**
   ```
   http://localhost:3000/dashboard/admin/finanzas
   ```
   Requisito: Estar autenticado con rol `ADMIN`

2. **Ver Métricas**
   - Las tarjetas superiores muestran el resumen financiero
   - Los números se actualizan cada vez que se recarga la página

3. **Revisar Transacciones**
   - Scroll en la tabla para ver todo el historial
   - Hover sobre las filas para destacarlas
   - Click en estados para ver detalles (próxima feature)

### Para Desarrolladores

1. **Probar con Datos Ficticios**
   ```bash
   npx ts-node scripts/test-sistema-financiero.ts
   ```

2. **Crear Transacciones Manualmente**
   ```typescript
   const tx = await prisma.transaction.create({
     data: {
       bookingId: 1,
       amountTotal: 1500,
       platformFee: 450,
       mentorEarnings: 1050,
       status: 'HELD'
     }
   });
   ```

3. **Liberar Pagos**
   ```typescript
   await prisma.transaction.update({
     where: { id: txId },
     data: {
       status: 'RELEASED',
       releasedAt: new Date()
     }
   });
   ```

## 📈 Flujo de Transacciones

```
┌─────────────────────────────────────────────────────────┐
│  1. ESTUDIANTE RESERVA MENTORÍA                        │
│     └─> Crea CallBooking                               │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  2. SISTEMA CREA TRANSACCIÓN (HELD)                    │
│     amountTotal: $1500                                  │
│     platformFee: $450 (30%)                             │
│     mentorEarnings: $1050 (70%)                         │
│     status: 'HELD' ← Dinero retenido                    │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  3. SESIÓN OCURRE                                       │
│     └─> scheduledAt <= now                              │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  4. MENTOR MARCA "TERMINAR Y COBRAR"                   │
│     CallBooking.status = 'COMPLETED'                    │
│     Transaction.status = 'RELEASED' ✅                   │
│     releasedAt = now()                                  │
└─────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────┐
│  5. ADMIN VE EN FINANZAS                                │
│     Liberado: +$1050                                    │
│     Tu Revenue: +$450                                   │
└─────────────────────────────────────────────────────────┘
```

## 🔮 Próximas Mejoras

### Corto Plazo
- [ ] Filtros por fecha (hoy, última semana, último mes)
- [ ] Exportar a Excel/CSV
- [ ] Búsqueda por mentor o estudiante
- [ ] Paginación para historial largo

### Mediano Plazo
- [ ] Gráficas de tendencias (Chart.js o Recharts)
- [ ] Sistema de dispersión automática
- [ ] Notificaciones cuando hay pagos por liberar
- [ ] Reporte mensual por email

### Largo Plazo
- [ ] Integración con Stripe Payouts
- [ ] Dashboard de mentores individuales
- [ ] Predicción de revenue (ML)
- [ ] Reconciliación bancaria automática

## 🐛 Troubleshooting

### Error: "No autenticado"
**Solución**: Asegúrate de estar logueado con rol `ADMIN`

### Error: "No hay movimientos financieros"
**Solución**: Ejecuta el script de test para crear datos de prueba

### Números descuadrados
**Solución**: Verifica la integridad con el script de test

### Transacciones no aparecen
**Solución**: 
1. Verifica que el servidor esté corriendo
2. Revisa la consola del navegador
3. Confirma que `force-dynamic` esté habilitado

## 📚 Referencias

- [Next.js App Router](https://nextjs.org/docs/app)
- [Prisma Transactions](https://www.prisma.io/docs/concepts/components/prisma-client/transactions)
- [NextAuth Session](https://next-auth.js.org/getting-started/client)
- [Tailwind CSS](https://tailwindcss.com/docs)
- [Lucide Icons](https://lucide.dev/)

## ✅ Checklist de Implementación

- [x] Modelo `Transaction` en Prisma
- [x] API endpoint GET `/api/admin/finances`
- [x] Validación de autenticación y autorización
- [x] Componente de dashboard con tarjetas de métricas
- [x] Tabla de transacciones interactiva
- [x] Desglose por estados (HELD/RELEASED/REFUNDED)
- [x] Script de prueba funcional
- [x] Documentación completa
- [x] Diseño responsive con Tailwind
- [x] Loading states y manejo de errores
- [x] Validación de integridad de datos

---

**Versión**: 1.0  
**Última actualización**: 16 de diciembre de 2025  
**Mantenedor**: Sistema de Mentorías Plataforma Frutos
