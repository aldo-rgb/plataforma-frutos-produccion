-- AlterTable: Agregar campos de tracking de ratings y sesiones completadas
ALTER TABLE "PerfilMentor" ADD COLUMN "completedSessionsCount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "PerfilMentor" ADD COLUMN "ratingSum" DECIMAL(10,2) NOT NULL DEFAULT 0;
ALTER TABLE "PerfilMentor" ADD COLUMN "ratingCount" INTEGER NOT NULL DEFAULT 0;

-- AlterTable: Actualizar ResenasMentoria con nuevos campos
ALTER TABLE "ResenasMentoria" ADD COLUMN "verificadaSesion" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "ResenasMentoria" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- AlterTable: Cambiar tipo de columna comentario a TEXT
ALTER TABLE "ResenasMentoria" ALTER COLUMN "comentario" TYPE TEXT;

-- CreateIndex: Agregar índices para mejor performance en queries
CREATE INDEX "ResenasMentoria_perfilMentorId_idx" ON "ResenasMentoria"("perfilMentorId");
CREATE INDEX "ResenasMentoria_clienteId_idx" ON "ResenasMentoria"("clienteId");
