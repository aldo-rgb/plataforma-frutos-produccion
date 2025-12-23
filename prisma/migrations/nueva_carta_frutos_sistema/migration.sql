-- Agregar campos de estado y feedback granular a CartaFrutos
ALTER TABLE "CartaFrutos" 
ADD COLUMN IF NOT EXISTS "status" VARCHAR(30) DEFAULT 'DRAFT',
ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "submittedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "changesRequestedAt" TIMESTAMP;

-- Actualizar el enum EstadoCarta para incluir los nuevos estados
-- Los estados serán: DRAFT, PENDING_ADMIN, PENDING_MENTOR, CHANGES_REQUESTED, APPROVED
-- Como ya existe el enum EstadoCarta, solo actualizamos los registros

-- Crear tabla de feedback granular por área
CREATE TABLE IF NOT EXISTS "AreaFeedback" (
    "id" SERIAL PRIMARY KEY,
    "cartaId" INT NOT NULL REFERENCES "CartaFrutos"("id") ON DELETE CASCADE,
    "areaType" VARCHAR(30) NOT NULL, -- 'FINANZAS', 'SALUD', etc.
    "fieldType" VARCHAR(30) NOT NULL, -- 'IDENTITY', 'META'
    "status" VARCHAR(20) DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
    "feedbackText" TEXT,
    "reviewedBy" INT REFERENCES "Usuario"("id"),
    "reviewedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    UNIQUE("cartaId", "areaType", "fieldType")
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX IF NOT EXISTS "idx_carta_status" ON "CartaFrutos"("estado");
CREATE INDEX IF NOT EXISTS "idx_area_feedback_carta" ON "AreaFeedback"("cartaId");
CREATE INDEX IF NOT EXISTS "idx_area_feedback_status" ON "AreaFeedback"("status");

-- Agregar campos de feedback específico a Accion
ALTER TABLE "Accion"
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "feedbackMentor" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedBy" INT REFERENCES "Usuario"("id"),
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;

-- Agregar campos de feedback específico a Meta  
ALTER TABLE "Meta"
ADD COLUMN IF NOT EXISTS "status" VARCHAR(20) DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "feedbackMentor" TEXT,
ADD COLUMN IF NOT EXISTS "reviewedBy" INT REFERENCES "Usuario"("id"),
ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP;

CREATE INDEX IF NOT EXISTS "idx_accion_status" ON "Accion"("status");
CREATE INDEX IF NOT EXISTS "idx_meta_status" ON "Meta"("status");
