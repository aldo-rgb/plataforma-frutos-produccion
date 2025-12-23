-- ============================================
-- MIGRACIÓN: SISTEMA DE CICLOS HÍBRIDOS
-- De: Modelo 100 días fijos
-- A: Ciclos Personales vs Ciclos de Visión (Grupales)
-- ============================================

-- 1. CREAR TABLA DE VISIONES (GRUPOS)
CREATE TABLE IF NOT EXISTS "Vision" (
    "id" SERIAL PRIMARY KEY,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, CLOSED, PAUSED
    "coordinatorId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "Vision_coordinatorId_fkey" FOREIGN KEY ("coordinatorId") 
        REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "Vision_status_idx" ON "Vision"("status");
CREATE INDEX "Vision_coordinatorId_idx" ON "Vision"("coordinatorId");

-- 2. AGREGAR CAMPO DE VISIÓN AL USUARIO
-- Si visionId es NULL, es un "lobo solitario" (ciclo personal de 100 días)
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "visionId" INTEGER;

ALTER TABLE "Usuario" 
ADD CONSTRAINT "Usuario_visionId_fkey" 
FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Usuario_visionId_idx" ON "Usuario"("visionId");

-- 3. CREAR TABLA DE INSCRIPCIONES A PROGRAMAS (ENROLLMENTS)
-- Controla el ciclo actual de cada usuario
CREATE TABLE IF NOT EXISTS "ProgramEnrollment" (
    "id" SERIAL PRIMARY KEY,
    "usuarioId" INTEGER NOT NULL,
    "cycleType" VARCHAR(20) NOT NULL, -- 'SOLO' o 'VISION'
    "cycleStartDate" TIMESTAMP(3) NOT NULL,
    "cycleEndDate" TIMESTAMP(3) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, COMPLETED, DESERTER, DROPPED
    "dropReason" TEXT, -- Motivo si status = DROPPED
    "desertedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "visionId" INTEGER, -- NULL si es SOLO
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "ProgramEnrollment_usuarioId_fkey" 
        FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ProgramEnrollment_visionId_fkey" 
        FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "ProgramEnrollment_usuarioId_idx" ON "ProgramEnrollment"("usuarioId");
CREATE INDEX "ProgramEnrollment_status_idx" ON "ProgramEnrollment"("status");
CREATE INDEX "ProgramEnrollment_visionId_idx" ON "ProgramEnrollment"("visionId");

-- 4. AGREGAR CAMPOS DE CICLO A LA CARTA FRUTOS
ALTER TABLE "CartaFrutos" ADD COLUMN IF NOT EXISTS "cycleStartDate" TIMESTAMP(3);
ALTER TABLE "CartaFrutos" ADD COLUMN IF NOT EXISTS "cycleEndDate" TIMESTAMP(3);
ALTER TABLE "CartaFrutos" ADD COLUMN IF NOT EXISTS "tasksGenerated" BOOLEAN DEFAULT FALSE;
ALTER TABLE "CartaFrutos" ADD COLUMN IF NOT EXISTS "tasksGeneratedAt" TIMESTAMP(3);

-- 5. CREAR TABLA DE HISTORIAL DE ACCIONES ADMIN
-- Para auditoría de acciones críticas (reinicio, extensión, baja)
CREATE TABLE IF NOT EXISTS "AdminActionLog" (
    "id" SERIAL PRIMARY KEY,
    "adminId" INTEGER NOT NULL,
    "targetUserId" INTEGER,
    "targetVisionId" INTEGER,
    "actionType" VARCHAR(50) NOT NULL, -- RESTART_CYCLE, DROP_USER, EXTEND_VISION, EDIT_CARTA
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT "AdminActionLog_adminId_fkey" 
        FOREIGN KEY ("adminId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "AdminActionLog_targetUserId_fkey" 
        FOREIGN KEY ("targetUserId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "AdminActionLog_targetVisionId_fkey" 
        FOREIGN KEY ("targetVisionId") REFERENCES "Vision"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX "AdminActionLog_adminId_idx" ON "AdminActionLog"("adminId");
CREATE INDEX "AdminActionLog_actionType_idx" ON "AdminActionLog"("actionType");
CREATE INDEX "AdminActionLog_createdAt_idx" ON "AdminActionLog"("createdAt");

-- 6. CREAR VISTA MATERIALIZADA PARA STATS DE USUARIO
-- Útil para el panel de admin
CREATE MATERIALIZED VIEW IF NOT EXISTS "UserCycleStats" AS
SELECT 
    u.id AS "userId",
    u.nombre AS "userName",
    u.email,
    pe."cycleType",
    pe."cycleStartDate",
    pe."cycleEndDate",
    pe.status AS "enrollmentStatus",
    v.name AS "visionName",
    cf.estado AS "cartaStatus",
    cf."approvedAt" AS "cartaApprovedAt",
    COUNT(DISTINCT t.id) AS "totalTasks",
    COUNT(DISTINCT CASE WHEN t.status = 'COMPLETADA' THEN t.id END) AS "completedTasks",
    COUNT(DISTINCT CASE WHEN t.status = 'PENDIENTE' THEN t.id END) AS "pendingTasks"
FROM "Usuario" u
LEFT JOIN "ProgramEnrollment" pe ON u.id = pe."usuarioId" AND pe.status = 'ACTIVE'
LEFT JOIN "Vision" v ON pe."visionId" = v.id
LEFT JOIN "CartaFrutos" cf ON u.id = cf."usuarioId"
LEFT JOIN "Tarea" t ON u.id = t."usuarioId"
GROUP BY u.id, u.nombre, u.email, pe."cycleType", pe."cycleStartDate", pe."cycleEndDate", 
         pe.status, v.name, cf.estado, cf."approvedAt";

CREATE UNIQUE INDEX ON "UserCycleStats" ("userId");

-- 7. AGREGAR COMENTARIOS A LAS TABLAS
COMMENT ON TABLE "Vision" IS 'Grupos/Visiones con ciclos compartidos';
COMMENT ON TABLE "ProgramEnrollment" IS 'Inscripciones activas de usuarios a ciclos';
COMMENT ON TABLE "AdminActionLog" IS 'Log de auditoría de acciones administrativas críticas';

COMMENT ON COLUMN "Usuario"."visionId" IS 'NULL = Usuario independiente (100 días), NOT NULL = Pertenece a grupo';
COMMENT ON COLUMN "ProgramEnrollment"."cycleType" IS 'SOLO = Ciclo personal 100 días, VISION = Ciclo grupal';
COMMENT ON COLUMN "ProgramEnrollment"."status" IS 'ACTIVE, COMPLETED, DESERTER (abandonó), DROPPED (dado de baja por admin)';
