# Sistema de Feedback de Evidencias Rechazadas

## Descripción General

Sistema completo para notificar y mostrar al usuario cuando su evidencia es rechazada por un mentor, incluyendo el motivo del rechazo y permitiendo reenviar nueva evidencia.

## Características Implementadas

### 1. Notificación por Email ✅

**Archivo:** `/lib/notifications.ts`

**Función:** `notifyEvidenciaRechazada()`

**Características:**
- Email HTML con diseño profesional
- Incluye título de la tarea rechazada
- Muestra el feedback del mentor (motivo del rechazo)
- Instrucciones paso a paso para reenviar
- Botón directo al dashboard
- Mensaje motivacional
- Push notification complementaria

**Ejemplo de uso:**
```typescript
await notifyEvidenciaRechazada(
  submission.usuarioId,
  submission.AdminTask.titulo,
  feedback,
  submission.AdminTask.type
);
```

### 2. Backend - Persistencia de Estado REJECTED ✅

**Archivo:** `/app/api/mentor/submissions/review/route.ts`

**Problema Resuelto:**
- **ANTES:** Doble update que perdía el estado REJECTED
  1. Primer update: `status: 'REJECTED'`
  2. Segundo update: `status: 'PENDING'` ❌ (perdía el estado)

- **DESPUÉS:** Status permanece como REJECTED
  ```typescript
  const updatedSubmission = await prisma.taskSubmission.update({
    where: { id: submissionId },
    data: {
      status: 'REJECTED',  // ✅ Se mantiene REJECTED
      reviewedAt: new Date(),
      reviewedBy: mentorId,
      feedbackMentor: feedback,
      evidenciaUrl: null,  // Se limpia para permitir nuevo upload
      comentario: null,
      puntosGanados: 0
    }
  });
  ```

**Lógica de Re-upload:**
- Estado permanece en `REJECTED` hasta que usuario suba nueva evidencia
- Campos `evidenciaUrl` y `comentario` se limpian para permitir nuevo upload
- Cuando usuario sube nueva evidencia, estado cambia a `SUBMITTED`
- Flujo normal de revisión continúa

### 3. Frontend - Zona de Ejecución Diaria ✅

**Archivo:** `/components/dashboard/ZonaEjecucionDiaria.tsx`

#### A. Interfaz Actualizada
```typescript
interface Tarea {
  // ... otros campos
  status: 'PENDING' | 'COMPLETED' | 'SKIPPED' | 'SUBMITTED' | 'EXPIRED' | 'REJECTED';
  evidenceStatus?: 'NONE' | 'PENDING' | 'APPROVED' | 'REJECTED';
  feedbackMentor?: string | null; // ✅ Nuevo campo
}
```

#### B. Badge de Estado Mejorado
```typescript
// Badge especial para evidencias rechazadas
if (tarea.status === 'REJECTED') {
  return (
    <div className="... animate-pulse">
      <AlertCircle className="w-3 h-3" />
      Rechazada - Reenviar
    </div>
  );
}
```

**Características:**
- Animación pulse para llamar la atención
- Color rojo para indicar urgencia
- Texto claro: "Rechazada - Reenviar"

#### C. Alerta de Feedback del Mentor
```tsx
{tarea.status === 'REJECTED' && tarea.feedbackMentor && (
  <div className="mt-3 bg-gradient-to-r from-red-950/80 to-orange-950/80 border-2 border-red-500 rounded-xl p-4 shadow-xl shadow-red-900/50 animate-pulse">
    <div className="flex items-start gap-3">
      <AlertCircle className="w-6 h-6 text-red-400" />
      <div className="flex-1">
        <h4 className="text-red-300 font-bold text-sm mb-2">
          ❌ Evidencia Rechazada por tu Mentor
        </h4>
        <div className="bg-black/30 rounded-lg p-3 mb-3">
          <p className="text-slate-200 text-sm leading-relaxed">
            {tarea.feedbackMentor}
          </p>
        </div>
        <p className="text-amber-400 text-xs font-semibold">
          <Upload className="w-3 h-3" />
          Por favor, sube una nueva evidencia corrigiendo los detalles señalados
        </p>
      </div>
    </div>
  </div>
)}
```

**Características:**
- Panel rojo prominente con animación pulse
- Muestra el mensaje del mentor en caja oscura
- Icono de alerta
- Instrucciones claras para reenviar
- Diseño responsive

#### D. Botón de Reenvío Especial
```typescript
// Botón especial para tareas rechazadas
if (tarea.status === 'REJECTED') {
  return (
    <button
      onClick={() => openUploadModal(tarea)}
      className="... bg-gradient-to-r from-amber-600 to-orange-600 ... animate-pulse"
    >
      <Upload className="w-4 h-4" />
      Reenviar Evidencia
    </button>
  );
}
```

**Características:**
- Color ámbar/naranja para diferenciarlo
- Animación pulse continua
- Texto claro: "Reenviar Evidencia"
- Abre modal de upload al hacer clic

### 4. API - Inclusión de Feedback ✅

**Archivo:** `/app/api/tareas/zona-ejecucion/route.ts`

```typescript
const formatAdminTask = (submission: any) => {
  return {
    // ... otros campos
    feedbackMentor: submission.feedbackMentor, // ✅ Incluido en respuesta
    status: submission.status, // REJECTED se mantiene
  };
};
```

## Flujo Completo de Rechazo

### 1. Mentor Rechaza Evidencia

**Endpoint:** `POST /api/mentor/submissions/review`

**Acción:**
```typescript
{
  "submissionId": 123,
  "action": "reject",
  "feedback": "La foto no muestra claramente el progreso. Por favor incluye una toma frontal."
}
```

**Resultado:**
1. Status cambia a `REJECTED`
2. `feedbackMentor` se guarda con el mensaje
3. `evidenciaUrl` y `comentario` se limpian
4. `puntosGanados` = 0
5. Email enviado al usuario
6. Push notification enviada
7. Toast de confirmación para mentor

### 2. Usuario Ve Notificación

**Canales:**
1. **Email inmediato** con detalles del rechazo
2. **Visual en dashboard** con:
   - Badge "Rechazada - Reenviar" (pulsando)
   - Panel rojo con feedback del mentor
   - Botón especial "Reenviar Evidencia"

### 3. Usuario Reenvía Evidencia

**Acción:** Click en "Reenviar Evidencia"

**Proceso:**
1. Modal de upload se abre
2. Usuario selecciona nueva evidencia
3. Submit → Status cambia a `SUBMITTED`
4. Mentor recibe nueva notificación
5. Ciclo de revisión continúa

## Casos de Borde Manejados

### ✅ Sin Feedback
```typescript
// Si mentor no proporciona feedback, se muestra mensaje genérico
if (!feedback || feedback.trim() === '') {
  feedback = 'Tu mentor requiere que subas una nueva evidencia.';
}
```

### ✅ Múltiples Rechazos
- Usuario puede reenviar evidencia múltiples veces
- Cada rechazo envía nuevo email con feedback actualizado
- Estado REJECTED se mantiene hasta nueva aprobación

### ✅ Tareas Expiradas
- Si tarea está expirada (EXPIRED), no se puede reenviar
- Badge y botón se deshabilitan
- Sistema muestra "🔒 Cerrado"

## Validaciones de Seguridad

### Backend
```typescript
// Verificar que mentor está autorizado
const mentorId = session.user.id;
const submission = await prisma.taskSubmission.findFirst({
  where: {
    id: submissionId,
    Usuario: {
      OR: [
        { mentorId: mentorId },
        { assignedMentorId: mentorId }
      ]
    }
  }
});

if (!submission) {
  return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
}
```

### Frontend
```typescript
// Solo mostrar para tareas del usuario autenticado
const session = await getServerSession(authOptions);
const whereClar = {
  usuarioId: session.user.id,
  // ...
};
```

## Testing

### Escenario de Prueba 1: Rechazo Simple
1. Mentor rechaza evidencia con feedback: "Foto borrosa"
2. ✅ Usuario recibe email con mensaje
3. ✅ Dashboard muestra panel rojo con feedback
4. ✅ Badge dice "Rechazada - Reenviar"
5. ✅ Botón especial "Reenviar Evidencia" visible

### Escenario de Prueba 2: Reenvío
1. Usuario hace click en "Reenviar Evidencia"
2. ✅ Modal se abre
3. ✅ Usuario sube nueva foto
4. ✅ Status cambia a SUBMITTED
5. ✅ Badge cambia a "Mentor revisando"
6. ✅ Panel rojo desaparece

### Escenario de Prueba 3: Aprobación tras Rechazo
1. Mentor aprueba evidencia reenviada
2. ✅ Status cambia a APPROVED
3. ✅ Puntos otorgados
4. ✅ Badge verde "Aprobada"
5. ✅ Botón de reenvío desaparece

## Estados Visuales

| Estado | Badge | Panel Feedback | Botón | Color |
|--------|-------|----------------|-------|-------|
| PENDING | - | - | "Subir Evidencia" | Morado |
| SUBMITTED | "Mentor revisando" | - | Deshabilitado | Azul |
| REJECTED | "Rechazada - Reenviar" (pulse) | ✅ Visible | "Reenviar Evidencia" (pulse) | Rojo/Ámbar |
| APPROVED | "Aprobada" | - | - | Verde |
| EXPIRED | "Cerrado" | - | Deshabilitado | Gris |

## Archivos Modificados

1. ✅ `/lib/notifications.ts` - Nueva función de notificación
2. ✅ `/app/api/mentor/submissions/review/route.ts` - Fix bug + envío email
3. ✅ `/components/dashboard/RevisionEvidenciasWidget.tsx` - Toast actualizado
4. ✅ `/components/dashboard/ZonaEjecucionDiaria.tsx` - UI completa de feedback
5. ✅ `/app/api/tareas/zona-ejecucion/route.ts` - Incluir feedbackMentor en respuesta

## Git Commits

### Commit 1: Sistema de Notificación
```
feat: Notificar usuario cuando evidencia es rechazada

- Crear función notifyEvidenciaRechazada() con email HTML
- Integrar envío de email en endpoint de revisión
- Actualizar toast de confirmación para mentor
- Incluir push notification complementaria
```

### Commit 2: Fix Visual y Feedback
```
fix: Mostrar feedback de mentor cuando evidencia es rechazada

- Agregar campo feedbackMentor a interfaz Tarea
- Actualizar badge para mostrar 'Rechazada - Reenviar' con animación pulse
- Crear alerta visual roja con mensaje del mentor
- Actualizar botón de acción para estado REJECTED con estilo especial
- Mantener status REJECTED en lugar de cambiar a PENDING (bug fix)
- Incluir feedbackMentor en respuesta de API zona-ejecucion
- Permitir reenvío de evidencia mientras status es REJECTED
```

## Próximas Mejoras Sugeridas

1. **Historial de Rechazos**
   - Guardar todos los intentos de evidencia
   - Mostrar timeline de revisiones

2. **Notificaciones In-App**
   - Badge contador de evidencias rechazadas
   - Toast automático al entrar al dashboard

3. **Analytics**
   - Tracking de tasa de rechazo por mentor
   - Promedio de intentos hasta aprobación

4. **Feedback Templates**
   - Sugerencias de feedback comunes para mentores
   - Quick replies predefinidas

## Soporte

**Contacto Técnico:** Sistema implementado el 22 de diciembre de 2024

**Logs Relevantes:**
```bash
# Ver logs de emails enviados
grep "notifyEvidenciaRechazada" logs/app.log

# Ver rechazos en base de datos
SELECT * FROM "TaskSubmission" WHERE status = 'REJECTED';
```

---

✅ **Sistema 100% Funcional y Probado**
