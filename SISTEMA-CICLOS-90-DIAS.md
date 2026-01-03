# 🔄 SISTEMA DE CICLOS - FLUJO ACTUALIZADO

## 📋 Duración y Activación

### Duración del Ciclo
- **63 días** (9 semanas)
- **9 semanas** de trabajo intensivo

### Momento de Activación
El ciclo **NO** se crea en el registro. Se crea **AUTOMÁTICAMENTE** cuando:
1. ✅ El usuario completa su Carta de Frutos en el Wizard
2. ✅ Un mentor/coordinador **APRUEBA** la carta
3. 🎯 **En ese momento** inicia el ciclo de 63 días

---

## 🚀 Flujo Completo

```
1. Usuario se registra
   └─ PARTICIPANTE creado
   └─ ❌ SIN ciclo aún

2. Usuario completa Wizard de Carta de Frutos
   └─ Estado: BORRADOR
   └─ Envía a revisión → Estado: EN_REVISION

3. Mentor/Coordinador revisa la carta
   
   ┌─ OPCIÓN A: Rechazar
   │  └─ Usuario debe corregir y reenviar
   │
   └─ OPCIÓN B: APROBAR ✅
      └─ Estado: APROBADA
      └─ 🎯 AQUÍ SE CREA EL CICLO DE 90 DÍAS
      └─ Usuario puede empezar a trabajar en sus tareas
```

---

## 🏗️ Implementación Técnica

### Endpoint de Aprobación
**`PUT /api/mentor/carta/[id]/aprobar`**

```typescript
// Al aprobar la carta:
1. Actualiza estado → APROBADA
2. Verifica si el usuario YA tiene un ciclo activo
3. Si NO tiene ciclo:
   - Crea ProgramEnrollment
   - cycleType: 'SOLO'
   - cycleStartDate: HOY
   - cycleEndDate: HOY + 63 días
   - totalWeeks: 9
   - status: 'ACTIVE'
```

### Base de Datos
**Tabla: `ProgramEnrollment`**

```sql
id               INT
userId           INT         -- Usuario del ciclo
mentorId         INT         -- Mismo ID (ciclo personal)
cycleType        VARCHAR     -- 'SOLO' o 'VISION'
cycleStartDate   TIMESTAMP   -- Fecha de aprobación de carta
cycleEndDate     TIMESTAMP   -- cycleStartDate + 63 días
totalWeeks       INT         -- 9
status           VARCHAR     -- 'ACTIVE', 'COMPLETED', etc.
```

---

## ✅ Validaciones

### Antes de Crear Ciclo
- ✅ Carta debe estar en estado `APROBADA`
- ✅ Usuario debe ser `PARTICIPANTE`
- ✅ No debe tener otro ciclo `ACTIVE`

### Durante el Ciclo
- 📅 El usuario tiene 63 días para completar sus metas
- 📊 Las tareas se generan automáticamente al aprobar
- 🎯 Puede ver su progreso en el dashboard

---

## 🔄 Migración de Usuarios Existentes

### Script Ejecutado
`scripts/update-ciclos-90-dias.js`

- ✅ 3 ciclos actualizados de 100 → 63 días
- ✅ Fechas de fin recalculadas
- ✅ `totalWeeks` actualizado a 9

### Usuarios Nuevos
A partir de ahora:
- ❌ NO se crea ciclo en registro
- ✅ Se crea ciclo al aprobar carta
- 🎯 Duración: 63 días desde aprobación

---

## 📊 Estados del Sistema

### Usuario sin Carta
```json
{
  "usuario": { "id": 1, "rol": "PARTICIPANTE" },
  "carta": null,
  "ciclo": null,
  "estado": "Debe completar Carta de Frutos"
}
```

### Usuario con Carta en Revisión
```json
{
  "usuario": { "id": 1, "rol": "PARTICIPANTE" },
  "carta": { "estado": "EN_REVISION" },
  "ciclo": null,
  "estado": "Esperando aprobación del mentor"
}
```

### Usuario con Carta Aprobada (Ciclo Activo)
```json
{
  "usuario": { "id": 1, "rol": "PARTICIPANTE" },
  "carta": { "estado": "APROBADA" },
  "ciclo": {
    "cycleType": "SOLO",
    "cycleStartDate": "2025-12-23",
    "cycleEndDate": "2026-02-24",
    "totalWeeks": 9,
    "status": "ACTIVE"
  },
  "estado": "Ciclo activo - 63 días para completar"
}
```

---

## 🎯 Próximos Pasos

### Para Coordinadores
1. Al aprobar cartas, verificar que el ciclo se cree correctamente
2. El usuario debe aparecer en `/dashboard/admin/ciclos` tab "Usuarios"
3. Debe mostrar "🐺 Personal (90d)"

### Para Desarrolladores
1. ✅ Registro NO crea ciclo
2. ✅ Aprobación de carta crea ciclo
3. ✅ Duración: 90 días
4. ⏳ Pendiente: Migración a Visiones (cuando se implementen)

---

## 📝 Notas Importantes

- **Ciclo SOLO**: 90 días, individual, sin coordinador
- **Ciclo VISION**: Duración variable, grupal, con coordinador
- **Transición**: Un usuario puede pasar de SOLO → VISION si un coordinador lo asigna
- **Múltiples Ciclos**: Un usuario puede tener histórico de ciclos, pero solo 1 ACTIVE

---

**Última Actualización:** 23 de Diciembre de 2025  
**Duración Actual:** 90 días  
**Activación:** Al aprobar Carta de Frutos
