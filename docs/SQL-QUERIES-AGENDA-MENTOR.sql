-- ============================================
-- CONSULTAS SQL PARA AGENDA DEL MENTOR
-- ============================================

-- 1. LLAMADAS DE DISCIPLINA (Club 5 AM)
-- Esta consulta obtiene todas las llamadas programadas para HOY
-- donde el usuario actual es el mentor

SELECT 
  cb.id,
  cb."scheduledAt",
  cb.duration,
  cb.status,
  cb."meetingLink",
  cb.type,
  cb.notes,
  u.id as alumno_id,
  u.nombre as alumno_nombre,
  u.email as alumno_email,
  u.imagen as alumno_imagen
FROM "CallBooking" cb
INNER JOIN "Usuario" u ON cb."studentId" = u.id
WHERE cb."mentorId" = $1  -- ID del mentor logueado
  AND cb."scheduledAt" >= $2  -- Inicio del día (00:00:00)
  AND cb."scheduledAt" < $3   -- Inicio del día siguiente (00:00:00)
  AND cb.status IN ('CONFIRMED', 'PENDING')  -- Solo confirmadas o pendientes
ORDER BY cb."scheduledAt" ASC;

-- Parámetros:
-- $1 = session.user.id (ej: 36)
-- $2 = hoy (ej: '2025-12-16T06:00:00.000Z')
-- $3 = mañana (ej: '2025-12-17T06:00:00.000Z')


-- ============================================
-- 2. MENTORÍAS PAGADAS
-- Esta consulta obtiene las solicitudes de mentoría confirmadas
-- para el mentor actual en el día de HOY
-- ============================================

SELECT 
  sm.id,
  sm."fechaSolicitada",
  sm."horaSolicitada",
  sm.estado,
  sm.notas,
  sm."montoTotal",
  u.id as cliente_id,
  u.nombre as cliente_nombre,
  u.email as cliente_email,
  u.imagen as cliente_imagen,
  serv.nombre as servicio_nombre,
  serv.tipo as servicio_tipo,
  serv.descripcion as servicio_descripcion
FROM "SolicitudMentoria" sm
INNER JOIN "PerfilMentor" pm ON sm."perfilMentorId" = pm.id
INNER JOIN "Usuario" u ON sm."clienteId" = u.id
INNER JOIN "ServicioMentoria" serv ON sm."servicioId" = serv.id
WHERE pm."usuarioId" = $1  -- ID del usuario mentor (no el perfilMentorId)
  AND sm.estado IN ('CONFIRMADA', 'COMPLETADA')  -- Solo pagadas/confirmadas
  AND sm."fechaSolicitada" >= $2  -- Inicio del día
  AND sm."fechaSolicitada" < $3   -- Inicio del día siguiente
ORDER BY sm."fechaSolicitada" ASC;

-- Parámetros:
-- $1 = session.user.id (ej: 36)
-- $2 = hoy (ej: '2025-12-16T06:00:00.000Z')
-- $3 = mañana (ej: '2025-12-17T06:00:00.000Z')


-- ============================================
-- 3. CONSULTA COMBINADA (OPCIONAL)
-- Si quisieras hacer una sola consulta con UNION
-- ============================================

SELECT 
  'DISCIPLINA' as tipo,
  cb.id,
  cb."scheduledAt" as fecha_hora,
  cb.duration,
  cb.status::text,
  cb."meetingLink" as link,
  cb.type::text as subtipo,
  u.nombre as alumno_nombre,
  u.email as alumno_email,
  u.imagen as alumno_imagen,
  NULL as servicio_nombre,
  NULL as monto
FROM "CallBooking" cb
INNER JOIN "Usuario" u ON cb."studentId" = u.id
WHERE cb."mentorId" = $1
  AND cb."scheduledAt" >= $2
  AND cb."scheduledAt" < $3
  AND cb.status IN ('CONFIRMED', 'PENDING')

UNION ALL

SELECT 
  'MENTORIA' as tipo,
  sm.id + 10000 as id,  -- Offset para evitar colisión de IDs
  sm."fechaSolicitada" as fecha_hora,
  60 as duration,  -- Asumiendo 60 min por defecto
  sm.estado::text as status,
  NULL as link,
  serv.tipo::text as subtipo,
  u.nombre as alumno_nombre,
  u.email as alumno_email,
  u.imagen as alumno_imagen,
  serv.nombre as servicio_nombre,
  sm."montoTotal" as monto
FROM "SolicitudMentoria" sm
INNER JOIN "PerfilMentor" pm ON sm."perfilMentorId" = pm.id
INNER JOIN "Usuario" u ON sm."clienteId" = u.id
INNER JOIN "ServicioMentoria" serv ON sm."servicioId" = serv.id
WHERE pm."usuarioId" = $1
  AND sm.estado IN ('CONFIRMADA', 'COMPLETADA')
  AND sm."fechaSolicitada" >= $2
  AND sm."fechaSolicitada" < $3

ORDER BY fecha_hora ASC;


-- ============================================
-- 4. ÍNDICES RECOMENDADOS (para optimizar)
-- ============================================

-- Índices para CallBooking
CREATE INDEX IF NOT EXISTS idx_callbooking_mentor_date 
ON "CallBooking"("mentorId", "scheduledAt") 
WHERE status IN ('CONFIRMED', 'PENDING');

-- Índices para SolicitudMentoria
CREATE INDEX IF NOT EXISTS idx_solicitud_perfil_fecha 
ON "SolicitudMentoria"("perfilMentorId", "fechaSolicitada") 
WHERE estado IN ('CONFIRMADA', 'COMPLETADA');

-- Índice para PerfilMentor (si no existe)
CREATE INDEX IF NOT EXISTS idx_perfilmentor_usuario 
ON "PerfilMentor"("usuarioId");


-- ============================================
-- 5. ANÁLISIS DE PERFORMANCE
-- ============================================

-- Para ver el plan de ejecución de la query:
EXPLAIN ANALYZE
SELECT cb.*, u.nombre
FROM "CallBooking" cb
INNER JOIN "Usuario" u ON cb."studentId" = u.id
WHERE cb."mentorId" = 36
  AND cb."scheduledAt" >= '2025-12-16T06:00:00.000Z'
  AND cb."scheduledAt" < '2025-12-17T06:00:00.000Z'
  AND cb.status IN ('CONFIRMED', 'PENDING');


-- ============================================
-- 6. QUERIES ÚTILES PARA DEBUG
-- ============================================

-- Ver todas las llamadas de un mentor (sin filtro de fecha)
SELECT * FROM "CallBooking" 
WHERE "mentorId" = 36 
ORDER BY "scheduledAt" DESC 
LIMIT 10;

-- Ver todas las solicitudes de mentoría de un usuario
SELECT sm.*, pm.id as perfil_id
FROM "SolicitudMentoria" sm
INNER JOIN "PerfilMentor" pm ON sm."perfilMentorId" = pm.id
WHERE pm."usuarioId" = 36
ORDER BY sm."fechaSolicitada" DESC
LIMIT 10;

-- Contar sesiones por estado
SELECT status::text, COUNT(*) 
FROM "CallBooking" 
WHERE "mentorId" = 36 
GROUP BY status;

-- Ver mentores con sus perfiles
SELECT u.id, u.nombre, u.email, pm.id as perfil_id
FROM "Usuario" u
LEFT JOIN "PerfilMentor" pm ON u.id = pm."usuarioId"
WHERE u.rol = 'MENTOR';
