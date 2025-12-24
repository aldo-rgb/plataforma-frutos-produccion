# Sistema de Selección de Mentor para Programa Intensivo

## 📋 Descripción General

Implementación de un flujo de auto-servicio que permite a los participantes sin mentor asignado:
1. Pagar una licencia (STANDARD o PREMIUM)
2. Seleccionar su propio mentor de una lista de mentores disponibles
3. Completar la inscripción al Programa Intensivo de 17 Semanas

## 🎯 Objetivo

Eliminar el cuello de botella del coordinador que debe asignar mentores manualmente, permitiendo que los usuarios paguen e inicien inmediatamente.

## 🔄 Flujo del Usuario

### Escenario 1: Usuario SIN mentor asignado

1. **Acceso inicial**: Usuario navega a `/dashboard/program/enroll`
2. **Detección**: Sistema detecta `assignedMentorId === null`
2. **Mostrar opciones de pago**: Se despliegan 2 tarjetas:
   - **STANDARD** - $800 MXN anual (ahorra $388 vs $99/mes)
     - Acceso completo al sistema
     - Mentor asignado para disciplina
     - 34 sesiones programadas
     - Seguimiento de progreso
   - **PREMIUM** - $2,500 MXN anual (SOLO anual)
     - Todo lo de STANDARD
     - **2 Mentorías 1-a-1 al año**
     - Llamadas de disciplina programadas
     - Soporte prioritario
     - Acceso a eventos exclusivos

4. **Redirección a pago**: Al hacer clic en "Pagar y Continuar":
   - URL: `/dashboard/suscripcion?plan=STANDARD&returnUrl=/dashboard/program/enroll&action=select-mentor`
   - El parámetro `action=select-mentor` indica que debe mostrar selección de mentores al regresar

5. **Proceso de pago**: Usuario completa el pago en la página de suscripción

6. **Regreso exitoso**: Sistema redirige a `/dashboard/program/enroll?action=select-mentor`

7. **Carga de mentores**: Se ejecuta automáticamente `cargarMentoresDisponibles()`
   - Llama a `/api/mentor/disponibles-disciplina`
   - Filtra mentores con rol `MENTOR` activos
   - **CRÍTICO**: Solo muestra mentores con `CallAvailability` tipo `DISCIPLINE` activa
   - Retorna array de mentores con:
     - Datos básicos: id, nombre, email, profileImage
     - PerfilMentor: especialidad, nivel
     - Contador: `diasDisponibles` (número de días con horarios configurados)

8. **Selección de mentor**: Se muestra grid de mentores disponibles
   - Layout: 2-3 columnas responsivo
   - Cada tarjeta muestra:
     - Foto de perfil
     - Nombre y email
     - Especialidad (badge azul)
     - Nivel (badge verde)
     - Días disponibles con icono
   - Click en tarjeta: Marca como seleccionado (borde morado, sombra)
   - Estado visual: Checkmark "Seleccionado"

9. **Confirmación**: Botón "Confirmar Mentor y Continuar" se habilita cuando hay selección

10. **Asignación**: Al confirmar, se ejecuta `seleccionarMentor(mentorId)`:
    - **POST** `/api/user/assign-mentor` con `{ mentorId }`
    - Actualiza `usuario.assignedMentorId` en la base de datos
    - Carga slots disponibles del mentor: `GET /api/mentor/slots-disponibles?mentorId=X`
    - Auto-selecciona primeros 2 días disponibles
    - Oculta UI de selección/pago

11. **Continuación normal**: Usuario procede con selección de horarios y completa inscripción

### Escenario 2: Usuario CON mentor asignado

1. **Acceso inicial**: Usuario navega a `/dashboard/program/enroll`
2. **Detección**: Sistema encuentra `assignedMentorId !== null`
3. **Flujo estándar**: Carga datos del mentor, muestra horarios disponibles, permite inscripción directa
4. **NO muestra**: Opciones de pago ni selección de mentores

## 🏗️ Arquitectura Técnica

### Componentes Frontend

**Archivo**: `/app/dashboard/program/enroll/page.tsx`

#### Nuevas Interfaces
```typescript
interface MentorDisponible {
  id: number;
  nombre: string;
  profileImage: string | null;
  email: string;
  PerfilMentor: {
    especialidad: string | null;
    nivel: string | null;
  } | null;
  tieneDisciplina: boolean;
  diasDisponibles: number;
}
```

#### Nuevos Estados
```typescript
const [mentoresDisponibles, setMentoresDisponibles] = useState<MentorDisponible[]>([]);
const [mostrarSeleccionMentor, setMostrarSeleccionMentor] = useState(false);
const [mentorSeleccionado, setMentorSeleccionado] = useState<number | null>(null);
const [mostrarPagoLicencia, setMostrarPagoLicencia] = useState(false);
```

#### Nuevas Funciones

**`cargarMentoresDisponibles()`**
- Fetch: `GET /api/mentor/disponibles-disciplina`
- Actualiza: `mentoresDisponibles` state
- Maneja errores y muestra notificación

**`seleccionarMentor(mentorId: number)`**
- Asigna mentor: `POST /api/user/assign-mentor` con `{ mentorId }`
- Carga slots: `GET /api/mentor/slots-disponibles?mentorId=X`
- Auto-selecciona primeros 2 días disponibles
- Actualiza estados para proceder con inscripción

**`useEffect()` modificado**
- Detecta parámetro URL `?action=select-mentor`
- Si presente: Carga mentores y muestra selección
- Si ausente: Flujo normal (verificar mentor asignado)

### Endpoints API

#### 1. GET `/api/mentor/disponibles-disciplina`

**Archivo**: `/app/api/mentor/disponibles-disciplina/route.ts`

**Autenticación**: Requiere sesión válida

**Query Prisma**:
```typescript
prisma.usuario.findMany({
  where: {
    rol: 'MENTOR',
    isActive: true,
    CallAvailability: {
      some: {
        type: 'DISCIPLINE',
        isActive: true
      }
    }
  },
  include: {
    PerfilMentor: {
      select: {
        especialidad: true,
        nivel: true
      }
    },
    CallAvailability: {
      where: {
        type: 'DISCIPLINE',
        isActive: true
      }
    }
  }
})
```

**Respuesta**:
```json
{
  "success": true,
  "mentores": [
    {
      "id": 8,
      "nombre": "Mentor",
      "email": "mentor@frutos.com",
      "profileImage": "/avatar.jpg",
      "PerfilMentor": {
        "especialidad": "Diseño de Vida Intencional",
        "nivel": "JUNIOR"
      },
      "tieneDisciplina": true,
      "diasDisponibles": 6
    }
  ]
}
```

#### 2. POST `/api/user/assign-mentor`

**Archivo**: `/app/api/user/assign-mentor/route.ts`

**Autenticación**: Requiere sesión válida

**Body**:
```json
{
  "mentorId": 8
}
```

**Validaciones**:
1. Mentor existe y tiene rol `MENTOR`
2. Mentor está activo (`isActive: true`)
3. Mentor tiene al menos 1 horario de disciplina configurado

**Operación**:
```typescript
prisma.usuario.update({
  where: { id: currentUser.id },
  data: { assignedMentorId: mentorId }
})
```

**Respuesta exitosa**:
```json
{
  "success": true,
  "message": "Mentor asignado exitosamente",
  "assignedMentorId": 8
}
```

**Respuesta error**:
```json
{
  "error": "El mentor seleccionado no tiene horarios de disciplina configurados"
}
```

#### 3. GET `/api/mentor/slots-disponibles?mentorId=X`

**Archivo**: `/app/api/mentor/slots-disponibles/route.ts` (ya existente)

**Función**: Retorna días y horarios disponibles del mentor para inscripción

## 🗄️ Modelo de Datos

### Tabla: `CallAvailability`

**Campos relevantes**:
```typescript
{
  id: Int @id @default(autoincrement())
  mentorId: Int
  dayOfWeek: Int // 0=Domingo, 1=Lunes, ..., 6=Sábado
  startTime: String // "09:00"
  endTime: String // "10:00"
  type: CallType // Enum: DISCIPLINE | MENTORIA
  isActive: Boolean @default(true)
  Usuario: Usuario @relation(fields: [mentorId])
}
```

**Tipo crítico**: `type: 'DISCIPLINE'`
- **DISCIPLINE**: Para llamadas del programa intensivo (34 sesiones, horarios fijos)
- **MENTORIA**: Para sesiones 1-a-1 de mentoría general

### Tabla: `Usuario`

**Campo actualizado**:
```typescript
{
  assignedMentorId: Int? // Relación con otro Usuario (rol MENTOR)
}
```

## 🎨 Interfaz de Usuario

### Sección: Opciones de Pago

**Condición**: `mostrarPagoLicencia && !mentorAsignado`

**Layout**:
- 2 columnas en desktop, stack en mobile
- Tarjeta izquierda: STANDARD (azul)
- Tarjeta derecha: PREMIUM (morado/rosa gradiente, badge "RECOMENDADO")

**Elementos por tarjeta**:
- Título y badge de nivel
- Precio destacado con tamaño grande
- Lista de características con checkmarks verdes
- Botón "Pagar y Continuar" con flecha

**Interacción**:
- Click lleva a `/dashboard/suscripcion` con parámetros de retorno

### Sección: Selección de Mentor

**Condición**: `mostrarSeleccionMentor && mentoresDisponibles.length > 0`

**Layout**:
- Grid responsivo: 3 columnas (lg), 2 columnas (md), 1 columna (sm)
- Espaciado uniforme de 16px

**Tarjeta de mentor**:
- **Cursor**: pointer (clickeable)
- **Hover**: Escala 105%, transición suave
- **Estado normal**: Border gris, fondo semi-transparente
- **Estado seleccionado**: 
  - Border morado sólido
  - Fondo morado/20 opacity
  - Sombra morada con glow
  - Badge "Seleccionado" con checkmark

**Contenido de tarjeta**:
- Avatar circular (80x80px) con borde
- Nombre (bold, blanco)
- Email (pequeño, gris)
- Badges de especialidad (azul) y nivel (verde)
- Contador de días disponibles con icono de calendario

**Botón de confirmación**:
- Ancho completo
- Gradiente morado-rosa
- Texto grande y bold
- Icono de flecha derecha
- Visible solo cuando hay selección

## 🔧 Scripts de Utilidad

### `setup-mentor-discipline-schedule.js`

**Propósito**: Configurar horarios de disciplina para un mentor

**Uso**:
```bash
node setup-mentor-discipline-schedule.js
```

**Acción**:
1. Busca primer mentor activo
2. Agrega 6 horarios de disciplina (si no existen):
   - Lunes: 09:00-10:00, 14:00-15:00
   - Miércoles: 09:00-10:00, 14:00-15:00
   - Jueves: 10:00-11:00, 16:00-17:00
3. Muestra resumen de horarios configurados

### `test-mentor-selection-flow.js`

**Propósito**: Verificar que el flujo de selección funciona correctamente

**Uso**:
```bash
node test-mentor-selection-flow.js
```

**Verificaciones**:
1. Cuenta usuarios sin mentor asignado
2. Lista mentores con horarios de DISCIPLINA
3. Lista mentores SIN horarios de DISCIPLINA (no deben aparecer)
4. Simula asignación (sin ejecutar)
5. Muestra estadísticas del sistema
6. Describe comportamiento esperado en frontend

## ✅ Casos de Prueba

### Caso 1: Usuario nuevo sin mentor
1. Login como participante nuevo
2. Navegar a `/dashboard/program/enroll`
3. **Esperar**: Ver opciones STANDARD y PREMIUM
4. Click en "Pagar y Continuar" (cualquiera)
5. **Esperar**: Redirección a `/dashboard/suscripcion` con parámetros correctos

### Caso 2: Usuario regresa después de pagar
1. Simular: Navegar directo a `/dashboard/program/enroll?action=select-mentor`
2. **Esperar**: Ver grid de mentores disponibles (mínimo 1)
3. Click en tarjeta de mentor
4. **Esperar**: Borde morado, badge "Seleccionado"
5. Click en "Confirmar Mentor y Continuar"
6. **Esperar**: API asigna mentor, carga horarios, muestra selector de días

### Caso 3: Usuario con mentor asignado
1. Login como participante con mentor
2. Navegar a `/dashboard/program/enroll`
3. **Esperar**: Ver información del mentor asignado
4. **NO debe ver**: Opciones de pago ni selección de mentores
5. **Debe ver**: Selector de días y horarios directamente

### Caso 4: Mentor sin horarios de disciplina
1. Ejecutar: `node test-mentor-selection-flow.js`
2. **Esperar**: Mentores con horarios de disciplina > 0
3. Si 0: Ejecutar `node setup-mentor-discipline-schedule.js`
4. Re-ejecutar test
5. **Esperar**: Mentor aparece en lista ahora

## 🚨 Validaciones Importantes

### Backend (API)

**`/api/mentor/disponibles-disciplina`**:
- ✅ Solo mentores con `rol: 'MENTOR'`
- ✅ Solo mentores `isActive: true`
- ✅ Solo si tienen `CallAvailability` con:
  - `type: 'DISCIPLINE'`
  - `isActive: true`
- ✅ Filtro en `some`: Al menos 1 horario válido

**`/api/user/assign-mentor`**:
- ✅ Usuario autenticado (sesión requerida)
- ✅ Mentor existe en BD
- ✅ Mentor tiene rol `MENTOR`
- ✅ Mentor está activo
- ✅ Mentor tiene mínimo 1 `CallAvailability` tipo `DISCIPLINE` activa
- ✅ Actualiza `assignedMentorId` del usuario actual

### Frontend

**Página de inscripción**:
- ✅ Detecta parámetro URL `?action=select-mentor`
- ✅ No muestra pago si ya tiene mentor
- ✅ No permite confirmar sin selección
- ✅ Maneja errores de red en fetch
- ✅ Muestra loading states apropiados
- ✅ Auto-selecciona slots después de asignar mentor

## 🔐 Seguridad

1. **Autenticación requerida**: Todos los endpoints validan sesión activa
2. **Validación de mentor**: No se puede asignar cualquier usuario, debe ser rol `MENTOR`
3. **Verificación de horarios**: Sistema verifica que el mentor realmente tenga disponibilidad antes de permitir asignación
4. **No hay bypass de pago**: URLs con `?action=select-mentor` solo muestran UI, no otorgan acceso sin pago real

## 📊 Métricas de Éxito

- **Reducción de tiempo de onboarding**: De horas/días (esperar coordinador) a minutos (auto-servicio)
- **Tasa de conversión**: % de usuarios que completan pago + selección vs abandonan
- **Distribución de carga**: Balance de mentorados entre mentores disponibles
- **Errores de asignación**: Debe ser 0% (validaciones previenen mentores inválidos)

## 🔄 Mantenimiento

### Agregar nuevos mentores con disciplina
```bash
# Ejecutar script de setup
node setup-mentor-discipline-schedule.js

# O manualmente en BD:
INSERT INTO CallAvailability (mentorId, dayOfWeek, startTime, endTime, type, isActive)
VALUES (mentorId, 1, '09:00', '10:00', 'DISCIPLINE', true);
```

### Desactivar mentor de la lista
```sql
-- Opción 1: Desactivar horarios de disciplina
UPDATE CallAvailability 
SET isActive = false 
WHERE mentorId = X AND type = 'DISCIPLINE';

-- Opción 2: Desactivar mentor completamente
UPDATE Usuario 
SET isActive = false 
WHERE id = X;
```

## 🐛 Troubleshooting

### Problema: No aparecen mentores en la lista

**Posibles causas**:
1. No hay mentores con `CallAvailability` tipo `DISCIPLINE`
2. Horarios están `isActive: false`
3. Usuario ya tiene mentor asignado (no debería ver lista)

**Solución**:
```bash
node test-mentor-selection-flow.js
# Si muestra 0 mentores:
node setup-mentor-discipline-schedule.js
```

### Problema: Error al asignar mentor

**Síntoma**: Error 400 "El mentor seleccionado no tiene horarios de disciplina configurados"

**Causa**: Race condition - mentor fue desactivado entre mostrar lista y confirmar

**Solución**: Frontend debe re-validar antes de confirmar, o mostrar error amigable

### Problema: Usuario ve opciones de pago teniendo mentor

**Causa**: Estado `mentorAsignado` no se cargó correctamente

**Verificar**:
1. Endpoint `/api/user/profile` retorna `assignedMentorId`
2. Función `cargarMentorAsignado()` se ejecuta en useEffect
3. No hay errores en console del navegador

## 📝 Notas Adicionales

- **Tipos de llamadas**: Distinguir DISCIPLINE (programa intensivo) vs MENTORIA (sesiones 1-a-1)
- **Horarios fijos**: El programa intensivo requiere mismos días/horas cada semana
- **Límite de oportunidades**: Sistema ya cuenta las 3 oportunidades de perder llamadas
- **Escalabilidad**: Si hay muchos mentores, considerar paginación o filtros por especialidad

## 🎓 Ejemplo Completo de Uso

```
Usuario: Juan (sin mentor asignado)

1. Juan navega a /dashboard/program/enroll
   → Ve 2 opciones: STANDARD ($297) y PREMIUM ($497)

2. Juan decide pagar PREMIUM
   → Click en "Pagar y Continuar" (tarjeta morada)
   → Redirigido a /dashboard/suscripcion?plan=PREMIUM&returnUrl=...

3. Juan completa el pago con Stripe/PayPal
   → Sistema procesa pago exitoso
   → Redirige a /dashboard/program/enroll?action=select-mentor

4. Página detecta ?action=select-mentor
   → Ejecuta cargarMentoresDisponibles()
   → API retorna 3 mentores con horarios de disciplina

5. Juan ve grid con 3 mentores:
   - Ana (Diseño de Vida, 8 días disponibles)
   - Carlos (Liderazgo, 5 días disponibles)
   - María (Emprendimiento, 6 días disponibles)

6. Juan click en tarjeta de "Ana"
   → Tarjeta se marca con borde morado y badge "Seleccionado"

7. Juan click en "Confirmar Mentor y Continuar"
   → POST /api/user/assign-mentor { mentorId: 5 }
   → Juan.assignedMentorId = 5 (Ana)
   → Carga horarios de Ana

8. Sistema muestra selector de días:
   → Juan selecciona: Lunes 09:00 y Jueves 14:00
   → Click en "Inscribirme al Programa"

9. Sistema crea 34 sesiones programadas
   → Juan inscrito exitosamente
   → Mensaje de éxito: "¡Inscripción Exitosa!"

10. Juan redirigido al dashboard principal
    → Ya puede empezar el programa intensivo con Ana como su mentora
```

---

**Fecha de implementación**: Diciembre 2024  
**Versión**: 1.0.0  
**Autor**: Sistema Plataforma Frutos
