# Sistema de Perfil Completo de Usuario

## Descripción General

Se ha implementado un sistema completo de configuración de perfil de usuario que permite a participantes, coordinadores y directores completar su información personal detallada.

## Características Implementadas

### 1. Modelo de Base de Datos

Se creó el modelo `PerfilCompleto` en Prisma con los siguientes campos:

**Datos Personales:**
- Nombre y Apellido
- Fecha de Nacimiento
- Correo Electrónico (read-only)
- WhatsApp
- Ocupación/Oficio

**Información de Tribu:**
- Misión de Tribu
- Logo de Tribu (imagen JPG)
- Frase Favorita
- Número de Visión (auto-actualizado)
- Ángel de Enrolamiento

**Domicilio:**
- Calle, Número
- Colonia
- Código Postal
- Estado o Municipio

**Datos Físicos y Salud:**
- Talla de Camiseta (XS, S, M, L, XL, XXL, XXXL)
- Peso (kg)
- Estatura (cm)
- IMC (calculado automáticamente)
- Foto de Primer Ticket de Peso
- ¿Fumas? (Sí/No y cantidad)

**Coaches y Staff:**
- ¿Quiero ser Staff? (checkbox)
- Coach de Básico
- Staff de Básico
- Coach de Avanzado
- Staff de Avanzado
- Game Changer (asignado automáticamente)
- Coach de 1er Fin
- Coach de 2do Fin
- Coach de 3er Fin

**Fotos y Documentos:**
- Foto de Primer Día (JPG)
- Foto de Último Día de PL (JPG)
- Foto de Contrato (JPG)
- Contrato Avanzado (PDF/Imagen)

**Condecoraciones:**
Sistema de condecoraciones asignadas por coordinadores:
- Básico
- Avanzado
- 1er Fin
- 2do Fin
- 3er Fin
- Staff Básico
- Staff Avanzado
- Senior Certificado
- Master Senior
- Coach
- Master Coach

### 2. Endpoints API

#### `/api/configuracion` (GET)
- Obtiene la configuración completa del usuario autenticado
- Incluye datos del usuario (nombre, email, teléfono)
- Obtiene o crea el perfil completo si no existe
- Recupera el nombre del Game Changer asignado
- Obtiene el número de visión activa

#### `/api/configuracion` (POST)
- Guarda la configuración completa del usuario
- Actualiza nombre y teléfono en el modelo Usuario
- Hace upsert del perfil completo
- Validación de datos

#### `/api/configuracion/upload` (POST)
- Endpoint para subir imágenes y documentos
- Validaciones:
  - Tipos permitidos: JPG, JPEG, PNG, PDF
  - Tamaño máximo: 10MB
- Genera nombres únicos con timestamp
- Guarda en `/public/uploads/configuracion/`
- Retorna URL pública del archivo

#### `/api/coordinador/condecoraciones/asignar` (POST)
- Permite a coordinadores asignar condecoraciones
- Valida que el coordinador tenga permisos
- Verifica que el usuario pertenezca a la misma organización
- Agrega condecoración si no está ya asignada

### 3. Páginas Frontend

#### `/dashboard/perfil-completo/page.tsx`
Nueva página completa con:
- **Interfaz moderna** con gradientes y colores temáticos
- **Secciones organizadas por categorías**:
  - 🔵 Datos Personales (cyan)
  - 🟣 Información de Tribu (purple)
  - 🟢 Domicilio (green)
  - 🟠 Datos Físicos y Salud (orange)
  - 🟡 Coaches y Staff (yellow)
  - 🩷 Fotos y Documentos (pink)
  - 🟡 Condecoraciones (yellow)

**Características de la Interfaz:**
- Cálculo automático de IMC al ingresar peso y estatura
- Condicional para campos de fumador (solo se muestra si selecciona "Sí")
- Vista previa de imágenes subidas
- Campos deshabilitados para datos automáticos (email, visión, game changer)
- Botón de guardar en header y footer
- Mensajes de éxito y error
- Loading states durante guardado y carga
- Responsive design (grid adapta a móvil)
- Iconos visuales para cada categoría

### 4. Funcionalidades Especiales

#### Cálculo Automático de IMC
```typescript
const calcularIMC = () => {
  if (peso && estatura) {
    const pesoNum = parseFloat(peso);
    const estaturaNum = parseFloat(estatura) / 100; // cm a m
    const imc = (pesoNum / (estaturaNum * estaturaNum)).toFixed(2);
    setConfig(prev => ({ ...prev, imc }));
  }
};
```

#### Upload de Imágenes
- Sistema de drag & drop para subir archivos
- Vista previa inmediata de imágenes
- Validación de tipo y tamaño
- Almacenamiento en sistema de archivos

#### Sistema de Condecoraciones
- Visual con colores distintivos para cada condecoración
- Solo visible pero no editable por el usuario
- Asignable únicamente por coordinadores

### 5. Seguridad y Validaciones

**Backend:**
- Autenticación requerida en todos los endpoints
- Validación de rol para coordinadores
- Validación de pertenencia a organización
- Límites de tamaño de archivo
- Tipos de archivo permitidos

**Frontend:**
- Campos obligatorios vs opcionales claramente definidos
- Validación de formato de email y teléfono
- Límites de caracteres
- Disabled states para campos read-only

### 6. Integración con Sistema Existente

**Datos Automáticos:**
- **Número de Visión**: Se obtiene de `VisionParticipante` con estado ACTIVA
- **Game Changer**: Se obtiene de `Usuario.gameChangerId`
- **Email**: Del registro de usuario (no editable)

**Relaciones:**
- Perfil vinculado 1:1 con Usuario mediante `usuarioId` único
- Compatible con todos los roles: PARTICIPANTE, DIRECTOR, COORDINADOR

## Rutas de Acceso

- **Usuarios**: `/dashboard/perfil-completo`
- **Configuración básica**: `/dashboard/configuracion` (página existente conservada)

## Base de Datos

**Tabla creada:** `PerfilCompleto`
- Clave primaria: `id`
- Clave única: `usuarioId`
- Timestamps: `createdAt`, `updatedAt`

## Archivos Creados/Modificados

### Nuevos Archivos:
1. `/prisma/schema.prisma` - Modelo PerfilCompleto agregado
2. `/app/api/configuracion/route.ts` - Endpoints GET/POST
3. `/app/api/configuracion/upload/route.ts` - Upload de archivos
4. `/app/api/coordinador/condecoraciones/asignar/route.ts` - Asignación de condecoraciones
5. `/app/dashboard/perfil-completo/page.tsx` - Página de perfil completo
6. `/public/uploads/configuracion/` - Directorio para archivos

### Archivos Conservados:
- `/app/dashboard/configuracion/page.tsx` - Configuración básica existente

## Uso del Sistema

### Para Usuarios (Participantes/Directores/Coordinadores):
1. Navegar a `/dashboard/perfil-completo`
2. Completar todos los campos deseados
3. Subir fotos y documentos requeridos
4. Hacer clic en "Guardar Configuración"

### Para Coordinadores (Asignar Condecoraciones):
```typescript
// POST /api/coordinador/condecoraciones/asignar
{
  "usuarioId": 27,
  "condecoracionId": "basico"
}
```

## Próximas Mejoras Sugeridas

1. **Validación de documentos**: OCR para verificar datos de contratos
2. **Notificaciones**: Alertar cuando se asigna una condecoración
3. **Historial**: Registro de cambios en el perfil
4. **Exportación**: Generar PDF con toda la información del perfil
5. **Integración con Supabase Storage**: Para almacenamiento cloud de imágenes
6. **Compresión de imágenes**: Optimizar tamaño de archivos subidos
7. **Validación de formulario**: Validación más estricta antes de guardar
8. **Progreso de completitud**: Barra de progreso mostrando % de perfil completado

## Notas Técnicas

- IMC se calcula en tiempo real sin necesidad de guardar
- Las imágenes se almacenan en el sistema de archivos local
- El sistema soporta tanto JPG como PNG para fotos
- PDFs se aceptan solo para contrato avanzado
- Todas las condecoraciones se almacenan como array en un solo campo

## Testing Recomendado

1. ✅ Probar guardado de perfil completo
2. ✅ Verificar cálculo automático de IMC
3. ✅ Upload de diferentes tipos de imágenes
4. ✅ Verificación de permisos de coordinador
5. ✅ Prueba de límites de tamaño de archivo
6. ✅ Responsive design en móvil
7. ✅ Validación de campos obligatorios vs opcionales

## Estado Actual

✅ **Sistema completamente implementado y funcional**
- Base de datos creada
- Endpoints API funcionando
- Interfaz de usuario completa
- Sistema de uploads implementado
- Validaciones en lugar
- Compatible con todos los roles
