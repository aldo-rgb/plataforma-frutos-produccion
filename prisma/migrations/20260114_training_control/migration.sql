-- Migración: Agregar campos de control de entrenamiento a SchoolProduct
-- Fecha: 2026-01-14

-- 1. Crear el enum TrainingStatus
DO $$ BEGIN
    CREATE TYPE "TrainingStatus" AS ENUM ('PENDING', 'REGISTRATION_OPEN', 'IN_PROGRESS', 'COMPLETED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Agregar nuevos campos a SchoolProduct
ALTER TABLE "SchoolProduct" 
ADD COLUMN IF NOT EXISTS "registrationOpenDate" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "trainingStartTime" TEXT DEFAULT '08:30',
ADD COLUMN IF NOT EXISTS "trainingStatus" "TrainingStatus" DEFAULT 'PENDING',
ADD COLUMN IF NOT EXISTS "finishedAt" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "finishedBy" INTEGER,
ADD COLUMN IF NOT EXISTS "registrationNotifiedAt" TIMESTAMP(3);

-- 3. Agregar foreign key para finishedBy
ALTER TABLE "SchoolProduct" 
ADD CONSTRAINT "SchoolProduct_finishedBy_fkey" 
FOREIGN KEY ("finishedBy") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 4. Crear índice para trainingStatus
CREATE INDEX IF NOT EXISTS "SchoolProduct_trainingStatus_idx" ON "SchoolProduct"("trainingStatus");

-- 5. Actualizar productos existentes con valores default según su levelType
-- BASIC: 08:30, ADVANCED: 17:30, PL: 17:30
UPDATE "SchoolProduct" 
SET "trainingStartTime" = '08:30'
WHERE "levelType" = 'BASIC' AND "trainingStartTime" IS NULL;

UPDATE "SchoolProduct" 
SET "trainingStartTime" = '17:30'
WHERE "levelType" IN ('ADVANCED', 'INTERMEDIATE') AND "trainingStartTime" IS NULL;

UPDATE "SchoolProduct" 
SET "trainingStartTime" = '17:30'
WHERE "levelType" = 'PL' AND "trainingStartTime" IS NULL;

-- 6. Establecer trainingStatus basado en fechas existentes
-- Si startDate ya pasó y endDate no ha pasado -> IN_PROGRESS
UPDATE "SchoolProduct"
SET "trainingStatus" = 'IN_PROGRESS'
WHERE "startDate" IS NOT NULL 
  AND "startDate" <= NOW() 
  AND ("endDate" IS NULL OR "endDate" >= NOW())
  AND "trainingStatus" = 'PENDING';

-- Si endDate ya pasó -> COMPLETED
UPDATE "SchoolProduct"
SET "trainingStatus" = 'COMPLETED'
WHERE "endDate" IS NOT NULL 
  AND "endDate" < NOW()
  AND "trainingStatus" != 'COMPLETED';

-- Si startDate está en el futuro -> establecer registrationOpenDate = startDate - 7 días
UPDATE "SchoolProduct"
SET "registrationOpenDate" = "startDate" - INTERVAL '7 days'
WHERE "startDate" IS NOT NULL 
  AND "startDate" > NOW()
  AND "registrationOpenDate" IS NULL;

-- Si registrationOpenDate ya pasó pero startDate no -> REGISTRATION_OPEN
UPDATE "SchoolProduct"
SET "trainingStatus" = 'REGISTRATION_OPEN'
WHERE "registrationOpenDate" IS NOT NULL 
  AND "registrationOpenDate" <= NOW()
  AND "startDate" > NOW()
  AND "trainingStatus" = 'PENDING';

COMMENT ON COLUMN "SchoolProduct"."registrationOpenDate" IS 'Fecha y hora cuando se abre el registro para este entrenamiento';
COMMENT ON COLUMN "SchoolProduct"."trainingStartTime" IS 'Hora de inicio del entrenamiento (ej: 08:30, 17:30)';
COMMENT ON COLUMN "SchoolProduct"."trainingStatus" IS 'Estado actual del entrenamiento: PENDING, REGISTRATION_OPEN, IN_PROGRESS, COMPLETED';
COMMENT ON COLUMN "SchoolProduct"."finishedAt" IS 'Fecha/hora cuando el TRAINER dio por terminado el entrenamiento';
COMMENT ON COLUMN "SchoolProduct"."finishedBy" IS 'ID del TRAINER que finalizó el entrenamiento';
COMMENT ON COLUMN "SchoolProduct"."registrationNotifiedAt" IS 'Fecha/hora cuando se envió la notificación de apertura de registro';
