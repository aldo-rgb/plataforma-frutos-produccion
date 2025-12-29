-- Script para crear la tabla AvatarGenerationAttempt
CREATE TABLE IF NOT EXISTS "AvatarGenerationAttempt" (
  "id" SERIAL PRIMARY KEY,
  "usuarioId" INTEGER NOT NULL,
  "sourceImage" TEXT NOT NULL,
  "generatedUrl" TEXT NOT NULL,
  "vibe" TEXT DEFAULT 'cyberpunk' NOT NULL,
  "gender" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP NOT NULL,
  CONSTRAINT "AvatarGenerationAttempt_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- Crear índices
CREATE INDEX IF NOT EXISTS "AvatarGenerationAttempt_usuarioId_idx" ON "AvatarGenerationAttempt"("usuarioId");
CREATE INDEX IF NOT EXISTS "AvatarGenerationAttempt_createdAt_idx" ON "AvatarGenerationAttempt"("createdAt");
