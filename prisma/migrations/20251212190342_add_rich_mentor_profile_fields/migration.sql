/*
  Warnings:

  - A unique constraint covering the columns `[perfilMentorId,tipo]` on the table `ServicioMentoria` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "PerfilMentor" ADD COLUMN     "biografiaCompleta" TEXT,
ADD COLUMN     "biografiaCorta" TEXT,
ADD COLUMN     "destacado" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "especialidadesSecundarias" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "logros" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "titulo" TEXT,
ADD COLUMN     "totalSesiones" INTEGER NOT NULL DEFAULT 0;

-- CreateIndex
CREATE UNIQUE INDEX "ServicioMentoria_perfilMentorId_tipo_key" ON "ServicioMentoria"("perfilMentorId", "tipo");
