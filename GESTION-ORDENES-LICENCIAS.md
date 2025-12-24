# 💳 Gestión de Órdenes de Compra de Licencias

## 🎉 Versión 2.0 - Nuevas Funcionalidades

### ✨ Novedades

1. **Logos de Pasarelas de Pago** - Stripe, PayPal y Mercado Pago con sus logos oficiales
2. **Sistema de Comprobantes** - Los directores pueden subir comprobantes de transferencia bancaria
3. **Vista de Comprobantes para Admin** - Los administradores pueden ver y aprobar los comprobantes
4. **Estados Mejorados** - Nuevo estado `PROCESSING` para órdenes con comprobante en revisión

Ver documento completo: [MEJORAS-ORDENES-V2.md](./MEJORAS-ORDENES-V2.md)

---

## 📋 Descripción General

El sistema de órdenes de compra permite a los administradores de la plataforma gestionar todas las compras de licencias escolares, incluyendo la confirmación manual de pagos recibidos por transferencia bancaria o efectivo.

## 🎯 Funcionalidades

### Para Administradores

#### 1. **Visualización de Órdenes**
Los administradores pueden acceder a `/dashboard/admin/ordenes` para ver:
- ✅ **Todas las órdenes** de licencias del sistema
- 📊 **Estadísticas en tiempo real**:
  - Total de órdenes
  - Órdenes pendientes
  - Órdenes completadas
  - Ingresos confirmados
  - Ingresos en proceso

#### 2. **Filtrado y Búsqueda**
- 🔍 **Buscador inteligente**: Busca por nombre de escuela, director, email o ID de orden
- 🏷️ **Filtro por estado**:
  - `PENDING` - Pendiente de pago
  - `PROCESSING` - Pago en proceso de verificación
  - `COMPLETED` - Pago confirmado y créditos generados
  - `FAILED` - Pago fallido
  - `CANCELLED` - Orden cancelada
  - `REFUNDED` - Orden reembolsada

#### 3. **Información de cada Orden**
Para cada orden se muestra:
- 🏢 **Escuela**: Nombre de la organización
- 👤 **Director**: Nombre y email del solicitante
- 🎟️ **Licencias**: Cantidad y tipo (STANDARD/PREMIUM)
- 💰 **Monto**: Total en MXN
- 💳 **Método de pago**: Transfer, Stripe, PayPal, Mercado Pago, Efectivo
- 🔖 **Estado**: Badge visual del estado actual
- 📅 **Fechas**: Creación y confirmación de pago

#### 4. **Confirmar Pagos Manualmente**
Cuando una orden está en estado `PENDING` y el pago fue realizado por:
- 💸 **Transferencia bancaria**
- 💵 **Efectivo**
- 🏦 **Depósito directo**

El administrador puede:
1. Hacer clic en el botón **"Marcar Pagada"**
2. Revisar los detalles de la orden en el modal de confirmación
3. Confirmar la acción

**¿Qué sucede al confirmar?**
- ✅ Estado cambia a `COMPLETED`
- 📅 Se registra la fecha de pago (`paidAt`)
- 🎟️ Se generan automáticamente los créditos de licencia
- 📈 Los créditos se agregan a la organización (`availableCredits`)
- 🔐 Se crean códigos de licencia individuales
- 👤 Se registra quién confirmó el pago

## 🗄️ Modelo de Base de Datos

### Tabla: `LicenseOrder`

```prisma
model LicenseOrder {
  id                 String              @id @default(cuid())
  organizationId     Int
  requestedBy        Int                 // Usuario que solicitó (SCHOOL_ADMIN)
  quantity           Int                 // Cantidad de licencias solicitadas
  tier               UserTier            @default(STANDARD)
  amount             Float               // Monto total en USD
  paymentMethod      String              // 'paypal', 'stripe', 'mercadopago', 'transfer', 'cash'
  status             LicenseOrderStatus  @default(PENDING)
  externalPaymentId  String?             // ID de la orden en la pasarela
  paymentUrl         String?             // URL de pago
  paidAt             DateTime?           // Fecha de confirmación de pago
  paymentData        Json?               // Datos adicionales del pago
  creditsGenerated   Boolean             @default(false)
  creditsGeneratedAt DateTime?
  createdAt          DateTime            @default(now())
  updatedAt          DateTime            @updatedAt
  
  Organization       Organization        @relation(fields: [organizationId], references: [id])
  RequestedByUser    Usuario             @relation(fields: [requestedBy], references: [id])
}
```

### Estados de Orden

```typescript
enum LicenseOrderStatus {
  PENDING       // Orden creada, esperando pago
  PROCESSING    // Pago en proceso de verificación
  COMPLETED     // Pago confirmado, créditos generados
  FAILED        // Pago fallido
  CANCELLED     // Orden cancelada
  REFUNDED      // Orden reembolsada
}
```

## 🔌 APIs

### 1. **GET** `/api/admin/license-orders`
Obtiene todas las órdenes de licencias.

**Autenticación**: Requiere rol `ADMIN` o `STAFF`

**Respuesta**:
```json
{
  "success": true,
  "orders": [
    {
      "id": "clxxx123",
      "organizationId": 1,
      "quantity": 50,
      "tier": "STANDARD",
      "amount": 25000,
      "paymentMethod": "transfer",
      "status": "PENDING",
      "createdAt": "2025-12-23T10:00:00Z",
      "Organization": {
        "name": "Colegio Ejemplo"
      },
      "RequestedByUser": {
        "nombre": "Juan Pérez",
        "email": "juan@ejemplo.com"
      }
    }
  ]
}
```

### 2. **POST** `/api/admin/license-orders/[orderId]/mark-paid`
Marca una orden como pagada manualmente.

**Autenticación**: Requiere rol `ADMIN` o `STAFF`

**Proceso**:
1. ✅ Verifica que la orden exista
2. ✅ Verifica que esté en estado `PENDING`
3. ✅ Verifica que los créditos no se hayan generado
4. 🔄 Inicia una transacción en la BD
5. 📝 Actualiza la orden a `COMPLETED`
6. 🎟️ Incrementa los créditos de la organización
7. 🔐 Genera códigos de licencia individuales
8. 💾 Registra quién confirmó el pago

**Respuesta Exitosa**:
```json
{
  "success": true,
  "message": "Pago confirmado y créditos generados exitosamente",
  "order": { ... },
  "creditsGenerated": 50
}
```

**Errores Posibles**:
- `401` - No autorizado
- `403` - Acceso denegado (no es ADMIN/STAFF)
- `404` - Orden no encontrada
- `400` - Orden no está en estado PENDING
- `400` - Créditos ya fueron generados
- `500` - Error del servidor

## 🎨 Interfaz de Usuario

### Página: `/dashboard/admin/ordenes`

**Componentes principales**:

1. **Header con Estadísticas**
   - 5 tarjetas KPI con métricas en tiempo real
   - Botón de actualización manual

2. **Barra de Filtros**
   - Buscador de texto completo
   - Selector de estado

3. **Tabla de Órdenes**
   - Listado completo con scroll horizontal
   - Columnas: Orden/Escuela, Director, Licencias, Monto, Método, Estado, Fecha, Acciones
   - Badges visuales para estados y métodos de pago
   - Hover effects para mejor UX

4. **Modal de Confirmación**
   - Resumen de la orden
   - Advertencia sobre la generación automática de créditos
   - Botones de Cancelar y Confirmar

### Acceso desde el Menú

En el Sidebar del dashboard (sección Panel Maestro):
```
📋 Panel Maestro
  ├── 🏫 Gestión de Escuelas
  └── 💳 Órdenes de Compra  ← NUEVO
```

## 🔐 Seguridad

### Control de Acceso
- ✅ Solo usuarios con rol `ADMIN` o `STAFF` pueden:
  - Ver las órdenes
  - Confirmar pagos manualmente
  
### Validaciones
- ✅ Verificación de sesión activa
- ✅ Verificación de rol autorizado
- ✅ Verificación de estado de orden antes de confirmar
- ✅ Prevención de duplicación de créditos
- ✅ Registro de auditoría (quién confirmó el pago)

### Transacciones
- ✅ Toda la confirmación de pago se realiza en una transacción atómica
- ✅ Si falla algún paso, se hace rollback completo
- ✅ Consistencia garantizada entre orden, créditos y códigos

## 📝 Flujo Completo

### 1. Director solicita licencias
```
Director → Llenar formulario → Crear orden → Estado: PENDING
```

### 2. Director elige método de pago
```
a) Stripe/PayPal/MercadoPago → Pago automático → Estado: COMPLETED
b) Transferencia/Efectivo → Realiza pago offline → Espera confirmación
```

### 3. Para pagos manuales
```
Director → Realiza transferencia/depósito
    ↓
Director → Envía comprobante al admin (email/WhatsApp/portal)
    ↓
Admin → Ve orden en /dashboard/admin/ordenes
    ↓
Admin → Verifica comprobante
    ↓
Admin → Click "Marcar Pagada"
    ↓
Sistema → Genera créditos automáticamente
    ↓
Estado → COMPLETED
    ↓
Director → Puede canjear códigos de licencia
```

## 🎯 Casos de Uso

### Caso 1: Pago por Transferencia
1. Colegio "San José" solicita 30 licencias STANDARD
2. Elige método "Transferencia Bancaria"
3. Orden creada con estado `PENDING`
4. Director realiza transferencia bancaria de $15,000 MXN
5. Director envía comprobante por WhatsApp al admin
6. Admin verifica comprobante en banco
7. Admin entra a `/dashboard/admin/ordenes`
8. Busca "San José"
9. Click en "Marcar Pagada"
10. Confirma en modal
11. Sistema genera 30 créditos automáticamente
12. Director puede ver 30 códigos disponibles

### Caso 2: Pago en Efectivo
1. Colegio "María Auxiliadora" solicita 15 licencias PREMIUM
2. Director visita oficinas y paga en efectivo
3. Admin recibe el pago físico
4. Admin entra a `/dashboard/admin/ordenes`
5. Encuentra la orden pendiente
6. Click en "Marcar Pagada"
7. Sistema genera créditos
8. Admin entrega recibo físico al director

### Caso 3: Revisar Historial
1. Admin necesita ver todas las compras del mes
2. Entra a `/dashboard/admin/ordenes`
3. Filtra por estado "COMPLETED"
4. Busca por nombre de escuela si necesita algo específico
5. Revisa montos y fechas
6. Exporta datos si es necesario (función futura)

## 🚀 Próximas Mejoras

### Fase 2 (Futuro)
- [ ] Exportar a Excel/CSV
- [ ] Envío automático de notificaciones al director al confirmar pago
- [ ] Carga de comprobantes de pago por parte del director
- [ ] Historial de cambios de estado
- [ ] Notas del administrador en cada orden
- [ ] Filtro por rango de fechas
- [ ] Generación de facturas automáticas
- [ ] Dashboard de métricas financieras avanzadas

## 📊 Métricas de Rendimiento

### Tiempos esperados:
- ⚡ Carga de órdenes: < 1 segundo
- ⚡ Búsqueda/Filtrado: Instantáneo (cliente)
- ⚡ Confirmación de pago: 2-3 segundos
- ⚡ Generación de créditos: Incluido en confirmación

## 🐛 Troubleshooting

### Problema: "Los créditos para esta orden ya fueron generados"
**Solución**: La orden ya fue procesada. Verificar el estado en la BD.

### Problema: "No se puede confirmar una orden en estado COMPLETED"
**Solución**: La orden ya fue completada anteriormente.

### Problema: No aparecen las órdenes
**Solución**: 
1. Verificar que el usuario tenga rol ADMIN o STAFF
2. Revisar logs del servidor
3. Verificar conexión a BD

### Problema: Error al generar créditos
**Solución**: 
1. Revisar logs para ver qué paso falló
2. La transacción hace rollback automáticamente
3. Intentar nuevamente o contactar soporte técnico

## 📞 Soporte

Para cualquier duda o problema:
- 📧 Email: soporte@frutosdelespiritu.com
- 💬 Slack: #soporte-tecnico
- 📱 WhatsApp: [Número de soporte]

---

**Última actualización**: 23 de diciembre de 2025
**Versión del sistema**: 1.0.0
**Autor**: Equipo de Desarrollo Frutos del Espíritu
