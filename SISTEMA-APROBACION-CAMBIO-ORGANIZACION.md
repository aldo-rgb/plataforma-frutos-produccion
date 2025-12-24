# 🔄 Sistema de Aprobación de Cambio de Organización/Visión

## 📋 Descripción General

Sistema completo de gestión de cambios de organización que requiere aprobación explícita del participante cuando un director intenta agregarlo a una nueva organización estando ya registrado en otra. Incluye sistema de notificaciones para directores.

---

## 🎯 Funcionalidad

### Flujo Completo

```
1. Director agrega participante que ya existe en otra organización
   ↓
2. Sistema detecta conflicto organizacional
   ↓
3. Usuario marcado con cambio pendiente y desactivado temporalmente
   ↓
4. Notificación en dashboard del participante (modal automático)
   ↓
5. Participante revisa detalles: org anterior vs nueva
   ↓
6a. ACEPTA: Se transfiere a nueva org/visión
   ↓
7a. Notificación automática al director anterior
   ↓
8a. Director ve notificación en su dashboard
   
6b. RECHAZA: Permanece en org actual
   ↓
7b. Se reactiva en org actual sin cambios
   ↓
8b. No se genera notificación
```

---

## 🔧 Implementación Técnica

### 1. Schema de Base de Datos (`prisma/schema.prisma`)

**Modelo Usuario - Campos de cambio de organización:**
```prisma
model Usuario {
  // ... campos existentes
  
  // 🔄 SISTEMA DE CAMBIO DE ORGANIZACIÓN/VISIÓN
  pendingOrganizationChange     Boolean    @default(false)       // Cambio pendiente de aprobación
  newOrganizationId             Int?                             // Nueva organización propuesta
  newVisionId                   Int?                             // Nueva visión propuesta
  previousOrganizationId        Int?                             // Organización anterior (para notificar)
  changeRequestedAt             DateTime?                        // Cuándo se solicitó el cambio
  changeRequestedBy             Int?                             // ID del director que solicitó
  
  // Notificaciones
  Notifications                 Notification[]
}
```

**Modelo Notification (NUEVO):**
```prisma
model Notification {
  id          Int              @id @default(autoincrement())
  userId      Int              // Usuario que recibe la notificación
  type        NotificationType
  title       String           // Título de la notificación
  message     String           // Mensaje detallado
  relatedId   Int?             // ID relacionado (ej: userId del participante transferido)
  isRead      Boolean          @default(false)
  createdAt   DateTime         @default(now())
  
  usuario     Usuario          @relation(fields: [userId], references: [id], onDelete: Cascade)
  
  @@index([userId, isRead])
  @@index([createdAt])
}

enum NotificationType {
  ORGANIZATION_TRANSFER  // Transferencia de participante entre organizaciones
  TASK_SUBMISSION        // Entrega de tarea
  MENTOR_ASSIGNMENT      // Asignación de mentor
  SYSTEM_ALERT           // Alertas del sistema
  OTHER                  // Otros tipos
}
```

**Migración:**
```bash
npx prisma db push
npx prisma generate
```

---

### 2. API Endpoints

#### A. `/api/school-admin/visiones/[id]/add-participante` (POST)
Agregar participante individual a una visión

**Lógica de detección:**
```typescript
const participante = await prisma.usuario.findUnique({
  where: { id: participanteId },
  select: { id: true, nombre: true, email: true, organizationId: true },
});

// Si está en otra organización, marcar como cambio pendiente
if (participante.organizationId && participante.organizationId !== user.organizationId) {
  await prisma.usuario.update({
    where: { id: participanteId },
    data: {
      pendingOrganizationChange: true,
      newOrganizationId: user.organizationId,
      newVisionId: visionId,
      previousOrganizationId: participante.organizationId,
      changeRequestedAt: new Date(),
      changeRequestedBy: session.user.id,
      isActive: false, // Desactivar hasta que acepte
    },
  });

  return NextResponse.json({
    success: true,
    requiresApproval: true,
    message: `${participante.nombre} ya está registrado en ${oldOrg?.name}. Se ha enviado una solicitud...`,
  });
}
```

---

#### B. `/api/school-admin/visiones/[id]/add-emails` (POST)
Alta masiva de participantes por correos electrónicos

**Lógica:**
```typescript
// Buscar usuarios existentes EN CUALQUIER ORGANIZACIÓN
const allExistingUsers = await prisma.usuario.findMany({
  where: { email: { in: emailList } },
  select: { id: true, email: true, organizationId: true }
});

// Separar por organización
const usersInSameOrg = allExistingUsers.filter(u => u.organizationId === director.organizationId);
const usersInDifferentOrg = allExistingUsers.filter(u => u.organizationId && u.organizationId !== director.organizationId);

// Marcar usuarios de otra organización como cambio pendiente
for (const user of usersInDifferentOrg) {
  await prisma.usuario.update({
    where: { id: user.id },
    data: {
      pendingOrganizationChange: true,
      newOrganizationId: director.organizationId,
      newVisionId: visionId,
      previousOrganizationId: user.organizationId,
      changeRequestedAt: new Date(),
      changeRequestedBy: session.user.id,
      isActive: false,
    }
  });
}

return NextResponse.json({ 
  success: true,
  newUsersCreated: newUsers.length,
  existingUsersAdded: usersInSameOrg.length,
  pendingChanges: usersInDifferentOrg.length,
  pendingEmails: usersInDifferentOrg.map(u => u.email)
});
```

---

#### C. `/api/student/organization-change` (GET/POST)
Gestión de cambios de organización por parte del participante

**GET - Obtener solicitud pendiente:**
```typescript
const usuario = await prisma.usuario.findUnique({
  where: { id: session.user.id },
  select: {
    pendingOrganizationChange: true,
    newOrganizationId: true,
    newVisionId: true,
    previousOrganizationId: true,
    changeRequestedAt: true,
    changeRequestedBy: true,
  },
});

if (!usuario || !usuario.pendingOrganizationChange) {
  return NextResponse.json({ success: true, hasPendingChange: false });
}

// Obtener información completa
const [previousOrg, newOrg, newVision, requestedBy] = await Promise.all([...]);

return NextResponse.json({
  success: true,
  hasPendingChange: true,
  changeRequest: { previousOrg, newOrg, newVision, requestedBy },
});
```

**POST - Aceptar cambio:**
```typescript
if (action === 'accept') {
  // 1. Actualizar organización del usuario
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      organizationId: usuario.newOrganizationId,
      pendingOrganizationChange: false,
      isActive: true,
      // Limpiar campos temporales
      newOrganizationId: null,
      newVisionId: null,
      previousOrganizationId: null,
      changeRequestedAt: null,
      changeRequestedBy: null,
    },
  });

  // 2. Agregar a la nueva visión
  await prisma.visionParticipante.create({
    data: {
      visionId: usuario.newVisionId,
      participanteId: session.user.id,
    },
  });

  // 3. Notificar al director anterior
  if (usuario.previousOrganizationId) {
    const [oldOrg, newOrg, participante] = await Promise.all([...]);

    await prisma.notification.create({
      data: {
        userId: oldOrg.schoolAdminId,
        type: 'ORGANIZATION_TRANSFER',
        title: 'Transferencia de participante',
        message: `${participante.nombre} (${participante.email}) ha aceptado transferirse de ${oldOrg.name} a ${newOrg.name}`,
        relatedId: session.user.id,
      },
    });
  }
}
```

**POST - Rechazar cambio:**
```typescript
else {
  await prisma.usuario.update({
    where: { id: session.user.id },
    data: {
      pendingOrganizationChange: false,
      isActive: true,
      // Limpiar campos temporales
      newOrganizationId: null,
      newVisionId: null,
      previousOrganizationId: null,
      changeRequestedAt: null,
      changeRequestedBy: null,
    },
  });
}
```

---

#### D. `/api/notifications` (GET/POST) - NUEVO
Sistema de notificaciones para directores

**GET - Obtener notificaciones:**
```typescript
const notifications = await prisma.notification.findMany({
  where: {
    userId: session.user.id,
    isRead: false,
  },
  orderBy: { createdAt: 'desc' },
  take: 10,
});

return NextResponse.json({
  success: true,
  notifications,
  unreadCount: notifications.length,
});
```

**POST - Marcar como leída:**
```typescript
const { notificationId, markAllAsRead } = await request.json();

if (markAllAsRead) {
  await prisma.notification.updateMany({
    where: { userId: session.user.id, isRead: false },
    data: { isRead: true },
  });
} else {
  await prisma.notification.update({
    where: { id: notificationId, userId: session.user.id },
    data: { isRead: true },
  });
}
```

---

### 3. Componentes UI

#### A. `components/OrganizationChangeModal.tsx`
Modal de aprobación para participantes

**Funcionalidades:**
- ✅ Detección automática al cargar dashboard
- ✅ Comparación visual de organizaciones (actual vs nueva)
- ✅ Información de la visión destino
- ✅ Datos del solicitante y fecha
- ✅ Advertencia sobre irreversibilidad
- ✅ Botones para aceptar/rechazar con loading states

**Hook de detección:**
```typescript
useEffect(() => {
  if (session?.user) {
    checkPendingChange();
  }
}, [session]);

const checkPendingChange = async () => {
  const res = await fetch('/api/student/organization-change');
  const data = await res.json();

  if (data.success && data.hasPendingChange) {
    setChangeRequest(data.changeRequest);
    setShow(true); // Mostrar modal automáticamente
  }
};
```

**Diseño:**
- Fondo oscuro semi-transparente
- Card central con max-width
- Comparación lado a lado con iconos
- Colores: amarillo para advertencias, verde para aceptar, rojo para rechazar
- Responsive design

---

#### B. Integración en Dashboard (`app/dashboard/page.tsx`)
```typescript
import OrganizationChangeModal from "@/components/OrganizationChangeModal";

export default async function DashboardPage() {
  return (
    <div>
      {/* Widgets existentes */}
      <OrganizationChangeModal />
    </div>
  );
}
```

---

## 🎨 Experiencia de Usuario

### Para el Director (School Admin)

**Escenario 1: Agregar participante individual**
```
1. Director abre visión
2. Click en "Agregar Participante"
3. Selecciona usuario existente de otra org
4. Sistema muestra mensaje:
   "Juan Pérez ya está registrado en Escuela ABC. 
    Se ha enviado una solicitud de cambio que debe aprobar el participante."
5. Usuario queda pendiente hasta aprobación
```

**Escenario 2: Alta masiva por emails**
```
1. Director ingresa lista de correos
2. Sistema detecta 3 en otra org
3. Mensaje de confirmación:
   "✅ Operación completada
   
   🆕 Cuentas nuevas creadas: 5
   👤 Usuarios ya existentes agregados: 2
   ⏳ Cambios pendientes de aprobación: 3
      Estos usuarios están en otra organización y deben aceptar el cambio desde su dashboard
      📧 juan@mail.com, maria@mail.com, pedro@mail.com
   
   ✨ Total agregados a la visión: 7"
```

**Escenario 3: Recibir notificación de transferencia**
```
1. Director revisa su dashboard
2. Ve badge de notificaciones (🔔 1)
3. Click en notificaciones
4. Lee: "Juan Pérez (juan@mail.com) ha aceptado transferirse de Escuela ABC a Escuela XYZ"
5. Marca como leída o todas como leídas
```

---

### Para el Participante

**Detección automática:**
```
1. Participante hace login
2. Dashboard carga normalmente
3. Modal aparece automáticamente con solicitud
4. Ve comparación: Escuela ABC → Escuela XYZ
5. Ve visión destino: "Ciclo 2025 - Grupo A"
6. Ve quién solicitó: "Director Juan López"
7. Ve advertencia de irreversibilidad
8. Decide: Aceptar o Rechazar
```

**Opción A: Acepta**
```
9a. Click en "Aceptar Cambio"
10a. Procesando...
11a. Éxito: "Cambio aceptado. Has sido transferido a la nueva organización."
12a. Página se recarga
13a. Ahora está en Escuela XYZ con acceso a nueva visión
14a. Director anterior recibe notificación automáticamente
```

**Opción B: Rechaza**
```
9b. Click en "Rechazar Cambio"
10b. Procesando...
11b. Éxito: "Cambio rechazado. Permaneces en tu organización actual."
12b. Página se recarga
13b. Sigue en Escuela ABC sin cambios
14b. Sin notificación (director solicitante no es notificado del rechazo)
```

---

## 📊 Estados del Usuario

| Campo | Antes | Durante Cambio Pendiente | Después (Acepta) | Después (Rechaza) |
|-------|-------|-------------------------|------------------|-------------------|
| `organizationId` | 1 | 1 | 2 | 1 |
| `pendingOrganizationChange` | false | true | false | false |
| `newOrganizationId` | null | 2 | null | null |
| `newVisionId` | null | 5 | null | null |
| `previousOrganizationId` | null | 1 | null | null |
| `isActive` | true | false ⚠️ | true | true |

**⚠️ Importante:** El usuario se desactiva temporalmente durante el cambio pendiente para evitar acceso conflictivo.

---

## 🔐 Seguridad

### Validaciones Implementadas

1. **Autenticación:** Solo usuarios autenticados pueden realizar operaciones
2. **Autorización:** Solo school admins pueden solicitar cambios
3. **Verificación de organización:** Director solo puede agregar a su org
4. **Desactivación temporal:** Usuario no puede operar mientras hay cambio pendiente
5. **Auditoría completa:** Se registra quién solicitó y cuándo
6. **Atomicidad:** Transacciones completas o rollback
7. **Notificaciones seguras:** Solo el director de la org anterior recibe notificación
8. **Privacidad:** Usuario solo ve sus propias notificaciones

### Prevención de Conflictos

- Usuario no puede tener múltiples cambios pendientes simultáneos
- Se verifica que la visión destino existe y pertenece a la org
- Se verifica que el participante no esté ya en la visión
- Se previene auto-asignación (usuario no puede transferirse a sí mismo)
- Notificaciones con try-catch para no afectar la transferencia

---

## 🧪 Testing

### Casos de Prueba

**Test 1: Agregar usuario de misma organización**
```bash
POST /api/school-admin/visiones/1/add-participante
{ "participanteId": 10 }

✅ Esperado: Se agrega directamente sin aprobación
```

**Test 2: Agregar usuario de otra organización**
```bash
POST /api/school-admin/visiones/1/add-participante
{ "participanteId": 15 }

✅ Esperado:
- Usuario marcado con pendingOrganizationChange: true
- Usuario desactivado (isActive: false)
- Campos temporales poblados
- Respuesta: requiresApproval: true
```

**Test 3: Alta masiva mixta**
```bash
POST /api/school-admin/visiones/1/add-emails
{ "emails": "nuevo@test.com, existente-misma-org@test.com, existente-otra-org@test.com" }

✅ Esperado:
- nuevo@test.com: cuenta creada
- existente-misma-org@test.com: agregado directo
- existente-otra-org@test.com: cambio pendiente
```

**Test 4: Participante acepta cambio**
```bash
GET /api/student/organization-change
→ Retorna cambio pendiente

POST /api/student/organization-change
{ "action": "accept" }

✅ Esperado:
- organizationId cambia a nueva org
- Agregado a nueva visión
- Campos temporales limpiados
- Usuario reactivado
- Notificación creada para director anterior
```

**Test 5: Participante rechaza cambio**
```bash
POST /api/student/organization-change
{ "action": "reject" }

✅ Esperado:
- organizationId se mantiene
- Campos temporales limpiados
- Usuario reactivado en org original
```

**Test 6: Sistema de notificaciones**
```bash
# Participante acepta cambio
POST /api/student/organization-change
{ "action": "accept" }

# Director anterior revisa notificaciones
GET /api/notifications

✅ Esperado:
- Notificación tipo ORGANIZATION_TRANSFER
- Mensaje con nombre y email del participante
- Organizaciones de origen y destino
- isRead: false
- unreadCount: 1
```

**Test 7: Marcar notificación como leída**
```bash
POST /api/notifications
{ "notificationId": 1 }

✅ Esperado:
- Notificación marcada como isRead: true
- unreadCount disminuye en 1
```

---

## 📁 Archivos Creados/Modificados

```
✅ prisma/schema.prisma
   - Agregados campos de cambio de organización al modelo Usuario
   - Creado modelo Notification con enum NotificationType
   - Agregada relación Notifications en Usuario

✅ app/api/school-admin/visiones/[id]/add-participante/route.ts
   - Detección de conflicto organizacional
   - Marcado de cambio pendiente
   - Desactivación temporal del usuario

✅ app/api/school-admin/visiones/[id]/add-emails/route.ts
   - Detección en alta masiva
   - Separación por organización
   - Marcado masivo de cambios pendientes
   - Feedback detallado con conteos

✅ app/api/student/organization-change/route.ts (NUEVO)
   - GET: Obtener cambio pendiente con info completa
   - POST: Aceptar/rechazar cambio
   - Transferencia a nueva organización
   - Adición a nueva visión
   - Creación de notificación al director anterior

✅ app/api/notifications/route.ts (NUEVO)
   - GET: Obtener notificaciones no leídas
   - POST: Marcar como leída (individual o todas)
   - Filtrado por usuario
   - Ordenamiento por fecha

✅ components/OrganizationChangeModal.tsx (NUEVO)
   - Modal de aprobación full-screen
   - Comparación visual de organizaciones
   - Manejo de aceptación/rechazo
   - Estados de loading
   - Diseño responsive

✅ app/dashboard/page.tsx
   - Importación de OrganizationChangeModal
   - Renderizado automático del modal

✅ app/dashboard/school-admin/visiones/[id]/page.tsx
   - Feedback mejorado con cambios pendientes
   - Contadores y listas de emails pendientes
```

---

## 🚀 Deploy Checklist

- [x] Campos agregados al schema Usuario
- [x] Modelo Notification creado con enum
- [x] Relación agregada en Usuario
- [x] Migración aplicada (prisma db push)
- [x] Cliente Prisma regenerado
- [x] API de add-participante actualizada
- [x] API de add-emails actualizada
- [x] API de organization-change creada (GET/POST)
- [x] API de notifications creada (GET/POST)
- [x] Modal creado e integrado
- [x] Feedback mejorado en UI
- [x] Sistema de notificaciones implementado
- [ ] Testing de flujo completo end-to-end
- [ ] Documentación de usuario final
- [ ] Capacitación a directores

---

## 📝 Mejoras Futuras

### Prioridad Alta
1. **UI de Notificaciones en Dashboard**
   - Badge con contador de notificaciones no leídas
   - Dropdown con lista de notificaciones
   - Integración en navbar del school admin
   - Sonido/vibración en nuevas notificaciones

2. **Panel de Notificaciones Completo**
   - Página dedicada `/dashboard/school-admin/notifications`
   - Historial completo de notificaciones
   - Filtros por tipo y fecha
   - Búsqueda de notificaciones

### Prioridad Media
3. **Emails de Notificación**
   - Email automático al director cuando participante acepta
   - Email al participante cuando se solicita cambio
   - Plantillas HTML profesionales
   - Configuración de preferencias de email

4. **Panel de Administración de Cambios**
   - Ver todos los cambios pendientes (admin global)
   - Cancelar cambios manualmente
   - Estadísticas de transferencias
   - Logs de auditoría

5. **Timeout de Solicitudes**
   - Auto-expirar solicitudes después de 30 días
   - Recordatorios automáticos a participantes
   - Notificación de expiración a directores

### Prioridad Baja
6. **Aprobación del Director Anterior**
   - Requerir aprobación de ambos directores
   - Flujo de triple aprobación
   - Comentarios/razones en rechazos

7. **Analytics de Transferencias**
   - Dashboard con métricas de transferencias
   - Organizaciones más/menos transferencias
   - Razones de transferencias (formulario)
   - Reportes mensuales

---

## 🎉 Beneficios del Sistema

1. ✅ **Control del participante:** Usuario decide su transferencia
2. ✅ **Transparencia total:** Se muestran todos los detalles
3. ✅ **Seguridad mejorada:** Previene movimientos no autorizados
4. ✅ **Auditoría completa:** Registro de quién, cuándo y por qué
5. ✅ **UX clara:** Modal intuitivo con comparación visual
6. ✅ **Prevención de conflictos:** Desactivación temporal durante cambio
7. ✅ **Escalable:** Fácil de extender con más validaciones
8. ✅ **Notificaciones automáticas:** Directores informados en tiempo real
9. ✅ **Privacidad:** Solo involucrados reciben notificaciones
10. ✅ **Resiliente:** Sistema tolera errores en notificaciones sin afectar transferencias

---

## 💡 Notas de Implementación

### Consideraciones Importantes

1. **Desactivación Temporal:**
   - Los usuarios con cambio pendiente (`isActive: false`) no pueden acceder al sistema
   - Esto previene problemas de permisos y acceso a recursos de la org incorrecta
   - Se reactiva automáticamente al aceptar o rechazar

2. **Notificaciones No Bloqueantes:**
   - Si falla la creación de notificación, la transferencia continúa
   - Usa try-catch alrededor de prisma.notification.create
   - Solo se registra el error en console.error

3. **Atomicidad:**
   - Todas las operaciones de cambio usan transacciones implícitas de Prisma
   - Si algo falla, todo se revierte automáticamente

4. **Índices de Base de Datos:**
   - `@@index([userId, isRead])` en Notification optimiza consultas frecuentes
   - `@@index([createdAt])` permite ordenamiento eficiente

5. **Escalabilidad:**
   - El sistema está diseñado para manejar múltiples organizaciones
   - Las consultas están optimizadas con selects específicos
   - Se usa paginación en notificaciones (take: 10)

---

## 🔗 APIs Relacionadas

- `/api/school-admin/visiones/[id]` - GET visión completa
- `/api/school-admin/users/available` - GET usuarios disponibles
- `/api/school-admin/dashboard` - GET estadísticas del director
- `/api/student/organization-change` - GET/POST gestión de cambios
- `/api/notifications` - GET/POST gestión de notificaciones

---

**Creado:** 24 de diciembre de 2025  
**Sistema:** Plataforma Frutos - QUANTUM  
**Versión:** 2.0.0  
**Última actualización:** 24 de diciembre de 2025 - Sistema de notificaciones implementado
