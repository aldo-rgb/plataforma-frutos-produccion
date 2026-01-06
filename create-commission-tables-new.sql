-- ============================================
-- SISTEMA DE COMISIONES PARA COORDINADORES
-- ============================================

-- Crear tabla de enrollments de visiones
CREATE TABLE IF NOT EXISTS "vision_enrollments" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "visionId" INTEGER NOT NULL,
    "level" TEXT NOT NULL,
    "coordinatorId" INTEGER NOT NULL,
    "enrollmentStatus" TEXT NOT NULL DEFAULT 'ENROLLED',
    "attendanceStatus" TEXT,
    "paymentStatus" TEXT,
    "invitedBy" INTEGER,
    "enrolledAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "graduatedAt" TIMESTAMP(3),
    "droppedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "vision_enrollments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "vision_enrollments_userId_visionId_level_key" ON "vision_enrollments"("userId", "visionId", "level");
CREATE INDEX IF NOT EXISTS "vision_enrollments_userId_idx" ON "vision_enrollments"("userId");
CREATE INDEX IF NOT EXISTS "vision_enrollments_visionId_idx" ON "vision_enrollments"("visionId");
CREATE INDEX IF NOT EXISTS "vision_enrollments_coordinatorId_idx" ON "vision_enrollments"("coordinatorId");
CREATE INDEX IF NOT EXISTS "vision_enrollments_invitedBy_idx" ON "vision_enrollments"("invitedBy");
CREATE INDEX IF NOT EXISTS "vision_enrollments_level_idx" ON "vision_enrollments"("level");
CREATE INDEX IF NOT EXISTS "vision_enrollments_enrollmentStatus_idx" ON "vision_enrollments"("enrollmentStatus");

-- Foreign keys para vision_enrollments
ALTER TABLE "vision_enrollments" DROP CONSTRAINT IF EXISTS "vision_enrollments_userId_fkey";
ALTER TABLE "vision_enrollments" ADD CONSTRAINT "vision_enrollments_userId_fkey" 
    FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vision_enrollments" DROP CONSTRAINT IF EXISTS "vision_enrollments_visionId_fkey";
ALTER TABLE "vision_enrollments" ADD CONSTRAINT "vision_enrollments_visionId_fkey" 
    FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "vision_enrollments" DROP CONSTRAINT IF EXISTS "vision_enrollments_coordinatorId_fkey";
ALTER TABLE "vision_enrollments" ADD CONSTRAINT "vision_enrollments_coordinatorId_fkey" 
    FOREIGN KEY ("coordinatorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "vision_enrollments" DROP CONSTRAINT IF EXISTS "vision_enrollments_invitedBy_fkey";
ALTER TABLE "vision_enrollments" ADD CONSTRAINT "vision_enrollments_invitedBy_fkey" 
    FOREIGN KEY ("invitedBy") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Crear tabla de configuración de comisiones
CREATE TABLE IF NOT EXISTS "coordinator_commission_config" (
    "id" SERIAL NOT NULL,
    "visionId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "basicSeatedRate" DECIMAL(10,2) NOT NULL DEFAULT 300.00,
    "advanceSeatedRate" DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    "plStartRate" DECIMAL(10,2) NOT NULL DEFAULT 400.00,
    "plGuestRate" DECIMAL(10,2) NOT NULL DEFAULT 400.00,
    "plGradRate" DECIMAL(10,2) NOT NULL DEFAULT 400.00,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "coordinator_commission_config_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "coordinator_commission_config_visionId_key" ON "coordinator_commission_config"("visionId");
CREATE INDEX IF NOT EXISTS "coordinator_commission_config_visionId_idx" ON "coordinator_commission_config"("visionId");
CREATE INDEX IF NOT EXISTS "coordinator_commission_config_organizationId_idx" ON "coordinator_commission_config"("organizationId");

-- Foreign keys para coordinator_commission_config
ALTER TABLE "coordinator_commission_config" DROP CONSTRAINT IF EXISTS "coordinator_commission_config_visionId_fkey";
ALTER TABLE "coordinator_commission_config" ADD CONSTRAINT "coordinator_commission_config_visionId_fkey" 
    FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coordinator_commission_config" DROP CONSTRAINT IF EXISTS "coordinator_commission_config_organizationId_fkey";
ALTER TABLE "coordinator_commission_config" ADD CONSTRAINT "coordinator_commission_config_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coordinator_commission_config" DROP CONSTRAINT IF EXISTS "coordinator_commission_config_createdBy_fkey";
ALTER TABLE "coordinator_commission_config" ADD CONSTRAINT "coordinator_commission_config_createdBy_fkey" 
    FOREIGN KEY ("createdBy") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Crear tabla de comisiones
CREATE TABLE IF NOT EXISTS "coordinator_commissions" (
    "id" SERIAL NOT NULL,
    "coordinatorId" INTEGER NOT NULL,
    "coordinatorRole" TEXT NOT NULL,
    "triggerEvent" TEXT NOT NULL,
    "relatedUserId" INTEGER NOT NULL,
    "relatedEnrollmentId" INTEGER,
    "amount" DECIMAL(10,2) NOT NULL,
    "configSnapshot" JSONB,
    "status" TEXT NOT NULL DEFAULT 'PENDING_REVIEW',
    "payoutScheduledDate" TIMESTAMP(3),
    "payoutCompletedDate" TIMESTAMP(3),
    "visionId" INTEGER NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "notes" TEXT,
    "verifiedBy" INTEGER,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "coordinator_commissions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "coordinator_commissions_coordinatorId_idx" ON "coordinator_commissions"("coordinatorId");
CREATE INDEX IF NOT EXISTS "coordinator_commissions_relatedUserId_idx" ON "coordinator_commissions"("relatedUserId");
CREATE INDEX IF NOT EXISTS "coordinator_commissions_status_idx" ON "coordinator_commissions"("status");
CREATE INDEX IF NOT EXISTS "coordinator_commissions_payoutScheduledDate_idx" ON "coordinator_commissions"("payoutScheduledDate");
CREATE INDEX IF NOT EXISTS "coordinator_commissions_visionId_idx" ON "coordinator_commissions"("visionId");
CREATE INDEX IF NOT EXISTS "coordinator_commissions_organizationId_idx" ON "coordinator_commissions"("organizationId");
CREATE INDEX IF NOT EXISTS "coordinator_commissions_triggerEvent_idx" ON "coordinator_commissions"("triggerEvent");

-- Foreign keys para coordinator_commissions
ALTER TABLE "coordinator_commissions" DROP CONSTRAINT IF EXISTS "coordinator_commissions_coordinatorId_fkey";
ALTER TABLE "coordinator_commissions" ADD CONSTRAINT "coordinator_commissions_coordinatorId_fkey" 
    FOREIGN KEY ("coordinatorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "coordinator_commissions" DROP CONSTRAINT IF EXISTS "coordinator_commissions_relatedUserId_fkey";
ALTER TABLE "coordinator_commissions" ADD CONSTRAINT "coordinator_commissions_relatedUserId_fkey" 
    FOREIGN KEY ("relatedUserId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "coordinator_commissions" DROP CONSTRAINT IF EXISTS "coordinator_commissions_relatedEnrollmentId_fkey";
ALTER TABLE "coordinator_commissions" ADD CONSTRAINT "coordinator_commissions_relatedEnrollmentId_fkey" 
    FOREIGN KEY ("relatedEnrollmentId") REFERENCES "vision_enrollments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "coordinator_commissions" DROP CONSTRAINT IF EXISTS "coordinator_commissions_visionId_fkey";
ALTER TABLE "coordinator_commissions" ADD CONSTRAINT "coordinator_commissions_visionId_fkey" 
    FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "coordinator_commissions" DROP CONSTRAINT IF EXISTS "coordinator_commissions_organizationId_fkey";
ALTER TABLE "coordinator_commissions" ADD CONSTRAINT "coordinator_commissions_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "coordinator_commissions" DROP CONSTRAINT IF EXISTS "coordinator_commissions_verifiedBy_fkey";
ALTER TABLE "coordinator_commissions" ADD CONSTRAINT "coordinator_commissions_verifiedBy_fkey" 
    FOREIGN KEY ("verifiedBy") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Crear tabla de resumen semanal
CREATE TABLE IF NOT EXISTS "weekly_payout_summary" (
    "id" SERIAL NOT NULL,
    "weekStartDate" DATE NOT NULL,
    "weekEndDate" DATE NOT NULL,
    "payoutDate" DATE NOT NULL,
    "organizationId" INTEGER NOT NULL,
    "visionId" INTEGER,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "totalCommissions" INTEGER NOT NULL,
    "coordinatorsCount" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "generatedBy" INTEGER NOT NULL,
    "approvedBy" INTEGER,
    "approvedAt" TIMESTAMP(3),
    "summaryData" JSONB NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "weekly_payout_summary_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "weekly_payout_summary_organizationId_weekStartDate_visionId_key" 
    ON "weekly_payout_summary"("organizationId", "weekStartDate", "visionId");
CREATE INDEX IF NOT EXISTS "weekly_payout_summary_organizationId_idx" ON "weekly_payout_summary"("organizationId");
CREATE INDEX IF NOT EXISTS "weekly_payout_summary_visionId_idx" ON "weekly_payout_summary"("visionId");
CREATE INDEX IF NOT EXISTS "weekly_payout_summary_weekStartDate_idx" ON "weekly_payout_summary"("weekStartDate");
CREATE INDEX IF NOT EXISTS "weekly_payout_summary_status_idx" ON "weekly_payout_summary"("status");

-- Foreign keys para weekly_payout_summary
ALTER TABLE "weekly_payout_summary" DROP CONSTRAINT IF EXISTS "weekly_payout_summary_organizationId_fkey";
ALTER TABLE "weekly_payout_summary" ADD CONSTRAINT "weekly_payout_summary_organizationId_fkey" 
    FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "weekly_payout_summary" DROP CONSTRAINT IF EXISTS "weekly_payout_summary_visionId_fkey";
ALTER TABLE "weekly_payout_summary" ADD CONSTRAINT "weekly_payout_summary_visionId_fkey" 
    FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "weekly_payout_summary" DROP CONSTRAINT IF EXISTS "weekly_payout_summary_generatedBy_fkey";
ALTER TABLE "weekly_payout_summary" ADD CONSTRAINT "weekly_payout_summary_generatedBy_fkey" 
    FOREIGN KEY ("generatedBy") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "weekly_payout_summary" DROP CONSTRAINT IF EXISTS "weekly_payout_summary_approvedBy_fkey";
ALTER TABLE "weekly_payout_summary" ADD CONSTRAINT "weekly_payout_summary_approvedBy_fkey" 
    FOREIGN KEY ("approvedBy") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
