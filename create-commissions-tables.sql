-- Crear tabla de configuración de comisiones
CREATE TABLE IF NOT EXISTS "VisionCommissionConfig" (
    "id" SERIAL NOT NULL,
    "visionId" INTEGER NOT NULL,
    "basicSeatedRate" DECIMAL(10,2) NOT NULL DEFAULT 300,
    "advanceSeatedRate" DECIMAL(10,2) NOT NULL DEFAULT 500,
    "plStartRate" DECIMAL(10,2) NOT NULL DEFAULT 400,
    "plGuestRate" DECIMAL(10,2) NOT NULL DEFAULT 400,
    "plGradRate" DECIMAL(10,2) NOT NULL DEFAULT 400,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" INTEGER,

    CONSTRAINT "VisionCommissionConfig_pkey" PRIMARY KEY ("id")
);

-- Crear tipo enum para CommissionTriggerEvent
DO $$ BEGIN
    CREATE TYPE "CommissionTriggerEvent" AS ENUM (
        'BASIC_SEATED',
        'ADVANCE_SEATED',
        'PL_START',
        'PL_GUEST_PAID',
        'PL_GRADUATION',
        'MANUAL_ADJUSTMENT'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tipo enum para CommissionStatus
DO $$ BEGIN
    CREATE TYPE "CommissionStatus" AS ENUM (
        'PENDING_REVIEW',
        'AUTHORIZED',
        'PAID',
        'CANCELLED',
        'DISPUTED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Crear tabla de log de comisiones
CREATE TABLE IF NOT EXISTS "StaffCommissionsLog" (
    "id" SERIAL NOT NULL,
    "staffId" INTEGER NOT NULL,
    "triggerEvent" "CommissionTriggerEvent" NOT NULL,
    "relatedUserId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING_REVIEW',
    "payoutDate" TIMESTAMP(3),
    "paidAt" TIMESTAMP(3),
    "notes" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "visionId" INTEGER,
    "organizationId" INTEGER,
    "cycleWeek" INTEGER,
    "cycleYear" INTEGER,

    CONSTRAINT "StaffCommissionsLog_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS "VisionCommissionConfig_visionId_key" ON "VisionCommissionConfig"("visionId");
CREATE INDEX IF NOT EXISTS "VisionCommissionConfig_visionId_idx" ON "VisionCommissionConfig"("visionId");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_staffId_idx" ON "StaffCommissionsLog"("staffId");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_status_idx" ON "StaffCommissionsLog"("status");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_payoutDate_idx" ON "StaffCommissionsLog"("payoutDate");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_triggerEvent_idx" ON "StaffCommissionsLog"("triggerEvent");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_visionId_idx" ON "StaffCommissionsLog"("visionId");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_organizationId_idx" ON "StaffCommissionsLog"("organizationId");
CREATE INDEX IF NOT EXISTS "StaffCommissionsLog_cycleWeek_cycleYear_idx" ON "StaffCommissionsLog"("cycleWeek", "cycleYear");

-- Agregar foreign keys
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'VisionCommissionConfig_visionId_fkey'
    ) THEN
        ALTER TABLE "VisionCommissionConfig" 
        ADD CONSTRAINT "VisionCommissionConfig_visionId_fkey" 
        FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'VisionCommissionConfig_updatedBy_fkey'
    ) THEN
        ALTER TABLE "VisionCommissionConfig" 
        ADD CONSTRAINT "VisionCommissionConfig_updatedBy_fkey" 
        FOREIGN KEY ("updatedBy") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'StaffCommissionsLog_staffId_fkey'
    ) THEN
        ALTER TABLE "StaffCommissionsLog" 
        ADD CONSTRAINT "StaffCommissionsLog_staffId_fkey" 
        FOREIGN KEY ("staffId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'StaffCommissionsLog_relatedUserId_fkey'
    ) THEN
        ALTER TABLE "StaffCommissionsLog" 
        ADD CONSTRAINT "StaffCommissionsLog_relatedUserId_fkey" 
        FOREIGN KEY ("relatedUserId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'StaffCommissionsLog_visionId_fkey'
    ) THEN
        ALTER TABLE "StaffCommissionsLog" 
        ADD CONSTRAINT "StaffCommissionsLog_visionId_fkey" 
        FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'StaffCommissionsLog_organizationId_fkey'
    ) THEN
        ALTER TABLE "StaffCommissionsLog" 
        ADD CONSTRAINT "StaffCommissionsLog_organizationId_fkey" 
        FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
