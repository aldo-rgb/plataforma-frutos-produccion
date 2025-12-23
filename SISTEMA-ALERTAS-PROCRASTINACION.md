# Sistema de Alertas de Procrastinación

Este documento describe el sistema completo de alertas de procrastinación implementado en la plataforma.

## 📋 Tipos de Alertas

El sistema detecta y notifica a los mentores sobre dos tipos de comportamiento de procrastinación:

### 1. Reagendamiento Excesivo (3+ veces)
**Trigger:** Cuando un estudiante reagenda una tarea por 3ra vez o más.
**Implementación:** Automática en el endpoint de reagendamiento.
**Archivo:** `/app/api/tasks/postpone/route.ts`

**Lógica:**
```typescript
if (newPostponeCount > 2 && task.Usuario.assignedMentorId) {
  await prisma.mentorAlert.create({
    data: {
      mentorId: task.Usuario.assignedMentorId,
      usuarioId: task.usuarioId,
      taskInstanceId: task.id,
      type: 'RISK_ALERT',
      message: `⚠️ ${userName} está procrastinando la tarea "${taskName}"...`
    }
  });
}
```

### 2. Retraso sin Reagendar (3+ días)
**Trigger:** Cuando una tarea tiene más de 3 días de retraso sin haber sido reagendada.
**Implementación:** Mediante script o cron job.
**Archivos:**
- Script: `/scripts/check-overdue-tasks.js`
- API Endpoint: `/app/api/cron/check-overdue-tasks/route.ts`

**Lógica:**
- Busca tareas con `status: PENDING`
- Compara `originalDueDate` (o `dueDate` si no existe) con fecha actual
- Si la diferencia es mayor a 3 días, crea alerta
- Evita duplicados verificando alertas no leídas existentes

## 🚀 Ejecución del Script

### Manualmente
```bash
node scripts/check-overdue-tasks.js
```

### Mediante API (para cron jobs)
```bash
curl http://localhost:3000/api/cron/check-overdue-tasks
```

### Con Vercel Cron (recomendado)
Agregar al `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/check-overdue-tasks",
    "schedule": "0 8 * * *"
  }]
}
```
Esto ejecutará el chequeo todos los días a las 8:00 AM.

## 📊 Modelo de Datos

```prisma
model MentorAlert {
  id             Int       @id @default(autoincrement())
  mentorId       Int
  usuarioId      Int
  taskInstanceId Int?
  type           AlertType @default(RISK_ALERT)
  message        String    @db.Text
  read           Boolean   @default(false)
  createdAt      DateTime  @default(now())
}
```

## 🎨 Componente de UI

**Archivo:** `/components/dashboard/mentor/AlertasProcrastinacion.tsx`

**Características:**
- Auto-actualización cada 30 segundos
- Muestra solo alertas no leídas
- Botón "Ver Detalles del Participante" que redirige a `/dashboard/lideres/{userId}`
- Marcar individual o todas las alertas como leídas
- Colapsar/expandir cuando hay más de 3 alertas

**Integración:**
```tsx
import AlertasProcrastinacion from '@/components/dashboard/mentor/AlertasProcrastinacion';

// En el dashboard del mentor
<AlertasProcrastinacion />
```

## 🔔 API Endpoints

### GET `/api/tasks/postpone?unreadOnly=true`
Obtiene las alertas del mentor (solo no leídas si `unreadOnly=true`).

**Respuesta:**
```json
{
  "success": true,
  "alerts": [
    {
      "id": "1",
      "Usuario": { "id": "57", "nombre": "Usuario 10" },
      "TaskInstance": {
        "id": "1177",
        "postponeCount": 3,
        "Accion": {
          "texto": "Tarea X",
          "Meta": { "categoria": "finanzas" }
        }
      },
      "message": "⚠️ Usuario 10 está procrastinando...",
      "read": false,
      "createdAt": "2025-12-22T08:16:00.000Z"
    }
  ],
  "unreadCount": 1
}
```

### PATCH `/api/tasks/postpone`
Marca alertas como leídas.

**Body (una alerta):**
```json
{ "alertId": "1" }
```

**Body (todas):**
```json
{ "markAll": true }
```

## 📝 Formato de Mensajes

### Reagendamiento Excesivo
```
⚠️ {nombreEstudiante} está procrastinando la tarea "{nombreTarea}" 
del área {nombreArea}. Ha sido pospuesta {count} veces.
```

### Retraso sin Reagendar
```
⏰ {nombreEstudiante} tiene la tarea "{nombreTarea}" del área {nombreArea} 
con {dias} días de retraso sin reagendar.
```

## 🔧 Mantenimiento

### Limpiar Alertas Antiguas
Puedes crear un script para limpiar alertas leídas con más de 30 días:

```javascript
await prisma.mentorAlert.deleteMany({
  where: {
    read: true,
    createdAt: {
      lt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  }
});
```

### Monitoreo
El script de chequeo de tareas retrasadas imprime estadísticas:
```
📈 Resumen:
   ✅ Alertas creadas: 5
   ⏭️  Alertas saltadas (duplicadas): 12
   📊 Total procesado: 17
```

## 🎯 Mejoras Futuras

1. **Notificaciones Push:** Integrar con servicio de notificaciones push
2. **Email:** Enviar resumen diario por email al mentor
3. **Niveles de Severidad:** Diferentes colores/iconos según días de retraso
4. **Dashboard Analytics:** Gráficas de patrones de procrastinación
5. **Auto-escalamiento:** Notificar coordinador si mentor no actúa en X días

## 📱 Testing

### Test Manual
1. Reagendar una tarea 3 veces
2. Ir a `/dashboard/mentor` 
3. Verificar que aparece el widget de alertas
4. Click en "Ver Detalles del Participante"
5. Marcar alerta como leída

### Test con Script
```bash
# Crear tarea retrasada
node create-procrastinated-task.js

# Verificar alertas
node scripts/check-overdue-tasks.js
```

## 🐛 Troubleshooting

### Las alertas no aparecen
1. Verificar que el usuario tiene `assignedMentorId`
2. Verificar que la sesión del mentor está activa
3. Revisar logs del navegador para errores de red

### Alertas duplicadas
El sistema verifica automáticamente alertas no leídas existentes para la misma tarea.

### Timezone issues
Las fechas se manejan en UTC. Asegurarse de que `originalDueDate` y `dueDate` estén en UTC.
