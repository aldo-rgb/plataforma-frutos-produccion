# Widget de Strikes para Mentores

## Descripción
Widget visual en el dashboard del mentor que muestra el estado de las llamadas perdidas (strikes) notificadas por los participantes del programa de disciplina.

## Ubicación
`/dashboard/mentor` - Columna derecha, debajo del "Consejo Matutino"

## Características

### 📊 Estadísticas Principales
- **Total de Participantes**: Número total de estudiantes asignados
- **En Riesgo**: Participantes con 2 strikes (última oportunidad)
- **Suspendidos**: Participantes que alcanzaron 3 strikes

### 📈 Tasa de Asistencia
- Barra de progreso visual
- Colores dinámicos:
  - Verde: ≥90%
  - Ámbar: 75-89%
  - Rojo: <75%
- Calculada sobre todas las sesiones de disciplina completadas

### ⚠️ Alertas Inteligentes

#### Participantes en Riesgo (2/3 strikes)
- Lista de participantes con 2 strikes
- Visualización de vidas con corazones
- Color ámbar para identificación rápida

#### Participantes Suspendidos (3/3 strikes)
- Lista de participantes suspendidos
- Color rojo para alta visibilidad
- Muestra el contador final de strikes

#### Estado Óptimo
- Mensaje verde cuando todos están bien
- "✓ Todos tus participantes están en buen estado"

## Archivos Creados

### Frontend
**Componente**: `/components/dashboard/mentor/MentorStrikesWidget.tsx`
- Widget React con estados de carga
- Actualización automática al montar
- UI responsiva con Tailwind CSS
- Iconos: Shield, AlertTriangle, Heart, TrendingUp

### Backend
**API Endpoint**: `/app/api/mentor/strikes/stats/route.ts`
- **Método**: GET
- **Autenticación**: Requiere sesión de MENTOR
- **Respuesta**:
```json
{
  "success": true,
  "stats": {
    "totalParticipantes": 15,
    "participantesEnRiesgo": 2,
    "participantesSuspendidos": 1,
    "tasaAsistencia": 87.5,
    "detalles": [
      {
        "id": 10,
        "nombre": "Juan Pérez",
        "strikes": 2,
        "maxStrikes": 3,
        "status": "ACTIVE"
      }
    ]
  }
}
```

### Integración
**Modificado**: `/app/dashboard/mentor/page.tsx`
- Importación del componente MentorStrikesWidget
- Renderizado en columna derecha después del consejo matutino

## Lógica de Negocio

### Cálculo de Strikes
- Datos obtenidos de `ProgramEnrollment.missedCallsCount`
- Máximo permitido: `ProgramEnrollment.maxMissedAllowed` (default: 3)
- Status del programa: ACTIVE, SUSPENDED

### Tasa de Asistencia
```typescript
tasaAsistencia = (sesionesAsistidas / totalSesiones) * 100
```
- Solo cuenta sesiones de tipo DISCIPLINE
- Status COMPLETED con attendanceStatus = PRESENT

### Clasificación
- **En Riesgo**: `strikes === 2 && status === 'ACTIVE'`
- **Suspendido**: `status === 'SUSPENDED'`

## UI/UX

### Colores del Sistema
- **Fondo**: Gradiente rojo oscuro/slate para tema de strikes
- **Borde**: Rojo 900/50 para énfasis
- **Cards internas**: Slate 900/50 con bordes slate 800

### Estados Visuales
- **Loading**: Skeleton con animación pulse
- **Sin datos**: No renderiza nada
- **Con alertas**: Muestra secciones ámbar/roja según corresponda
- **Estado óptimo**: Card verde de confirmación

### Responsividad
- Grid de 3 columnas para estadísticas principales
- Truncate en nombres largos para evitar overflow
- Flex-shrink-0 en íconos para mantener tamaño

## Integración con Sistema Existente

### Base de Datos
Utiliza el modelo `ProgramEnrollment` existente:
- `missedCallsCount`: Contador de faltas
- `maxMissedAllowed`: Límite antes de suspensión
- `status`: Estado del enrollment

### Relaciones Prisma
```prisma
CallBookings: CallBooking[] // Sesiones del enrollment
Usuario_ProgramEnrollment_userIdToUsuario: Usuario // Participante
```

### Flujo de Strikes
1. Mentor marca asistencia en WidgetDisciplinaV2
2. Si marca "Faltó" → POST a `/api/mentor/disciplina/strike`
3. Incrementa `missedCallsCount`
4. Si llega a 3 → Suspende automáticamente
5. Widget se actualiza mostrando nuevo estado

## Testing

### Probar manualmente:
```bash
# 1. Login como mentor
# 2. Ir a /dashboard/mentor
# 3. Verificar widget en columna derecha
# 4. Debe mostrar estadísticas de tus participantes
```

### Casos de prueba:
- Mentor sin participantes → No muestra widget
- Todos los participantes con 0 strikes → Mensaje verde
- Participante con 2 strikes → Aparece en "En Riesgo"
- Participante suspendido → Aparece en "Suspendidos"
- Tasa de asistencia correcta según sesiones

## Troubleshooting

### Widget no aparece
- Verificar que el usuario sea MENTOR (rol en DB)
- Verificar que tenga enrollments asignados
- Revisar console del navegador por errores

### Estadísticas incorrectas
- Verificar que missedCallsCount esté actualizado
- Revisar CallBookings con type DISCIPLINE
- Confirmar attendanceStatus en sesiones completadas

### Error 403
- Usuario no tiene rol MENTOR
- Verificar sesión activa en NextAuth

## Mejoras Futuras
- [ ] Actualización en tiempo real con WebSockets
- [ ] Gráfico de tendencia de asistencia
- [ ] Click en participante para ver detalles
- [ ] Filtros por status (Activos/Suspendidos/Todos)
- [ ] Exportar reporte PDF de strikes
- [ ] Notificaciones push cuando alguien llega a 2 strikes

---

**Versión**: 1.0.0  
**Fecha**: Diciembre 2024  
**Estado**: ✅ Implementado y funcional
