-- Migration: Multi-Level Ecosystem & Financial Independence
-- Fecha: 2026-01-05
-- Descripción: Agrega soporte para sistema multi-nivel (Discovery, Breakthrough, Quantum Leap)
--              y pagos independientes con Stripe Connect

-- 1. Agregar nuevos roles de coordinadores
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'COORDINATOR_BASIC';
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'COORDINATOR_ADVANCED';
ALTER TYPE "Rol" ADD VALUE IF NOT EXISTS 'TRAINER';

-- 2. Crear enum para niveles de visión
CREATE TYPE "VisionLevel" AS ENUM ('BASIC', 'ADVANCED', 'PL');

-- 3. Crear enum para estados de estudiantes
CREATE TYPE "StudentStatus" AS ENUM (
  'BASIC_STUDENT',
  'ADVANCED_CANDIDATE',
  'ADVANCED_STUDENT',
  'PL_CANDIDATE',
  'PL_STUDENT',
  'ALUMNI'
);

-- 4. Agregar campos a la tabla Vision
ALTER TABLE "Vision" 
ADD COLUMN IF NOT EXISTS "enabledLevels" "VisionLevel"[] DEFAULT ARRAY['PL']::"VisionLevel"[],
ADD COLUMN IF NOT EXISTS "financialConfigId" TEXT,
ADD COLUMN IF NOT EXISTS "platformFeePercent" DOUBLE PRECISION DEFAULT 0;

-- 5. Agregar campos a la tabla Usuario
ALTER TABLE "Usuario"
ADD COLUMN IF NOT EXISTS "studentStatus" "StudentStatus",
ADD COLUMN IF NOT EXISTS "currentVisionLevel" "VisionLevel",
ADD COLUMN IF NOT EXISTS "graduatedFromBasic" TIMESTAMP(3),
ADD COLUMN IF NOT EXISTS "graduatedFromAdvanced" TIMESTAMP(3);

-- 6. Crear tabla VisionTicket (Productos/Tickets del Director)
CREATE TABLE IF NOT EXISTS "VisionTicket" (
  "id" SERIAL PRIMARY KEY,
  "visionId" INTEGER NOT NULL,
  "level" "VisionLevel" NOT NULL,
  "nombre" TEXT NOT NULL,
  "nombreEn" TEXT,
  "descripcion" TEXT,
  "descripcionEn" TEXT,
  "precio" DOUBLE PRECISION NOT NULL,
  "precioUSD" DOUBLE PRECISION,
  "cupo" INTEGER NOT NULL,
  "vendidos" INTEGER DEFAULT 0,
  "isActive" BOOLEAN DEFAULT true,
  "requiresPayment" BOOLEAN DEFAULT true,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "VisionTicket_visionId_fkey" FOREIGN KEY ("visionId")
    REFERENCES "Vision"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "VisionTicket_visionId_idx" ON "VisionTicket"("visionId");
CREATE INDEX IF NOT EXISTS "VisionTicket_level_idx" ON "VisionTicket"("level");
CREATE INDEX IF NOT EXISTS "VisionTicket_isActive_idx" ON "VisionTicket"("isActive");

-- 7. Crear tabla TicketPurchase (Compras de tickets)
CREATE TABLE IF NOT EXISTS "TicketPurchase" (
  "id" SERIAL PRIMARY KEY,
  "ticketId" INTEGER NOT NULL,
  "userId" INTEGER NOT NULL,
  "visionId" INTEGER NOT NULL,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'MXN',
  "paymentMethod" TEXT NOT NULL,
  "stripePaymentId" TEXT,
  "status" "PaymentStatus" DEFAULT 'PENDING',
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "TicketPurchase_ticketId_fkey" FOREIGN KEY ("ticketId")
    REFERENCES "VisionTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "TicketPurchase_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "TicketPurchase_ticketId_idx" ON "TicketPurchase"("ticketId");
CREATE INDEX IF NOT EXISTS "TicketPurchase_userId_idx" ON "TicketPurchase"("userId");
CREATE INDEX IF NOT EXISTS "TicketPurchase_visionId_idx" ON "TicketPurchase"("visionId");
CREATE INDEX IF NOT EXISTS "TicketPurchase_status_idx" ON "TicketPurchase"("status");

-- 8. Crear tabla AccessCode (Códigos de acceso para pagos en efectivo)
CREATE TABLE IF NOT EXISTS "AccessCode" (
  "id" SERIAL PRIMARY KEY,
  "code" TEXT UNIQUE NOT NULL,
  "ticketId" INTEGER NOT NULL,
  "visionId" INTEGER NOT NULL,
  "generatedBy" INTEGER NOT NULL,
  "usedBy" INTEGER,
  "amount" DOUBLE PRECISION NOT NULL,
  "currency" TEXT DEFAULT 'MXN',
  "status" TEXT DEFAULT 'ACTIVE',
  "expiresAt" TIMESTAMP(3),
  "usedAt" TIMESTAMP(3),
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "AccessCode_ticketId_fkey" FOREIGN KEY ("ticketId")
    REFERENCES "VisionTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccessCode_generatedBy_fkey" FOREIGN KEY ("generatedBy")
    REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "AccessCode_usedBy_fkey" FOREIGN KEY ("usedBy")
    REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "AccessCode_code_idx" ON "AccessCode"("code");
CREATE INDEX IF NOT EXISTS "AccessCode_ticketId_idx" ON "AccessCode"("ticketId");
CREATE INDEX IF NOT EXISTS "AccessCode_visionId_idx" ON "AccessCode"("visionId");
CREATE INDEX IF NOT EXISTS "AccessCode_generatedBy_idx" ON "AccessCode"("generatedBy");
CREATE INDEX IF NOT EXISTS "AccessCode_status_idx" ON "AccessCode"("status");

-- 9. Crear tabla StudentGraduation (Registro de graduaciones)
CREATE TABLE IF NOT EXISTS "StudentGraduation" (
  "id" SERIAL PRIMARY KEY,
  "userId" INTEGER NOT NULL,
  "visionId" INTEGER NOT NULL,
  "fromLevel" "VisionLevel" NOT NULL,
  "toLevel" "VisionLevel" NOT NULL,
  "graduatedBy" INTEGER NOT NULL,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "StudentGraduation_userId_fkey" FOREIGN KEY ("userId")
    REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "StudentGraduation_graduatedBy_fkey" FOREIGN KEY ("graduatedBy")
    REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StudentGraduation_userId_idx" ON "StudentGraduation"("userId");
CREATE INDEX IF NOT EXISTS "StudentGraduation_visionId_idx" ON "StudentGraduation"("visionId");
CREATE INDEX IF NOT EXISTS "StudentGraduation_fromLevel_idx" ON "StudentGraduation"("fromLevel");
CREATE INDEX IF NOT EXISTS "StudentGraduation_toLevel_idx" ON "StudentGraduation"("toLevel");

-- 10. Crear tabla StripeConnectConfig (Configuración de Stripe Connect)
CREATE TABLE IF NOT EXISTS "StripeConnectConfig" (
  "id" SERIAL PRIMARY KEY,
  "organizationId" INTEGER UNIQUE NOT NULL,
  "stripeAccountId" TEXT UNIQUE NOT NULL,
  "accountStatus" TEXT DEFAULT 'pending',
  "chargesEnabled" BOOLEAN DEFAULT false,
  "payoutsEnabled" BOOLEAN DEFAULT false,
  "detailsSubmitted" BOOLEAN DEFAULT false,
  "onboardingCompleted" BOOLEAN DEFAULT false,
  "platformFeePercent" DOUBLE PRECISION DEFAULT 1.0,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
  
  CONSTRAINT "StripeConnectConfig_organizationId_fkey" FOREIGN KEY ("organizationId")
    REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "StripeConnectConfig_stripeAccountId_idx" ON "StripeConnectConfig"("stripeAccountId");
CREATE INDEX IF NOT EXISTS "StripeConnectConfig_organizationId_idx" ON "StripeConnectConfig"("organizationId");

-- 11. Agregar comentarios a las tablas
COMMENT ON TABLE "VisionTicket" IS 'Productos/Tickets creados por el Director para cada nivel de la visión';
COMMENT ON TABLE "TicketPurchase" IS 'Registro de compras de tickets por estudiantes';
COMMENT ON TABLE "AccessCode" IS 'Códigos de acceso generados por coordinadores para pagos en efectivo';
COMMENT ON TABLE "StudentGraduation" IS 'Registro histórico de graduaciones de estudiantes entre niveles';
COMMENT ON TABLE "StripeConnectConfig" IS 'Configuración de Stripe Connect para pagos independientes por organización';

-- 12. Función para actualizar timestamps automáticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 13. Triggers para actualizar updatedAt
CREATE TRIGGER update_VisionTicket_updated_at BEFORE UPDATE ON "VisionTicket"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_TicketPurchase_updated_at BEFORE UPDATE ON "TicketPurchase"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_StripeConnectConfig_updated_at BEFORE UPDATE ON "StripeConnectConfig"
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
