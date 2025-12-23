-- 🛡️ MIGRACIÓN: Sistema Anti-Conflictos para Reservas
-- Fecha: 17 de Diciembre 2025
-- Propósito: Prevenir double-booking a nivel de base de datos

-- ============================================================
-- 1. RESTRICCIÓN UNIQUE COMPUESTA: SolicitudMentoria
-- ============================================================
-- Previene que un mentor tenga dos sesiones al mismo tiempo
-- Cubre estados: PENDIENTE, CONFIRMADA (excluyendo CANCELADA, COMPLETADA, RECHAZADA)

-- NOTA: PostgreSQL no soporta índices UNIQUE condicionales directamente en Prisma Schema
-- Esta migración manual crea un índice parcial (partial index) que solo aplica a reservas activas

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_mentor_datetime_active" 
ON "SolicitudMentoria" ("perfilMentorId", "fechaSolicitada", "horaSolicitada")
WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
  AND "horaSolicitada" IS NOT NULL;

COMMENT ON INDEX "idx_unique_mentor_datetime_active" IS 
'Previene double-booking del mentor: Solo una reserva activa por fecha-hora';

-- ============================================================
-- 2. RESTRICCIÓN UNIQUE COMPUESTA: Estudiante Anti-Ubiquidad
-- ============================================================
-- Previene que un estudiante reserve dos sesiones al mismo tiempo

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_student_datetime_active" 
ON "SolicitudMentoria" ("clienteId", "fechaSolicitada", "horaSolicitada")
WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
  AND "horaSolicitada" IS NOT NULL;

COMMENT ON INDEX "idx_unique_student_datetime_active" IS 
'Previene ubiquidad del estudiante: Solo puede estar en un lugar a la vez';

-- ============================================================
-- 3. ÍNDICE DE RENDIMIENTO: Consultas de Disponibilidad
-- ============================================================
-- Optimiza queries de "slots disponibles" que filtran por mentor y fecha

CREATE INDEX IF NOT EXISTS "idx_solicitud_mentor_fecha_estado" 
ON "SolicitudMentoria" ("perfilMentorId", "fechaSolicitada", "estado", "horaSolicitada");

COMMENT ON INDEX "idx_solicitud_mentor_fecha_estado" IS 
'Optimiza queries de disponibilidad en /api/student/booking/slots';

-- ============================================================
-- 4. ÍNDICE DE RENDIMIENTO: CallBooking (Llamadas de Disciplina)
-- ============================================================
-- Complementa la protección para el sistema de llamadas de disciplina

CREATE UNIQUE INDEX IF NOT EXISTS "idx_unique_callbooking_mentor_datetime_active" 
ON "CallBooking" ("mentorId", "scheduledAt")
WHERE "status" IN ('PENDING', 'CONFIRMED');

COMMENT ON INDEX "idx_unique_callbooking_mentor_datetime_active" IS 
'Previene double-booking en CallBooking (disciplina): Solo una reserva activa por datetime';

-- ============================================================
-- 5. VERIFICACIÓN DE INTEGRIDAD (Testing Query)
-- ============================================================
-- Query para detectar conflictos existentes ANTES de aplicar constraints

-- Detectar conflictos en SolicitudMentoria (Mentores con horarios duplicados)
DO $$
DECLARE
  conflictos_mentor INTEGER;
  conflictos_estudiante INTEGER;
BEGIN
  -- Contar duplicados de mentor
  SELECT COUNT(*) INTO conflictos_mentor
  FROM (
    SELECT "perfilMentorId", "fechaSolicitada", "horaSolicitada", COUNT(*) as cnt
    FROM "SolicitudMentoria"
    WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
      AND "horaSolicitada" IS NOT NULL
    GROUP BY "perfilMentorId", "fechaSolicitada", "horaSolicitada"
    HAVING COUNT(*) > 1
  ) AS duplicados;

  -- Contar duplicados de estudiante
  SELECT COUNT(*) INTO conflictos_estudiante
  FROM (
    SELECT "clienteId", "fechaSolicitada", "horaSolicitada", COUNT(*) as cnt
    FROM "SolicitudMentoria"
    WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') 
      AND "horaSolicitada" IS NOT NULL
    GROUP BY "clienteId", "fechaSolicitada", "horaSolicitada"
    HAVING COUNT(*) > 1
  ) AS duplicados;

  IF conflictos_mentor > 0 THEN
    RAISE NOTICE '⚠️ ADVERTENCIA: % conflictos de mentor detectados. Revisa antes de aplicar índices UNIQUE.', conflictos_mentor;
  ELSE
    RAISE NOTICE '✅ No se detectaron conflictos de mentor. Seguro aplicar restricción.';
  END IF;

  IF conflictos_estudiante > 0 THEN
    RAISE NOTICE '⚠️ ADVERTENCIA: % conflictos de estudiante detectados.', conflictos_estudiante;
  ELSE
    RAISE NOTICE '✅ No se detectaron conflictos de estudiante. Seguro aplicar restricción.';
  END IF;
END $$;

-- ============================================================
-- 6. QUERY DE LIMPIEZA (OPCIONAL - Solo si hay conflictos)
-- ============================================================
-- Si la verificación anterior detecta conflictos, usar este query para resolverlos:

-- OPCIÓN A: Marcar duplicados más recientes como CANCELADA
/*
UPDATE "SolicitudMentoria" sm
SET "estado" = 'CANCELADA'
WHERE sm."id" IN (
  SELECT sm2."id"
  FROM "SolicitudMentoria" sm2
  INNER JOIN (
    SELECT "perfilMentorId", "fechaSolicitada", "horaSolicitada", MIN("createdAt") as primera_reserva
    FROM "SolicitudMentoria"
    WHERE "estado" IN ('PENDIENTE', 'CONFIRMADA') AND "horaSolicitada" IS NOT NULL
    GROUP BY "perfilMentorId", "fechaSolicitada", "horaSolicitada"
    HAVING COUNT(*) > 1
  ) AS primeras ON sm2."perfilMentorId" = primeras."perfilMentorId"
                AND sm2."fechaSolicitada" = primeras."fechaSolicitada"
                AND sm2."horaSolicitada" = primeras."horaSolicitada"
  WHERE sm2."createdAt" > primeras.primera_reserva
    AND sm2."estado" IN ('PENDIENTE', 'CONFIRMADA')
);
*/

-- ============================================================
-- 7. INSTRUCCIONES DE APLICACIÓN
-- ============================================================
/*
PASOS PARA APLICAR ESTA MIGRACIÓN:

1. BACKUP DE BASE DE DATOS (CRÍTICO)
   pg_dump -U username -d plataforma_frutos > backup_before_unique_constraints.sql

2. VERIFICAR CONFLICTOS EXISTENTES
   Ejecutar sección 5 (Verificación) primero
   
3. RESOLVER CONFLICTOS (Si existen)
   Usar sección 6 o resolución manual
   
4. APLICAR ÍNDICES UNIQUE
   psql -U username -d plataforma_frutos -f ANTI_CONFLICTO_UNIQUE_CONSTRAINT.sql
   
5. VERIFICAR APLICACIÓN
   SELECT indexname, indexdef FROM pg_indexes 
   WHERE tablename = 'SolicitudMentoria' 
     AND indexname LIKE 'idx_unique%';

6. PROBAR EN DESARROLLO
   Intentar crear dos reservas idénticas -> Debe fallar con error de constraint
   
7. MONITOREAR LOGS
   Buscar errores 23505 (unique_violation) en logs de aplicación
   Estos errores son NORMALES y manejados por el código
*/

-- ============================================================
-- 8. ROLLBACK (Si algo sale mal)
-- ============================================================
/*
-- Eliminar índices creados
DROP INDEX IF EXISTS "idx_unique_mentor_datetime_active";
DROP INDEX IF EXISTS "idx_unique_student_datetime_active";
DROP INDEX IF EXISTS "idx_solicitud_mentor_fecha_estado";
DROP INDEX IF EXISTS "idx_unique_callbooking_mentor_datetime_active";

-- Restaurar desde backup
psql -U username -d plataforma_frutos < backup_before_unique_constraints.sql
*/

-- ============================================================
-- FIN DE MIGRACIÓN
-- ============================================================
