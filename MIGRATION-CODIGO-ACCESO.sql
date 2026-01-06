-- CreateEnum for CodigoTipo
CREATE TYPE "CodigoTipo" AS ENUM ('MEMBRESIA_MENTOR', 'MEMBRESIA_STANDARD', 'MEMBRESIA_PREMIUM', 'MENTORIA_1_1', 'LICENCIAS_INSTITUCIONAL');

-- CreateEnum for CodigoEstado
CREATE TYPE "CodigoEstado" AS ENUM ('DISPONIBLE', 'CANJEADO', 'EXPIRADO');

-- CreateTable CodigoAcceso
CREATE TABLE "CodigoAcceso" (
    "id" SERIAL NOT NULL,
    "codigo" TEXT NOT NULL,
    "tipo" "CodigoTipo" NOT NULL,
    "cantidadLicencias" INTEGER,
    "licenciasUsadas" INTEGER,
    "descripcion" TEXT,
    "estado" "CodigoEstado" NOT NULL DEFAULT 'DISPONIBLE',
    "canjeadoPorId" INTEGER,
    "canjeadoEn" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CodigoAcceso_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CodigoAcceso_codigo_key" ON "CodigoAcceso"("codigo");

-- CreateIndex
CREATE INDEX "CodigoAcceso_codigo_idx" ON "CodigoAcceso"("codigo");

-- CreateIndex
CREATE INDEX "CodigoAcceso_estado_idx" ON "CodigoAcceso"("estado");

-- CreateIndex
CREATE INDEX "CodigoAcceso_tipo_idx" ON "CodigoAcceso"("tipo");

-- AddForeignKey
ALTER TABLE "CodigoAcceso" ADD CONSTRAINT "CodigoAcceso_canjeadoPorId_fkey" FOREIGN KEY ("canjeadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
