-- Crear tabla MasterOrganization
CREATE TABLE IF NOT EXISTS "MasterOrganization" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "logoUrl" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdBy" INTEGER NOT NULL,

    CONSTRAINT "MasterOrganization_pkey" PRIMARY KEY ("id")
);

-- Crear índices
CREATE UNIQUE INDEX IF NOT EXISTS "MasterOrganization_name_key" ON "MasterOrganization"("name");
CREATE INDEX IF NOT EXISTS "MasterOrganization_isActive_idx" ON "MasterOrganization"("isActive");
CREATE INDEX IF NOT EXISTS "MasterOrganization_name_idx" ON "MasterOrganization"("name");

-- Agregar foreign key a Usuario
ALTER TABLE "MasterOrganization" 
ADD CONSTRAINT "MasterOrganization_createdBy_fkey" 
FOREIGN KEY ("createdBy") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Agregar columna masterOrganizationId a Organization si no existe
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Organization' 
        AND column_name = 'masterOrganizationId'
    ) THEN
        ALTER TABLE "Organization" ADD COLUMN "masterOrganizationId" INTEGER;
    END IF;
END $$;

-- Crear índice en Organization
CREATE INDEX IF NOT EXISTS "Organization_masterOrganizationId_idx" ON "Organization"("masterOrganizationId");

-- Agregar foreign key de Organization a MasterOrganization
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'Organization_masterOrganizationId_fkey'
    ) THEN
        ALTER TABLE "Organization" 
        ADD CONSTRAINT "Organization_masterOrganizationId_fkey" 
        FOREIGN KEY ("masterOrganizationId") REFERENCES "MasterOrganization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
