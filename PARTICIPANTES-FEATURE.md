# 📊 Feature: Mis Participantes (Vista Mentor)

## ✅ Componentes Creados

### 1. Vista Principal - `/dashboard/mentor/participantes`
**Archivo**: `app/dashboard/mentor/participantes/page.tsx`

**Características**:
- ✅ Lista completa de participantes asignados
- ✅ Búsqueda en tiempo real por nombre/email
- ✅ Tarjetas de estadísticas (Total, Activos, En Riesgo)
- ✅ Tabla moderna con hover effects
- ✅ Progreso visual con barra de colores
- ✅ Estados: Activo (verde), Riesgo (amarillo), Inactivo (rojo)
- ✅ Acciones rápidas: Mensaje, Agendar, Ver Perfil
- ✅ **Notificaciones Socket.IO en tiempo real** cuando se asigna nuevo participante

### 2. API Backend - `/api/mentor/mis-participantes`
**Archivo**: `app/api/mentor/mis-participantes/route.ts`

**Consulta Optimizada**:
```typescript
- Obtiene participantes con assignedMentorId = mentorId
- Incluye: CartaFrutos → Meta → Accion
- Incluye: Última sesión completada (CallBooking)
- Calcula: Progreso general, Metas completadas, Estado
- Ordena: Por nombre alfabéticamente
```

**Métricas Calculadas**:
- `progreso`: Promedio de avance de todas las metas
- `estado`: Basado en última sesión y progreso
- `metasCompletadas`: Metas con avance >= 100%
- `ultimaSesion`: Fecha formateada de última sesión

### 3. API Asignación - `/api/admin/asignar-participante`
**Archivo**: `app/api/admin/asignar-participante/route.ts`

**Función**: Asignar participante a mentor (Solo Admin/Coordinador)

**Notificación Socket.IO**:
```typescript
emitToMentor(mentorId, 'participant_assigned', {
  participanteId,
  nombre,
  email,
  imagen,
  asignadoPor,
  fecha
});
```

## 🔔 Notificaciones en Tiempo Real

**Evento**: `participant_assigned`

**Flujo**:
1. Admin asigna participante desde `/api/admin/asignar-participante`
2. Se emite evento Socket.IO al mentor específico
3. Vista de participantes escucha el evento con `useSocketEvent`
4. Muestra toast de notificación
5. Recarga automáticamente la lista

## 🎨 Diseño UI

**Colores**:
- Fondo: `slate-950` (negro suave)
- Tarjetas: `slate-900` con border `slate-800`
- Hover: `slate-800/50`
- Primario: `purple-600` (botones)
- Estados:
  - Activo: `green-500`
  - Riesgo: `yellow-500`
  - Inactivo: `red-500`

**Animaciones**:
- Hover en filas: `hover:bg-slate-800/50`
- Acciones: `opacity-0 group-hover:opacity-100`
- Toast: `animate-slideInRight`

## 🚀 Cómo Probar

### 1. Acceder a la Vista
```
http://localhost:3000/dashboard/mentor/participantes
```

### 2. Ver Participantes
- Inicia sesión como MENTOR
- Verás todos los participantes con `assignedMentorId` = tu ID
- Usa la búsqueda para filtrar

### 3. Probar Notificación Socket.IO
En terminal o Postman:

```bash
curl -X POST http://localhost:3000/api/admin/asignar-participante \
  -H "Content-Type: application/json" \
  -d '{
    "participanteId": 123,
    "mentorId": 456
  }'
```

**Resultado**:
- El mentor con ID 456 recibirá notificación en tiempo real
- Toast verde aparece: "Nuevo Participante Asignado"
- Lista se recarga automáticamente

### 4. Ver Detalles del Participante
- Click en icono `TrendingUp` (estadísticas)
- Redirige a `/dashboard/lideres/{participanteId}`

## 📊 Optimización SQL

**Índices Requeridos** (ya existen en Prisma):
```sql
CREATE INDEX idx_usuario_assigned_mentor ON "Usuario"(assignedMentorId);
CREATE INDEX idx_usuario_rol_active ON "Usuario"(rol, isActive);
CREATE INDEX idx_callbooking_student_status ON "CallBooking"(studentId, status);
```

**Query Optimizada**:
- 1 query principal con includes anidados
- Filtro por `assignedMentorId` (indexed)
- Solo participantes activos
- Order by nombre (alfabético)

## 🎯 Próximos Pasos

1. **Página de Perfil Individual**
   - `/dashboard/mentor/participantes/[id]`
   - Historial completo de sesiones
   - Gráficas de progreso

2. **Chat en Tiempo Real**
   - `/dashboard/mentor/chat/[participanteId]`
   - Mensajería directa con Socket.IO

3. **Agenda Integrada**
   - `/dashboard/mentor/agendar/[participanteId]`
   - Calendario con disponibilidad

4. **Reportes Exportables**
   - PDF con progreso de participantes
   - Excel con métricas

## 🐛 Troubleshooting

**Problema**: No aparecen participantes
- Verificar: `assignedMentorId` en tabla Usuario
- SQL: `SELECT * FROM "Usuario" WHERE assignedMentorId = {mentorId}`

**Problema**: Notificación no llega
- Verificar: Servidor Socket.IO corriendo (`npm run dev:socket`)
- Verificar: Usuario en room correcto (`mentor:{mentorId}`)
- Check: Console del navegador para errores

**Problema**: Progreso incorrecto
- Verificar: CartaFrutos existe para el participante
- Verificar: Metas tienen campo `avance` poblado
- Check: SQL: `SELECT * FROM "Meta" WHERE cartaId = {cartaId}`

## 📝 Notas Técnicas

- **Performance**: Query optimizada para 1k-10k usuarios
- **Socket.IO**: Modo standalone (Redis opcional)
- **TypeScript**: Fully typed con interfaces
- **Responsive**: Funciona en mobile y desktop
- **Accesibilidad**: Títulos en botones, colores contrastados

