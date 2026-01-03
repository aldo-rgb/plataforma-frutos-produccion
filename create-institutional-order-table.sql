-- Create InstitutionalOrder table
CREATE TABLE IF NOT EXISTS "public"."InstitutionalOrder" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "nombreOrganizacion" TEXT NOT NULL,
  "emailCoordinador" TEXT NOT NULL,
  "logoUrl" TEXT,
  "geofencing" TEXT,
  "cantidadLicencias" INTEGER NOT NULL,
  "totalAmount" DOUBLE PRECISION NOT NULL,
  "paymentMethod" TEXT NOT NULL,
  "paymentSessionId" TEXT,
  "paymentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "organizationId" INTEGER,
  "processedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "InstitutionalOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "public"."Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "InstitutionalOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "public"."Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- Create indexes
CREATE INDEX IF NOT EXISTS "InstitutionalOrder_userId_idx" ON "public"."InstitutionalOrder"("userId");
CREATE INDEX IF NOT EXISTS "InstitutionalOrder_status_idx" ON "public"."InstitutionalOrder"("status");
CREATE INDEX IF NOT EXISTS "InstitutionalOrder_organizationId_idx" ON "public"."InstitutionalOrder"("organizationId");
