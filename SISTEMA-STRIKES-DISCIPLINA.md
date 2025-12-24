# Sistema de Gestión de Strikes y Vidas Extra - Implementación Completa

## 📋 Resumen

Sistema completo de accountability y recuperación para el manejo de faltas en llamadas de disciplina. Incluye:

- **Widget mejorado de disciplina** para mentores con countdown timers en tiempo real
- **Panel administrativo** para coordinadores/directores/administradores
- **Sistema de compra de vidas** con puntos cuánticos para participantes
- **API endpoints** para todas las operaciones

---

## 🎯 Componentes Creados

### 1. **WidgetDisciplinaV2.tsx**
**Ubicación:** `/components/dashboard/mentor/WidgetDisciplinaV2.tsx`

#### Características:
- ✅ Lista completa de participantes (no solo los de hoy)
- ✅ Countdown timer en tiempo real para llamadas de hoy
- ✅ Ordenamiento automático (hoy primero, luego alfabético)
- ✅ Código de colores:
  - 🟣 Morado: Llamada hoy próxima
  - 🔴 Rojo: Llamada retrasada (pasó la hora)
  - ⚫ Gris: Sin llamada hoy
- ✅ Sistema visual de vidas (corazones rojos/grises)
- ✅ Botones de acción:
  - "Asistió" → Marca presente
  - "Faltó" → Registra strike
- ✅ Indicadores de peligro cuando quedan ≤1 vidas
- ✅ Auto-recarga después de cada acción

#### Uso:
```tsx
import WidgetDisciplinaV2 from '@/components/dashboard/mentor/WidgetDisciplinaV2';

export default function MentorDashboard() {
  return <WidgetDisciplinaV2 />;
}
```

---

### 2. **AdminStrikesPanel.tsx**
**Ubicación:** `/components/dashboard/admin/AdminStrikesPanel.tsx`

#### Características:
- ✅ Vista completa de todos los participantes con enrollments activos o suspendidos
- ✅ Búsqueda por nombre o email
- ✅ Filtros:
  - **Todos:** Muestra todos los participantes
  - **En Peligro:** Solo los que tienen ≤1 vida restante
  - **Suspendidos:** Solo los que fueron suspendidos por strikes
- ✅ Botón "Otorgar Vida" / "Reactivar":
  - Resetea strikes a 0
  - Si estaba suspendido, reactiva el enrollment
  - Restaura sesiones futuras canceladas
- ✅ Información de mentor asignado
- ✅ Sistema visual de vidas y strikes

#### Uso:
```tsx
import AdminStrikesPanel from '@/components/dashboard/admin/AdminStrikesPanel';

export default function AdminDashboard() {
  return <AdminStrikesPanel />;
}
```

#### Permisos:
Solo accesible para usuarios con rol:
- `ADMINISTRADOR`
- `SCHOOL_ADMIN` (Director)
- `COORDINADOR`

---

### 3. **PurchaseLifeModal.tsx**
**Ubicación:** `/components/dashboard/user/PurchaseLifeModal.tsx`

#### Características:
- ✅ Modal para comprar vida extra con puntos cuánticos
- ✅ Muestra estado actual (vidas restantes, strikes acumulados)
- ✅ Costo: **500 puntos cuánticos** (configurable en `/api/user/purchase-life/route.ts`)
- ✅ Validación de saldo (impide compra si no hay suficientes puntos)
- ✅ Preview de puntos restantes después de la compra
- ✅ Lista de beneficios:
  - Strikes reseteados a 0
  - Vidas restauradas al máximo
  - Reactivación si estaba suspendido
- ✅ Confirmación antes de compra

#### Uso:
```tsx
import PurchaseLifeModal from '@/components/dashboard/user/PurchaseLifeModal';
import { useState } from 'react';

export default function UserProfile() {
  const [modalOpen, setModalOpen] = useState(false);
  const enrollmentId = 123; // ID del enrollment activo del usuario

  return (
    <>
      <button onClick={() => setModalOpen(true)}>
        Comprar Vida Extra
      </button>

      <PurchaseLifeModal
        enrollmentId={enrollmentId}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => {
          // Refrescar datos del usuario
          alert('Vida extra comprada exitosamente');
        }}
      />
    </>
  );
}
```

---

## 🔌 API Endpoints Creados

### 1. **GET /api/mentor/disciplina/participantes**
**Archivo:** `/app/api/mentor/disciplina/participantes/route.ts`

#### Descripción:
Retorna todos los participantes asignados al mentor con información de sus enrollments, strikes, y llamadas (hoy + próxima futura).

#### Autenticación:
- Requiere sesión activa
- Solo accesible para usuarios con rol `MENTOR`

#### Respuesta:
```json
{
  "success": true,
  "participantes": [
    {
      "id": 10,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "profileImage": "https://...",
      "enrollment": {
        "id": 45,
        "missedCallsCount": 1,
        "maxMissedAllowed": 3,
        "totalWeeks": 17
      },
      "llamadaHoy": {
        "id": 789,
        "scheduledAt": "2025-01-15T10:00:00Z",
        "weekNumber": 3,
        "attendanceStatus": "PENDING",
        "status": "CONFIRMED"
      },
      "proximaLlamada": null
    }
  ]
}
```

---

### 2. **POST /api/mentor/disciplina/strike**
**Archivo:** `/app/api/mentor/disciplina/strike/route.ts`

#### Descripción:
Registra una falta (strike) para un participante. Incrementa `missedCallsCount` en el enrollment. Si alcanza el máximo permitido, suspende al usuario y cancela todas sus sesiones futuras.

#### Autenticación:
- Requiere sesión activa
- Solo accesible para usuarios con rol `MENTOR`
- Verifica que el mentor sea propietario del enrollment

#### Body:
```json
{
  "bookingId": 789
}
```

#### Respuesta exitosa:
```json
{
  "success": true,
  "suspended": false,
  "totalStrikes": 2,
  "maxStrikes": 3,
  "message": "Strike registrado. Total: 2/3"
}
```

#### Respuesta con suspensión:
```json
{
  "success": true,
  "suspended": true,
  "totalStrikes": 3,
  "maxStrikes": 3,
  "message": "Usuario suspendido por alcanzar 3 faltas"
}
```

#### Lógica de suspensión:
1. Marca la llamada como `attendanceStatus: 'ABSENT'` y `status: 'COMPLETED'`
2. Incrementa `enrollment.missedCallsCount`
3. Si `missedCallsCount >= maxMissedAllowed`:
   - Cancela todas las llamadas futuras (`PENDING`/`CONFIRMED` → `CANCELLED`)
   - Cambia el enrollment a `status: 'SUSPENDED'`

---

### 3. **POST /api/mentor/disciplina/asistencia**
**Archivo:** `/app/api/mentor/disciplina/asistencia/route.ts` *(ya existía, no modificado)*

#### Descripción:
Marca asistencia presente para una llamada. **NO incrementa strikes**.

#### Body:
```json
{
  "bookingId": 789,
  "present": true
}
```

---

### 4. **POST /api/admin/extra-life**
**Archivo:** `/app/api/admin/extra-life/route.ts`

#### Descripción:
Otorga una vida extra a un participante. Resetea sus strikes a 0 y, si estaba suspendido, lo reactiva y restaura sus sesiones futuras.

#### Autenticación:
- Requiere sesión activa
- Solo accesible para roles: `ADMINISTRADOR`, `SCHOOL_ADMIN`, `COORDINADOR`

#### Body:
```json
{
  "enrollmentId": 45,
  "razon": "Justificación médica" // Opcional
}
```

#### Respuesta:
```json
{
  "success": true,
  "message": "Usuario reactivado. Strikes reseteados y sesiones futuras restauradas.",
  "wasReactivated": true,
  "previousStrikes": 3,
  "currentStrikes": 0
}
```

#### Lógica:
1. Verifica permisos de administrador
2. Resetea `enrollment.missedCallsCount` a `0`
3. Si `enrollment.status === 'SUSPENDED'`:
   - Cambia a `status: 'ACTIVE'`
   - Restaura sesiones futuras (`CANCELLED` → `PENDING`)
4. Registra en log la operación con razón y usuario que otorga

---

### 5. **GET /api/user/purchase-life**
**Archivo:** `/app/api/user/purchase-life/route.ts`

#### Descripción:
Retorna información sobre el costo de una vida extra y si el usuario puede comprarla.

#### Query params:
```
?enrollmentId=45
```

#### Respuesta:
```json
{
  "success": true,
  "cost": 500,
  "currentPoints": 1200,
  "canPurchase": true,
  "missing": 0,
  "currentStrikes": 2,
  "maxStrikes": 3,
  "isSuspended": false
}
```

---

### 6. **POST /api/user/purchase-life**
**Archivo:** `/app/api/user/purchase-life/route.ts`

#### Descripción:
Permite a un usuario comprar una vida extra con puntos cuánticos. Deduce los puntos y resetea strikes.

#### Autenticación:
- Requiere sesión activa
- Verifica que el enrollment pertenezca al usuario logueado

#### Body:
```json
{
  "enrollmentId": 45
}
```

#### Respuesta exitosa:
```json
{
  "success": true,
  "message": "¡Vida extra comprada! Tus strikes han sido reseteados a 0.",
  "wasReactivated": false,
  "previousStrikes": 2,
  "currentStrikes": 0,
  "pointsSpent": 500,
  "remainingPoints": 700
}
```

#### Respuesta con error (puntos insuficientes):
```json
{
  "error": "Puntos insuficientes. Necesitas 500 puntos cuánticos. Tienes 300.",
  "required": 500,
  "current": 300,
  "missing": 200
}
```

#### Lógica:
1. Verifica que el usuario tenga suficientes `puntosCuanticos`
2. Deduce `COSTO_VIDA_EXTRA` (500 puntos por defecto)
3. Resetea `enrollment.missedCallsCount` a `0`
4. Si estaba suspendido, reactiva y restaura sesiones
5. Usa transacción de Prisma para garantizar atomicidad

#### Configuración de costo:
```typescript
// Línea 6 en /app/api/user/purchase-life/route.ts
const COSTO_VIDA_EXTRA = 500; // Cambiar según economía del sistema
```

---

### 7. **GET /api/admin/participantes-strikes**
**Archivo:** `/app/api/admin/participantes-strikes/route.ts`

#### Descripción:
Retorna todos los participantes con enrollments activos o suspendidos para panel administrativo.

#### Autenticación:
- Requiere sesión activa
- Solo accesible para roles: `ADMINISTRADOR`, `SCHOOL_ADMIN`, `COORDINADOR`

#### Respuesta:
```json
{
  "success": true,
  "participantes": [
    {
      "id": 10,
      "nombre": "Juan Pérez",
      "email": "juan@example.com",
      "profileImage": "https://...",
      "enrollment": {
        "id": 45,
        "missedCallsCount": 2,
        "maxMissedAllowed": 3,
        "status": "ACTIVE"
      },
      "mentor": {
        "nombre": "Carlos Mentor",
        "email": "carlos@frutos.com"
      }
    }
  ]
}
```

---

## 🔄 Flujo de Trabajo

### Para Mentores:

1. **Vista del Widget:**
   - Ven todos sus participantes listados
   - Los que tienen llamada HOY aparecen arriba con color morado/rojo
   - Ven countdown timer en tiempo real

2. **Marcar Asistencia:**
   - Botón verde "Asistió" → Marca presente, no incrementa strikes
   - Botón rojo "Faltó" → Incrementa strike, puede suspender si alcanza el máximo

3. **Alertas automáticas:**
   - Si el participante alcanza el máximo de strikes → Suspensión automática
   - El mentor ve alerta confirmando la suspensión

### Para Administradores/Directores/Coordinadores:

1. **Vista del Panel:**
   - Ven todos los participantes con enrollments (activos + suspendidos)
   - Pueden filtrar por: Todos, En Peligro, Suspendidos
   - Búsqueda por nombre/email

2. **Otorgar Vida Extra:**
   - Botón "Otorgar Vida" o "Reactivar" según estado
   - Pueden añadir razón (opcional)
   - Confirma reseteo de strikes a 0
   - Si estaba suspendido, reactiva automáticamente

### Para Participantes:

1. **Ver Estado:**
   - Modal muestra vidas restantes, strikes acumulados
   - Si está suspendido, ve alerta de suspensión
   - Ve costo de vida extra y sus puntos actuales

2. **Comprar Vida:**
   - Si tiene suficientes puntos, puede comprar
   - Confirma antes de procesar
   - Strikes resetean a 0
   - Si estaba suspendido, se reactiva

---

## 🎨 Diseño Visual

### Código de Colores:

- **🟣 Morado:** Llamada de hoy pendiente
- **🔴 Rojo:** Llamada retrasada o usuario suspendido
- **🟠 Naranja:** En peligro (1 vida restante)
- **🟢 Verde:** Estado saludable o acción positiva
- **⚫ Gris:** Sin llamada hoy

### Iconos:

- ❤️ **Corazón:** Sistema de vidas
- ⚠️ **Triángulo:** Alertas de peligro
- ⏱️ **Timer:** Countdown en tiempo real
- 🎁 **Regalo:** Otorgar vida extra
- 🛡️ **Escudo:** Panel administrativo
- ✨ **Sparkles:** Puntos cuánticos

---

## 📊 Base de Datos

### Campos Relevantes:

#### ProgramEnrollment:
```prisma
model ProgramEnrollment {
  id                Int      @id @default(autoincrement())
  userId            Int
  mentorId          Int
  missedCallsCount  Int      @default(0)  // Contador de faltas
  maxMissedAllowed  Int      @default(3)  // Máximo permitido antes de suspensión
  status            String   @default("ACTIVE") // ACTIVE, SUSPENDED, COMPLETED
  totalWeeks        Int      @default(17)
  // ... otros campos
}
```

#### Usuario:
```prisma
model Usuario {
  id              Int      @id @default(autoincrement())
  nombre          String?
  email           String   @unique
  puntosCuanticos Int      @default(0)  // Para compra de vidas
  rol             String   // PARTICIPANTE, MENTOR, COORDINADOR, ADMINISTRADOR, SCHOOL_ADMIN
  // ... otros campos
}
```

#### CallBooking:
```prisma
model CallBooking {
  id                 Int      @id @default(autoincrement())
  programEnrollmentId Int
  mentorId           Int
  studentId          Int
  scheduledAt        DateTime
  type               String   // DISCIPLINE, MENTORSHIP
  status             String   // PENDING, CONFIRMED, COMPLETED, CANCELLED
  attendanceStatus   String?  // PRESENT, ABSENT, null
  weekNumber         Int?
  // ... otros campos
}
```

---

## 🚀 Integración en Dashboards

### Dashboard de Mentor:
```tsx
import WidgetDisciplinaV2 from '@/components/dashboard/mentor/WidgetDisciplinaV2';

export default function MentorDashboard() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <WidgetDisciplinaV2 />
      {/* Otros widgets */}
    </div>
  );
}
```

### Dashboard de Admin/Director/Coordinador:
```tsx
import AdminStrikesPanel from '@/components/dashboard/admin/AdminStrikesPanel';

export default function AdminDashboard() {
  return (
    <div className="space-y-6">
      <AdminStrikesPanel />
      {/* Otros paneles */}
    </div>
  );
}
```

### Perfil de Usuario (Participante):
```tsx
import PurchaseLifeModal from '@/components/dashboard/user/PurchaseLifeModal';
import { useState } from 'react';

export default function UserProfile({ enrollment }) {
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <div>
      {enrollment.missedCallsCount > 0 && (
        <button
          onClick={() => setModalOpen(true)}
          className="px-4 py-2 bg-purple-500 text-white rounded-lg"
        >
          💎 Comprar Vida Extra ({enrollment.missedCallsCount} strikes)
        </button>
      )}

      <PurchaseLifeModal
        enrollmentId={enrollment.id}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSuccess={() => window.location.reload()}
      />
    </div>
  );
}
```

---

## ⚙️ Configuración

### Cambiar Costo de Vida Extra:
**Archivo:** `/app/api/user/purchase-life/route.ts`
```typescript
// Línea 6
const COSTO_VIDA_EXTRA = 500; // Cambiar valor aquí
```

### Cambiar Máximo de Strikes por Defecto:
**Base de datos:** Modificar `ProgramEnrollment.maxMissedAllowed` al crear enrollment
```typescript
await prisma.programEnrollment.create({
  data: {
    userId: 10,
    mentorId: 14,
    maxMissedAllowed: 5, // Cambiar según política
    // ...
  }
});
```

---

## 🔐 Seguridad

### Validaciones Implementadas:

1. **Autenticación:**
   - Todos los endpoints verifican sesión activa
   - Rechazan requests sin token válido

2. **Autorización:**
   - Mentores solo ven/modifican sus propios participantes
   - Admins/Directores/Coordinadores tienen acceso global
   - Participantes solo pueden comprar vida para su propio enrollment

3. **Validación de Datos:**
   - Verifica ownership de resources antes de modificar
   - Valida saldo de puntos antes de permitir compra
   - Usa transacciones de Prisma para operaciones críticas

4. **Prevención de Abuse:**
   - Confirmaciones obligatorias antes de acciones críticas
   - Logs de auditoría para operaciones administrativas
   - Rate limiting recomendado (no implementado aún)

---

## 📝 Próximos Pasos Sugeridos

1. **Notificaciones:**
   - Enviar email cuando usuario alcanza 2/3 strikes
   - Notificar a mentor cuando participante es suspendido
   - Confirmar compra de vida vía email

2. **Historial de Strikes:**
   - Crear tabla `StrikeLog` para auditoría completa
   - Mostrar timeline de strikes en perfil de usuario
   - Permitir a admins ver razones de cada strike

3. **Dashboard de Métricas:**
   - Tasa de asistencia por mentor
   - Usuarios en riesgo de suspensión
   - Vidas compradas vs otorgadas

4. **Sistema de Apelaciones:**
   - Permitir a usuarios solicitar revisión de strikes
   - Workflow de aprobación para coordinadores
   - Notificaciones de decisión

5. **Gamificación:**
   - Recompensas por racha de asistencias perfectas
   - Badges especiales por no tener strikes
   - Descuentos en vida extra por buen comportamiento

---

## 🐛 Debugging

### Logs Útiles:

#### Verificar strikes de un usuario:
```sql
SELECT 
  u.nombre, 
  pe.missedCallsCount, 
  pe.maxMissedAllowed, 
  pe.status 
FROM ProgramEnrollment pe 
JOIN Usuario u ON pe.userId = u.id 
WHERE u.email = 'usuario@example.com';
```

#### Ver todas las sesiones futuras de un enrollment:
```sql
SELECT * 
FROM CallBooking 
WHERE programEnrollmentId = 45 
  AND scheduledAt > NOW() 
ORDER BY scheduledAt;
```

#### Puntos cuánticos de un usuario:
```sql
SELECT nombre, email, puntosCuanticos 
FROM Usuario 
WHERE email = 'usuario@example.com';
```

---

## 📞 Soporte

Para problemas o preguntas sobre este sistema, contactar al equipo de desarrollo con:
- Logs de consola del navegador
- Screenshot del error
- Email del usuario afectado
- Timestamp del incidente

**Archivos críticos para debugging:**
- `/app/api/mentor/disciplina/strike/route.ts`
- `/components/dashboard/mentor/WidgetDisciplinaV2.tsx`
- `/app/api/user/purchase-life/route.ts`

---

## ✅ Checklist de Implementación Completada

- ✅ Widget de disciplina mejorado con countdown timers
- ✅ API para listar participantes con enrollments
- ✅ API para registrar strikes
- ✅ API para marcar asistencia (ya existía)
- ✅ Lógica de suspensión automática al alcanzar máximo
- ✅ Panel administrativo para gestión de strikes
- ✅ API para otorgar vidas extra (admin)
- ✅ API para comprar vidas con puntos cuánticos
- ✅ Modal de compra de vida para usuarios
- ✅ Sistema visual de vidas (corazones)
- ✅ Filtros y búsqueda en panel admin
- ✅ Validaciones de permisos en todos los endpoints
- ✅ Reactivación automática al otorgar/comprar vida
- ✅ Documentación completa del sistema

---

**Fecha de implementación:** 15 de Enero, 2025  
**Versión:** 1.0.0  
**Status:** ✅ Completado y listo para pruebas
