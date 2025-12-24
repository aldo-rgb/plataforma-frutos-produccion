# Sistema de Pagos y Gestión de Licencias

## Fecha de implementación: 23 de diciembre de 2025

## Descripción General

Sistema completo para la gestión de órdenes de compra de licencias escolares, incluyendo:
- Visualización de comprobantes de pago
- Confirmación manual de pagos por administradores
- Actualización automática de créditos escolares
- Notificaciones para administradores y coordinadores

## Componentes del Sistema

### 1. Panel de Administrador (`/dashboard/admin/ordenes`)

**Archivo:** `/app/dashboard/admin/ordenes/page.tsx`

**Funcionalidades:**
- Lista todas las órdenes de licencias con filtrado por estado
- Visualización de estadísticas (pendientes, completadas, en proceso, ingresos)
- Modal dedicado para visualizar comprobantes de pago
- Modal de confirmación para aprobar pagos
- Botón "Ver" para revisar comprobantes sin compromiso
- Botón "Marcar como Pagada" para confirmar y generar créditos

**Estados de órdenes:**
- `PENDING`: Orden creada, sin comprobante de pago
- `PROCESSING`: Comprobante subido, esperando aprobación del administrador
- `COMPLETED`: Pago confirmado, créditos generados
- `FAILED`: Pago fallido
- `CANCELLED`: Orden cancelada
- `REFUNDED`: Pago reembolsado

**Características clave:**
- Comparación case-insensitive para método de pago (TRANSFER)
- Dos modales separados: visualización vs confirmación
- Descarga de comprobantes de pago
- Detalles completos de cada orden

### 2. API de Confirmación de Pagos

**Archivo:** `/app/api/admin/license-orders/[orderId]/mark-paid/route.ts`

**Endpoint:** `POST /api/admin/license-orders/:orderId/mark-paid`

**Proceso de confirmación:**

1. **Validación:**
   - Verifica que el usuario sea ADMINISTRADOR
   - Confirma que la orden existe
   - Valida que el estado sea PENDING o PROCESSING
   - Verifica que los créditos no se hayan generado previamente

2. **Transacción atómica:**
   ```typescript
   a) Actualizar orden a COMPLETED
   b) Registrar fecha de pago (paidAt)
   c) Marcar créditos como generados (creditsGenerated: true)
   d) Guardar datos de confirmación manual (quién, cuándo)
   ```

3. **Actualización de créditos:**
   - Busca registro existente en `SchoolCredit` para la organización
   - Si existe: incrementa `totalPurchased` y `totalPaid`
   - Si no existe: crea nuevo registro con los datos de la compra

4. **Sin generación automática de códigos:**
   - Los códigos de licencia NO se generan automáticamente
   - El coordinador los genera desde su panel cuando los necesita
   - Esto evita crear 100+ códigos que tal vez no se usen inmediatamente

**Respuesta exitosa:**
```json
{
  "success": true,
  "message": "Pago confirmado y créditos actualizados exitosamente",
  "order": {...},
  "creditsAdded": 100
}
```

### 3. API de Pagos Pendientes

**Archivo:** `/app/api/admin/pending-payments/route.ts`

**Endpoint:** `GET /api/admin/pending-payments`

**Funcionalidad:**
- Retorna todas las órdenes con estado PROCESSING
- Solo accesible para usuarios ADMINISTRADOR
- Incluye detalles de la organización
- Usado para mostrar notificaciones en el dashboard

### 4. Modelos de Base de Datos

#### LicenseOrder
```prisma
model LicenseOrder {
  id                 String              @id @default(cuid())
  organizationId     Int
  requestedBy        Int
  quantity           Int
  tier               UserTier
  amount             Float
  paymentMethod      String              // 'TRANSFER', 'STRIPE', etc.
  status             LicenseOrderStatus  // PENDING, PROCESSING, COMPLETED
  paymentData        Json?               // Incluye proofUrl, uploadedAt
  creditsGenerated   Boolean             @default(false)
  creditsGeneratedAt DateTime?
  paidAt             DateTime?
  createdAt          DateTime
  updatedAt          DateTime
}
```

#### SchoolCredit
```prisma
model SchoolCredit {
  id                Int           @id @default(autoincrement())
  organizationId    Int
  planType          UserTier      @default(STANDARD)
  totalPurchased    Int           @default(0)    // Licencias compradas
  totalAllocated    Int           @default(0)    // Códigos generados
  totalPaid         Float         @default(0.00) // Monto total pagado
  unitPrice         Float         @default(600.00)
  isActive          Boolean       @default(true)
}
```

#### License
```prisma
model License {
  id                Int           @id @default(autoincrement())
  code              String        @unique
  batchName         String?
  organizationId    Int?
  tierAssigned      UserTier      @default(STANDARD)
  maxUses           Int           @default(100)
  usedCount         Int           @default(0)
  isMasterCode      Boolean       @default(false)
  generationMode    String?       @default("INDIVIDUAL")
  isActive          Boolean       @default(true)
  expiresAt         DateTime?
}
```

## Flujo de Trabajo Completo

### Para el Coordinador Escolar:

1. **Solicitar licencias:**
   - Accede a su panel de school-admin
   - Solicita cantidad de licencias deseadas
   - Recibe datos bancarios para transferencia

2. **Subir comprobante:**
   - Realiza transferencia bancaria
   - Sube comprobante de pago (imagen)
   - Orden cambia a estado PROCESSING

3. **Esperar aprobación:**
   - Recibe notificación cuando se apruebe
   - Los créditos aparecen disponibles en su panel

4. **Generar códigos:**
   - Desde su panel genera códigos individuales
   - Asigna códigos a estudiantes específicos

### Para el Administrador:

1. **Recibir notificación:**
   - Banner azul en dashboard: "Tienes X pagos pendientes de revisión"
   - KPI card muestra cantidad de pagos PROCESSING

2. **Revisar comprobante:**
   - Click en "Revisar Pagos" → va a `/admin/ordenes`
   - Click en botón "Ver" (azul) en columna Comprobante
   - Ve imagen completa del comprobante
   - Puede descargar el comprobante

3. **Confirmar pago:**
   - Dentro del modal de visualización
   - Click en "Marcar como Pagada" (verde)
   - Confirma en modal de confirmación
   - Sistema genera créditos automáticamente

## Archivos de Comprobantes

**Ubicación:** `/public/uploads/payment-proofs/`

**Formato:** `proof-{orderId}-{timestamp}.png`

**URL guardada:** `/uploads/payment-proofs/proof-...png`

**Acceso:** Archivos en `/public` son accesibles directamente desde el navegador

## Esquema de Colores

- **Rojo:** PENDING (sin pago)
- **Azul/Cyan:** PROCESSING (pendiente de revisión)
- **Verde:** COMPLETED (confirmado)
- **Gris:** CANCELLED
- **Morado:** REFUNDED

## Notificaciones

### Dashboard Admin:
```typescript
// Banner superior
{pendingPayments.length > 0 && (
  <div className="bg-cyan-900/20 border-l-4 border-cyan-500">
    Tienes {pendingPayments.length} pagos pendientes de revisión
  </div>
)}

// KPI Card
<div className="bg-gradient-to-br from-cyan-900/50 to-cyan-800/30">
  <h3>Pagos Pendientes</h3>
  <p className="text-3xl">{pendingPayments.length}</p>
</div>
```

### Dashboard School Admin:
- Widget muestra PROCESSING como "X licencias por activar"
- Color azul para indicar pendiente de aprobación
- No muestra órdenes PROCESSING en widget de "pago pendiente"

## Seguridad

1. **Autenticación:** Solo usuarios autenticados
2. **Autorización:** 
   - ADMINISTRADOR: puede ver todas las órdenes y confirmar pagos
   - SCHOOL_ADMIN: solo ve órdenes de su organización
3. **Validación:** 
   - No permite confirmar órdenes ya completadas
   - No permite generar créditos duplicados
   - Transacciones atómicas para consistencia

## Mejoras Futuras Sugeridas

1. **Generación automática de códigos (opcional):**
   - Activar flag en SchoolCredit para generar códigos automáticamente
   - Útil para compras grandes

2. **Notificaciones por email:**
   - Enviar email al coordinador cuando se apruebe pago
   - Enviar email al admin cuando se suba comprobante

3. **Historial de pagos:**
   - Panel para ver historial de todas las transacciones
   - Reportes de ingresos por mes/año

4. **Integración con pasarelas de pago:**
   - Stripe, PayPal, MercadoPago
   - Confirmación automática de pagos en línea

5. **Panel de códigos:**
   - Dashboard para ver códigos generados
   - Status de cada código (activo, usado, expirado)
   - Búsqueda por código o estudiante

## Pruebas

### Para probar el sistema:

1. **Crear orden de prueba:**
   ```bash
   node -e "const { PrismaClient } = require('@prisma/client'); ..."
   ```

2. **Subir comprobante:**
   - Desde panel school-admin
   - Usar imagen de prueba

3. **Verificar estado:**
   - Dashboard admin debe mostrar notificación
   - Orden debe aparecer en lista con estado PROCESSING

4. **Confirmar pago:**
   - Click en "Ver" para revisar
   - Click en "Marcar como Pagada"
   - Verificar que créditos se actualicen en SchoolCredit

5. **Verificar logs:**
   ```
   💰 Admin {nombre} confirmando pago manual de orden {id}
   ✅ Pago confirmado exitosamente
   📊 Créditos comprados ahora: {total}
   ```

## Soporte

Para dudas o problemas:
1. Revisar logs del servidor (npm run dev)
2. Verificar estado de la orden en base de datos
3. Revisar que el archivo de comprobante exista en `/public/uploads/payment-proofs/`
4. Verificar permisos de usuario (ADMINISTRADOR vs SCHOOL_ADMIN)

## Changelog

### 23 de diciembre de 2025
- ✅ Implementación inicial del sistema
- ✅ Modal de visualización de comprobantes
- ✅ Endpoint de confirmación de pagos
- ✅ Actualización de SchoolCredit
- ✅ Notificaciones en dashboard admin
- ✅ Fix comparación case-insensitive para paymentMethod
- ✅ Separación de modales (ver vs confirmar)
- ✅ Removida generación automática de códigos
