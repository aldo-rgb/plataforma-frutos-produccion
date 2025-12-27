-- Agregar columnas de onboarding al modelo Usuario
ALTER TABLE "Usuario" 
ADD COLUMN IF NOT EXISTS "wizardCompleted" BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS "onboardingOrigin" TEXT DEFAULT 'ORGANIC_SIGNUP',
ADD COLUMN IF NOT EXISTS "magicLinkToken" TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS "magicLinkExpiry" TIMESTAMP,
ADD COLUMN IF NOT EXISTS "temporaryPassword" TEXT;

-- Crear índice único para magicLinkToken
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_magicLinkToken_key" ON "Usuario"("magicLinkToken");
