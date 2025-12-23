-- AlterTable
ALTER TABLE "CartaFrutos" ADD COLUMN     "finanzasDeclaracion" TEXT,
ADD COLUMN     "ocioDeclaracion" TEXT,
ADD COLUMN     "pazMentalDeclaracion" TEXT,
ADD COLUMN     "relacionesDeclaracion" TEXT,
ADD COLUMN     "saludDeclaracion" TEXT,
ADD COLUMN     "servicioComunDeclaracion" TEXT,
ADD COLUMN     "servicioTransDeclaracion" TEXT,
ADD COLUMN     "talentosDeclaracion" TEXT;

-- CreateTable
CREATE TABLE "Meta" (
    "id" SERIAL NOT NULL,
    "cartaId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "orden" INTEGER NOT NULL DEFAULT 1,
    "declaracionPoder" TEXT,
    "metaPrincipal" TEXT NOT NULL,
    "avance" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Meta_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Accion" (
    "id" SERIAL NOT NULL,
    "metaId" INTEGER NOT NULL,
    "texto" TEXT NOT NULL,
    "diasProgramados" TEXT,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "enRevision" BOOLEAN NOT NULL DEFAULT false,
    "requiereEvidencia" BOOLEAN NOT NULL DEFAULT false,
    "lastCompletedDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Accion_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Meta" ADD CONSTRAINT "Meta_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "CartaFrutos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Accion" ADD CONSTRAINT "Accion_metaId_fkey" FOREIGN KEY ("metaId") REFERENCES "Meta"("id") ON DELETE CASCADE ON UPDATE CASCADE;
