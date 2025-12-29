# Sistema de Gestión de Avatar Cuántico

## Descripción General
Sistema completo de gestión de avatares cuánticos con renovación mensual y notificaciones automatizadas.

## Funcionalidades Implementadas

### 1. Generación de Avatar
- **Selfie con IA**: Genera avatar desde foto usando Replicate PhotoMaker
- **IA Generativa**: Crea avatar con DALL-E basado en personalidad
- **Designaciones en Español**: ARQUITECTO NEURAL, CAZADOR VELOZ, VANGUARDIA LÓGICA, etc.
- **Selección de Género**: male, female, neutral antes de generar

### 2. Perfil de Usuario (perfil-completo)
- **Visualización**: Muestra avatar actual con efecto glow morado
- **Botón de Regeneración**: Permite cambiar avatar
- **Restricción de 30 días**: Deshabilita cambio si no han pasado 30 días
- **Contador de Días**: Muestra "Podrás generar un nuevo avatar en X días"
- **Modal Integrado**: Abre QuantumIdentityModal para regenerar

### 3. Tracking en Base de Datos
- **Campo**: `lastAvatarChangeDate DateTime?` en modelo Usuario
- **Actualización Automática**: Se actualiza en ambos endpoints:
  - `/api/avatar/generate-from-selfie` (línea 212)
  - `/api/quantum-identity` (línea 305)

### 4. Sistema de Notificaciones Mensuales

#### Endpoint Cron
**Ruta**: `/app/api/cron/avatar-reminder/route.ts`

**Funcionalidad**:
- Busca usuarios con avatar de más de 30 días
- Crea notificación tipo `AVATAR_RENEWAL_REMINDER`
- Evita duplicados verificando notificaciones no leídas
- Retorna estadísticas de notificaciones creadas

**Respuesta**:
```json
{
  "success": true,
  "usuariosElegibles": 15,
  "notificacionesCreadas": 12,
  "message": "Recordatorios enviados exitosamente"
}
```

#### Banner de Notificación
**Componente**: `/components/dashboard/NotificationBanner.tsx`

**Características**:
- Detecta notificaciones tipo `AVATAR_RENEWAL_REMINDER`
- Muestra banner con diseño morado/rosa (temática avatar)
- Incluye botón **"Ir a Mi Perfil"** que redirige a `/dashboard/perfil-completo`
- Permite marcar como leída con botón "Entendido"
- Se cierra automáticamente al hacer clic en cualquier acción

**UI del Banner**:
- Fondo: Gradiente purple-900/pink-900
- Icono: Sparkles (✨) animado
- Título: "✨ Renueva tu Avatar Cuántico"
- Mensaje personalizado con call-to-action
- Botón primario: "Ir a Mi Perfil" con ícono de User
- Botón secundario: "Entendido" para dismissal

## Configuración del Cron Job

### Opción 1: Vercel Cron (Recomendado)

Agregar a `vercel.json`:

```json
{
  "crons": [
    {
      "path": "/api/cron/avatar-reminder",
      "schedule": "0 10 1 * *"
    }
  ]
}
```

**Schedule**: `0 10 1 * *` = Cada día 1 del mes a las 10:00 AM UTC

### Opción 2: Servicio Externo

Usar servicios como:
- **cron-job.org**
- **EasyCron**
- **GitHub Actions**

**Configuración**:
- URL: `https://tu-dominio.com/api/cron/avatar-reminder`
- Método: GET
- Header: `Authorization: Bearer ${CRON_SECRET}`
- Frecuencia: Diaria o mensual

## Variables de Entorno

```bash
# .env
CRON_SECRET=tu_clave_secreta_aqui
```

## Archivos Modificados

### Frontend
1. **app/dashboard/perfil-completo/page.tsx**
   - Agregado UI de Avatar Cuántico
   - Lógica de 30 días implementada
   - Integración con QuantumIdentityModal

### Backend
2. **app/api/configuracion/route.ts**
   - Retorna `profileImage` y `lastAvatarChangeDate`

3. **app/api/avatar/generate-from-selfie/route.ts**
   - Actualiza `lastAvatarChangeDate` al guardar

4. **app/api/quantum-identity/route.ts**
   - Actualiza `lastAvatarChangeDate` al guardar

5. **app/api/cron/avatar-reminder/route.ts** (NUEVO)
   - Endpoint completo para cron job mensual

### Base de Datos
6. **prisma/schema.prisma**
   - Agregado `lastAvatarChangeDate DateTime?` en Usuario (línea 792)
   - Agregado `AVATAR_RENEWAL_REMINDER` en NotificationType (línea 1828)

## Flujo de Usuario

### Primera Vez (Wizard)
1. Usuario completa pasos 1-4 del wizard
2. Llega al paso 5: Quantum Identity
3. Selecciona género (Hombre/Mujer/Prefiero no decirlo)
4. Elige método:
   - **Con Selfie**: Captura foto → Genera avatar con PhotoMaker
   - **Con IA**: Responde preguntas → Genera con DALL-E
5. Sistema guarda avatar y establece `lastAvatarChangeDate = now()`

### Desde Perfil
1. Usuario va a `/dashboard/perfil-completo`
2. Ve su avatar actual con glow efecto
3. Si han pasado 30+ días:
   - Botón "Generar Nuevo Avatar" habilitado
   - Click abre modal para regenerar
   - Proceso igual que wizard paso 5
4. Si NO han pasado 30 días:
   - Botón deshabilitado con opacidad 50%
   - Mensaje: "Podrás generar un nuevo avatar en X días"

### Notificación Mensual
1. Cron job se ejecuta (diario o mensual)
2. Encuentra usuarios con avatar de 30+ días
3. Crea notificación:
   - **Tipo**: AVATAR_RENEWAL_REMINDER
   - **Título**: "✨ Renueva tu Avatar Cuántico"
   - **Mensaje**: "¡Ya puedes actualizar tu avatar cuántico! Refleja tu evolución personal..."
   - **Metadata**: `{ canRenew: true, lastChangeDate: "..." }`
4. Usuario ve notificación en su panel
5. Click en "enterado" la marca como leída
6. Usuario puede ir a perfil y regenerar

## Testing

### Manual
```bash
# 1. Probar endpoint de configuración
curl http://localhost:3000/api/configuracion \
  -H "Cookie: tu_session_cookie"

# 2. Probar cron job
curl http://localhost:3000/api/cron/avatar-reminder \
  -H "Authorization: Bearer ${CRON_SECRET}"

# 3. Verificar notificaciones creadas
# Ir a /dashboard y ver panel de notificaciones
```

### Con Usuario Real
1. Login en la plataforma
2. Ir a `/dashboard/perfil-completo`
3. Verificar que se muestre avatar actual
4. Si han pasado 30 días, probar regeneración
5. Verificar que mensaje de restricción aparezca correctamente

## Mejoras Futuras

- [ ] Historial de avatares generados
- [ ] Preview de avatar antes de confirmar
- [ ] Galería de avatares previos
- [ ] Opción de revertir a avatar anterior
- [ ] Analytics de cambios de avatar
- [ ] A/B testing de frecuencias de cambio
- [ ] Integración con sistema de logros (badge por cambiar avatar)
- [ ] Opción de exportar avatar en alta resolución

## Troubleshooting

### Botón siempre deshabilitado
- Verificar que `lastAvatarChangeDate` exista en DB
- Revisar cálculo de 30 días en cliente
- Comprobar timezone del servidor vs cliente

### Notificaciones duplicadas
- Cron job verifica notificaciones no leídas
- Si persiste, revisar query en línea 55-60 del cron job

### Avatar no se actualiza
- Verificar que Prisma client esté actualizado
- Comprobar que ambos endpoints actualicen el campo
- Revisar logs de Replicate/OpenAI

### Cron job no se ejecuta
- Verificar configuración en vercel.json
- Comprobar que CRON_SECRET esté en variables de entorno
- Revisar logs de Vercel en dashboard

## Soporte

Para reportar bugs o solicitar features:
1. Crear issue en repositorio
2. Incluir logs relevantes
3. Describir pasos para reproducir
4. Mencionar navegador y versión

---

**Versión**: 1.0.0  
**Última actualización**: Diciembre 2024  
**Estado**: ✅ Implementado completamente
