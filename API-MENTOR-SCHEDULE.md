# 📅 API de Gestión de Horarios del Mentor

## Endpoint: `/api/mentor/schedule`

API completa para gestionar la disponibilidad de horarios de los mentores.

---

## 🔹 POST - Guardar/Actualizar Horarios

### Request

```typescript
POST /api/mentor/schedule
Content-Type: application/json
Authorization: Bearer {token} // NextAuth session required

{
  "mentorId": 123, // Opcional: si no se envía, usa el ID de la sesión
  "schedule": [
    {
      "dayOfWeek": 1, // 0=Domingo, 1=Lunes, 2=Martes... 6=Sábado
      "startTime": "09:00", // Formato HH:MM
      "endTime": "11:00",
      "isActive": true // Solo se guardan los true
    },
    {
      "dayOfWeek": 1,
      "startTime": "14:00",
      "endTime": "17:00",
      "isActive": true
    },
    {
      "dayOfWeek": 3,
      "startTime": "10:00",
      "endTime": "12:00",
      "isActive": false // Este NO se guarda
    }
  ]
}
```

### Response (Success)

```json
{
  "success": true,
  "message": "Horario actualizado correctamente",
  "data": {
    "mentorId": 123,
    "slotsCount": 2,
    "availability": [
      {
        "id": 1,
        "mentorId": 123,
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "11:00",
        "isActive": true,
        "createdAt": "2025-12-15T10:00:00.000Z",
        "updatedAt": "2025-12-15T10:00:00.000Z"
      },
      {
        "id": 2,
        "mentorId": 123,
        "dayOfWeek": 1,
        "startTime": "14:00",
        "endTime": "17:00",
        "isActive": true,
        "createdAt": "2025-12-15T10:00:00.000Z",
        "updatedAt": "2025-12-15T10:00:00.000Z"
      }
    ]
  }
}
```

### Response (Error)

```json
{
  "error": "Solo mentores pueden configurar horarios"
}
```

---

## 🔹 GET - Obtener Horarios

### Request

```typescript
GET /api/mentor/schedule?mentorId=123 // mentorId es opcional
Authorization: Bearer {token}
```

Si no se envía `mentorId`, usa el ID de la sesión del usuario autenticado.

### Response

```json
{
  "success": true,
  "data": {
    "mentorId": 123,
    "totalSlots": 3,
    "availability": [
      {
        "id": 1,
        "mentorId": 123,
        "dayOfWeek": 1,
        "startTime": "09:00",
        "endTime": "11:00",
        "isActive": true,
        "createdAt": "2025-12-15T10:00:00.000Z",
        "updatedAt": "2025-12-15T10:00:00.000Z"
      }
    ],
    "groupedByDay": {
      "1": [
        {
          "id": 1,
          "startTime": "09:00",
          "endTime": "11:00",
          "isActive": true,
          "createdAt": "2025-12-15T10:00:00.000Z"
        }
      ]
    }
  }
}
```

---

## 🔹 DELETE - Eliminar Horarios

### Eliminar un slot específico

```typescript
DELETE /api/mentor/schedule?slotId=123
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "Horario eliminado correctamente"
}
```

### Eliminar todos los horarios del mentor

```typescript
DELETE /api/mentor/schedule
Authorization: Bearer {token}
```

**Response:**
```json
{
  "success": true,
  "message": "3 horarios eliminados",
  "deletedCount": 3
}
```

---

## 🎯 Ejemplo de Uso en React

### Componente para gestionar horarios

```typescript
'use client';

import { useState, useEffect } from 'react';

export default function MentorScheduleManager() {
  const [schedule, setSchedule] = useState([
    { dayOfWeek: 1, startTime: "09:00", endTime: "11:00", isActive: false },
    { dayOfWeek: 2, startTime: "09:00", endTime: "11:00", isActive: false },
    { dayOfWeek: 3, startTime: "09:00", endTime: "11:00", isActive: false },
    { dayOfWeek: 4, startTime: "09:00", endTime: "11:00", isActive: false },
    { dayOfWeek: 5, startTime: "09:00", endTime: "11:00", isActive: false },
  ]);

  // Cargar horarios guardados
  useEffect(() => {
    async function loadSchedule() {
      const res = await fetch('/api/mentor/schedule');
      const data = await res.json();
      
      if (data.success && data.data.availability.length > 0) {
        // Mapear horarios guardados al estado
        const loadedSchedule = schedule.map(slot => {
          const saved = data.data.availability.find(
            (s: any) => s.dayOfWeek === slot.dayOfWeek
          );
          
          return saved 
            ? { ...slot, startTime: saved.startTime, endTime: saved.endTime, isActive: true }
            : slot;
        });
        
        setSchedule(loadedSchedule);
      }
    }
    
    loadSchedule();
  }, []);

  // Guardar horarios
  const handleSave = async () => {
    try {
      const res = await fetch('/api/mentor/schedule', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schedule })
      });

      const data = await res.json();
      
      if (data.success) {
        alert('✅ Horarios guardados correctamente');
      } else {
        alert(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      console.error('Error guardando:', error);
      alert('❌ Error al guardar horarios');
    }
  };

  // Toggle día activo/inactivo
  const toggleDay = (index: number) => {
    const newSchedule = [...schedule];
    newSchedule[index].isActive = !newSchedule[index].isActive;
    setSchedule(newSchedule);
  };

  // Actualizar horario
  const updateTime = (index: number, field: 'startTime' | 'endTime', value: string) => {
    const newSchedule = [...schedule];
    newSchedule[index][field] = value;
    setSchedule(newSchedule);
  };

  const dayNames = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Configura tu Disponibilidad</h1>

      <div className="space-y-4">
        {schedule.map((slot, index) => (
          <div key={slot.dayOfWeek} className="flex items-center gap-4 bg-white p-4 rounded-lg shadow">
            <input
              type="checkbox"
              checked={slot.isActive}
              onChange={() => toggleDay(index)}
              className="w-5 h-5"
            />
            
            <span className="w-32 font-medium">
              {dayNames[slot.dayOfWeek]}
            </span>

            <input
              type="time"
              value={slot.startTime}
              onChange={(e) => updateTime(index, 'startTime', e.target.value)}
              disabled={!slot.isActive}
              className="border rounded px-3 py-2"
            />

            <span>hasta</span>

            <input
              type="time"
              value={slot.endTime}
              onChange={(e) => updateTime(index, 'endTime', e.target.value)}
              disabled={!slot.isActive}
              className="border rounded px-3 py-2"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handleSave}
        className="mt-6 px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
      >
        Guardar Horarios
      </button>
    </div>
  );
}
```

---

## 🔒 Seguridad y Permisos

### Roles Permitidos:
- **MENTOR:** Puede ver y editar solo su propio horario
- **COORDINADOR:** Puede ver y editar cualquier horario

### Validaciones:
- ✅ Usuario debe estar autenticado (NextAuth)
- ✅ Solo mentores/coordinadores pueden acceder
- ✅ Mentores solo pueden editar su propio horario
- ✅ Formato de tiempo validado (HH:MM)
- ✅ dayOfWeek debe ser 0-6
- ✅ Previene IDOR (Insecure Direct Object Reference)

---

## 🛠️ Estrategia "Borrón y Cuenta Nueva"

### ¿Por qué?
Simplifica la lógica al evitar:
- Detectar qué slots cambió el usuario
- Manejar updates parciales
- Resolver conflictos de duplicados

### Flujo:
```typescript
1. DELETE todos los horarios del mentor
2. INSERT solo los slots con isActive = true
3. RETURN horarios guardados
```

### Ventajas:
- ✅ Código más simple
- ✅ No hay riesgo de duplicados
- ✅ Estado consistente siempre

### Desventajas:
- ❌ Pierde historial de cambios (si lo necesitas, usa soft delete)

---

## 📊 Casos de Uso

### Caso 1: Mentor configura su horario por primera vez
```typescript
POST /api/mentor/schedule
{
  "schedule": [
    { "dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00", "isActive": true },
    { "dayOfWeek": 3, "startTime": "14:00", "endTime": "17:00", "isActive": true }
  ]
}
```
**Resultado:** 2 slots creados

---

### Caso 2: Mentor actualiza un horario existente
```typescript
POST /api/mentor/schedule
{
  "schedule": [
    { "dayOfWeek": 1, "startTime": "10:00", "endTime": "13:00", "isActive": true }, // Hora cambiada
    { "dayOfWeek": 3, "startTime": "14:00", "endTime": "17:00", "isActive": false } // Desactivado
  ]
}
```
**Resultado:** Lunes actualizado, Miércoles eliminado (porque isActive = false)

---

### Caso 3: Coordinador ve horario de un mentor
```typescript
GET /api/mentor/schedule?mentorId=456
```
**Resultado:** Retorna horarios del mentor 456

---

### Caso 4: Mentor elimina un día específico
```typescript
DELETE /api/mentor/schedule?slotId=123
```
**Resultado:** Slot 123 eliminado

---

## 🎨 Días de la Semana (dayOfWeek)

| Valor | Día |
|-------|-----|
| 0 | Domingo |
| 1 | Lunes |
| 2 | Martes |
| 3 | Miércoles |
| 4 | Jueves |
| 5 | Viernes |
| 6 | Sábado |

**JavaScript nativo:**
```javascript
const hoy = new Date().getDay(); // 0-6
```

---

## 🧪 Testing con cURL

### Guardar horarios
```bash
curl -X POST http://localhost:3000/api/mentor/schedule \
  -H "Content-Type: application/json" \
  -d '{
    "mentorId": 1,
    "schedule": [
      {"dayOfWeek": 1, "startTime": "09:00", "endTime": "12:00", "isActive": true}
    ]
  }'
```

### Obtener horarios
```bash
curl http://localhost:3000/api/mentor/schedule?mentorId=1
```

### Eliminar todos los horarios
```bash
curl -X DELETE http://localhost:3000/api/mentor/schedule
```

---

## 🔧 Próximas Mejoras

1. **Validación de colisiones:** Evitar que un mentor se agende en horarios superpuestos
2. **Historial de cambios:** Guardar versiones anteriores de horarios
3. **Notificaciones:** Alertar a alumnos cuando un mentor cambia sus horarios
4. **Zonas horarias:** Manejar mentores en diferentes timezones
5. **Recurrencia:** Permitir "disponible todos los lunes de 9-12 por 3 meses"

---

**Documentación creada:** 15 de diciembre de 2025  
**Versión:** 1.0.0  
**Estado:** 🟢 Producción Ready
