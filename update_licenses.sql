-- Agregar campos de activación a LicenseAssignment
ALTER TABLE "LicenseAssignment" 
ADD COLUMN IF NOT EXISTS "activatedAt" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP;

-- Establecer expiresAt para licencias existentes no activadas (10 días desde assignedAt)
UPDATE "LicenseAssignment"
SET "expiresAt" = "assignedAt" + INTERVAL '10 days'
WHERE "activatedAt" IS NULL AND "expiresAt" IS NULL;
