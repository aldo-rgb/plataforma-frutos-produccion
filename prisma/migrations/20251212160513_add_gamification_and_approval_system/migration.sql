/*
  Warnings:

  - The values [REVISION,AUTORIZADA] on the enum `EstadoCarta` will be removed. If these variants are still used in the database, this will fail.

*/
-- CreateEnum
CREATE TYPE "EstadoEvidencia" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');

-- AlterEnum - Quitar default primero
ALTER TABLE "CartaFrutos" ALTER COLUMN "estado" DROP DEFAULT;

-- Crear nuevo tipo
CREATE TYPE "EstadoCarta_new" AS ENUM ('BORRADOR', 'EN_REVISION', 'APROBADA', 'RECHAZADA');

-- Migrar datos existentes con CASE
ALTER TABLE "CartaFrutos" ALTER COLUMN "estado" TYPE "EstadoCarta_new" 
USING (
  CASE "estado"::text
    WHEN 'REVISION' THEN 'EN_REVISION'::text::"EstadoCarta_new"
    WHEN 'AUTORIZADA' THEN 'APROBADA'::text::"EstadoCarta_new"
    ELSE "estado"::text::"EstadoCarta_new"
  END
);

-- Eliminar tipo antiguo y renombrar nuevo
DROP TYPE "EstadoCarta";
ALTER TYPE "EstadoCarta_new" RENAME TO "EstadoCarta";

-- Restaurar default
ALTER TABLE "CartaFrutos" ALTER COLUMN "estado" SET DEFAULT 'BORRADOR';

-- AlterTable
ALTER TABLE "CartaFrutos" ADD COLUMN     "feedbackMentor" TEXT;

-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN     "gameChangerId" INTEGER,
ADD COLUMN     "puntosGamificacion" INTEGER NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "EvidenciaAccion" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "metaId" INTEGER,
    "accionId" INTEGER NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fotoUrl" TEXT NOT NULL,
    "descripcion" TEXT,
    "estado" "EstadoEvidencia" NOT NULL DEFAULT 'PENDIENTE',
    "comentarioMentor" TEXT,
    "revisadoPorId" INTEGER,
    "fechaRevision" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EvidenciaAccion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_gameChangerId_fkey" FOREIGN KEY ("gameChangerId") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EvidenciaAccion" ADD CONSTRAINT "EvidenciaAccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EvidenciaAccion" ADD CONSTRAINT "EvidenciaAccion_accionId_fkey" FOREIGN KEY ("accionId") REFERENCES "Accion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
