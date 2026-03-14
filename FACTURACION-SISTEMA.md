# Sistema de Facturación Electrónica - Impacto Cuántico

## Descripción

Sistema completo de facturación electrónica CFDI 4.0 integrado con Facturapi para la emisión de facturas de talleres y eventos.

## Configuración

### 1. Variables de Entorno

Agrega las siguientes variables a tu archivo `.env`:

```env
# Facturapi - Sistema de Facturación
FACTURAPI_API_KEY=<tu-api-key-de-facturapi>
FACTURAPI_LIVE_MODE=false
```

### 2. Obtener API Key de Facturapi

1. Crea una cuenta en [Facturapi](https://www.facturapi.io/)
2. Ve a **Configuración** → **API Keys**
3. Copia tu API Key (comienza con `sk_test` para pruebas o `sk_live` para producción)

### 3. Configurar Datos Fiscales del Emisor

En el dashboard de Facturapi:
1. Ve a **Mi Organización**
2. Completa:
   - RFC del emisor
   - Razón social
   - Régimen fiscal
   - Código postal
   - Certificados CSD (para producción)

## Flujo de Facturación

```
┌─────────────────────────────────────────────────────────────────┐
│                    FLUJO DE FACTURACIÓN                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  1. REGISTRO DE EVENTO                                          │
│     └─ Usuario solicita factura (requiresInvoice: true)         │
│     └─ Ingresa: RFC, Nombre, C.P., Régimen, Uso CFDI            │
│                                                                 │
│  2. PAGO COMPLETADO (Stripe/MercadoPago)                        │
│     └─ verify-payment detecta requiresInvoice                   │
│     └─ Llama a processInvoice()                                 │
│                                                                 │
│  3. GENERACIÓN AUTOMÁTICA                                       │
│     └─ Si Facturapi está configurado → Genera factura           │
│     └─ Si NO está configurado → invoiceStatus: 'PENDING'        │
│                                                                 │
│  4. RESULTADO                                                   │
│     └─ COMPLETED: Factura generada, PDF/XML disponibles         │
│     └─ ERROR: Se guarda el error, admin puede reintentar        │
│     └─ PENDING: Esperando configuración de Facturapi            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## APIs Disponibles

### POST /api/invoices/generate
Genera una factura manualmente para un registro.

```json
{
  "registrationId": 123,
  "manual": true
}
```

### POST /api/invoices/retry
Reintenta generar una factura que falló.

```json
{
  "registrationId": 123
}
```

### GET /api/invoices/list
Lista todas las facturas (solo admin).

Query params:
- `status`: PENDING | PROCESSING | COMPLETED | ERROR
- `productId`: ID del producto
- `page`: Número de página
- `limit`: Resultados por página

### GET /api/invoices/[invoiceId]
Obtiene detalles de una factura.

Query params:
- `format`: json | pdf | xml

## Dashboard de Administración

Accede al dashboard de facturas en:
```
/dashboard/school-admin/facturas
```

Funcionalidades:
- ✅ Ver todas las facturas con su estado
- ✅ Filtrar por estado (Pendiente, Procesando, Completada, Error)
- ✅ Buscar por nombre, email, RFC o producto
- ✅ Descargar PDF y XML de facturas completadas
- ✅ Reintentar facturas con error
- ✅ Ver estadísticas de facturación

## Catálogos SAT

### Régimen Fiscal (más comunes)

| Código | Descripción |
|--------|-------------|
| 601 | General de Ley Personas Morales |
| 612 | Personas Físicas con Actividades Empresariales |
| 616 | Sin obligaciones fiscales |
| 626 | Régimen Simplificado de Confianza (RESICO) |

### Uso CFDI (más comunes)

| Código | Descripción |
|--------|-------------|
| G01 | Adquisición de mercancías |
| G03 | Gastos en general |
| D10 | Pagos por servicios educativos |
| S01 | Sin efectos fiscales |

### Forma de Pago

| Código | Descripción |
|--------|-------------|
| 01 | Efectivo |
| 03 | Transferencia electrónica |
| 04 | Tarjeta de crédito |
| 28 | Tarjeta de débito |

## Estructura de Base de Datos

Los campos de facturación están en el modelo `EventRegistration`:

```prisma
model EventRegistration {
  // ... otros campos
  requiresInvoice  Boolean  @default(false)
  invoiceRfc       String?
  invoiceName      String?
  invoiceZipCode   String?
  invoiceRegime    String?
  invoiceCfdiUse   String?
  invoiceId        String?
  invoiceStatus    String?  @default("PENDING")
  invoicePdfUrl    String?
  invoiceXmlUrl    String?
  invoiceError     String?
}
```

## Manejo de Errores

### Errores Comunes

1. **RFC inválido**: El RFC no tiene el formato correcto
   - Solución: Verificar que sea 12 caracteres (moral) o 13 (física)

2. **Código postal no existe**: El C.P. no está en el catálogo del SAT
   - Solución: Verificar el código postal

3. **Régimen fiscal incompatible**: El régimen no es válido para el tipo de RFC
   - Solución: Usar régimen correcto según tipo de contribuyente

4. **Facturapi no configurado**: No hay API key
   - Solución: Agregar `FACTURAPI_API_KEY` al .env

## Modo Producción

Para activar el modo producción:

1. Obtén tu API Key de producción en Facturapi
2. Sube tus certificados CSD al dashboard de Facturapi
3. Actualiza las variables de entorno:

```env
FACTURAPI_API_KEY=<tu-api-key-de-produccion>
FACTURAPI_LIVE_MODE=true
```

⚠️ **IMPORTANTE**: En modo producción, las facturas son timbradas ante el SAT y tienen validez fiscal real.

## Soporte

Para problemas con facturación:
1. Revisa los logs en la consola del servidor
2. Verifica el campo `invoiceError` en el registro
3. Consulta la documentación de Facturapi: https://docs.facturapi.io/
