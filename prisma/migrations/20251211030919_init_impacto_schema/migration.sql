-- CreateEnum
CREATE TYPE "Rol" AS ENUM ('LIDER', 'PARTICIPANTE', 'MENTOR', 'COORDINADOR', 'ADMINISTRADOR', 'GAMECHANGER');

-- CreateEnum
CREATE TYPE "EstadoSuscripcion" AS ENUM ('ACTIVO', 'INACTIVO', 'PRUEBA');

-- CreateEnum
CREATE TYPE "TipoPago" AS ENUM ('STRIPE', 'PAYPAL', 'PUNTOS', 'TRANSFERENCIA');

-- CreateEnum
CREATE TYPE "EstadoCarta" AS ENUM ('BORRADOR', 'REVISION', 'AUTORIZADA', 'RECHAZADA');

-- CreateTable
CREATE TABLE "Usuario" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT,
    "imagen" TEXT,
    "rol" "Rol" NOT NULL DEFAULT 'LIDER',
    "puntosCuanticos" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "suscripcion" "EstadoSuscripcion" NOT NULL DEFAULT 'INACTIVO',
    "planActual" TEXT,
    "fechaFinSuscripcion" TIMESTAMP(3),
    "mentorId" INTEGER,
    "coordinadorId" INTEGER,
    "vision" TEXT,
    "sede" TEXT,
    "llamadasPerdidas" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CartaFrutos" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "finanzasMeta" TEXT,
    "finanzasAvance" INTEGER NOT NULL DEFAULT 0,
    "finanzasScheduledDays" TEXT,
    "relacionesMeta" TEXT,
    "relacionesAvance" INTEGER NOT NULL DEFAULT 0,
    "relacionesScheduledDays" TEXT,
    "talentosMeta" TEXT,
    "talentosAvance" INTEGER NOT NULL DEFAULT 0,
    "talentosScheduledDays" TEXT,
    "pazMentalMeta" TEXT,
    "pazMentalAvance" INTEGER NOT NULL DEFAULT 0,
    "pazMentalScheduledDays" TEXT,
    "ocioMeta" TEXT,
    "ocioAvance" INTEGER NOT NULL DEFAULT 0,
    "ocioScheduledDays" TEXT,
    "saludMeta" TEXT,
    "saludAvance" INTEGER NOT NULL DEFAULT 0,
    "saludScheduledDays" TEXT,
    "servicioTransMeta" TEXT,
    "servicioTransAvance" INTEGER NOT NULL DEFAULT 0,
    "servicioTransScheduledDays" TEXT,
    "servicioComunMeta" TEXT,
    "servicioComunAvance" INTEGER NOT NULL DEFAULT 0,
    "servicioComunScheduledDays" TEXT,
    "enrolamientoMeta" TEXT DEFAULT 'Invitar a 4 personas',
    "enrolamientoAvance" INTEGER NOT NULL DEFAULT 0,
    "invitadosInscritos" INTEGER NOT NULL DEFAULT 0,
    "estado" "EstadoCarta" NOT NULL DEFAULT 'BORRADOR',
    "autorizadoMentor" BOOLEAN NOT NULL DEFAULT false,
    "autorizadoCoord" BOOLEAN NOT NULL DEFAULT false,
    "autorizadoPorId" INTEGER,
    "fechaActualizacion" TIMESTAMP(3) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CartaFrutos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tarea" (
    "id" SERIAL NOT NULL,
    "cartaId" INTEGER NOT NULL,
    "categoria" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "completada" BOOLEAN NOT NULL DEFAULT false,
    "requiereFoto" BOOLEAN NOT NULL DEFAULT true,
    "evidenciaId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Evidencia" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "urlArchivo" TEXT,
    "semana" INTEGER NOT NULL,
    "completado" BOOLEAN NOT NULL DEFAULT false,
    "validada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Evidencia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Producto" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "precioPuntos" INTEGER,
    "precioDinero" DOUBLE PRECISION,
    "imagenUrl" TEXT NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 100,
    "tipo" TEXT NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Producto_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaccion" (
    "id" SERIAL NOT NULL,
    "montoPuntos" INTEGER,
    "montoDinero" DOUBLE PRECISION,
    "metodo" "TipoPago" NOT NULL,
    "estado" TEXT NOT NULL DEFAULT 'COMPLETADO',
    "usuarioId" INTEGER NOT NULL,
    "productoId" INTEGER,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Transaccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MensajeChat" (
    "id" SERIAL NOT NULL,
    "role" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MensajeChat_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_email_key" ON "Usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Tarea_evidenciaId_key" ON "Tarea"("evidenciaId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_coordinadorId_fkey" FOREIGN KEY ("coordinadorId") REFERENCES "Usuario"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "CartaFrutos" ADD CONSTRAINT "CartaFrutos_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tarea" ADD CONSTRAINT "Tarea_cartaId_fkey" FOREIGN KEY ("cartaId") REFERENCES "CartaFrutos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Evidencia" ADD CONSTRAINT "Evidencia_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaccion" ADD CONSTRAINT "Transaccion_productoId_fkey" FOREIGN KEY ("productoId") REFERENCES "Producto"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MensajeChat" ADD CONSTRAINT "MensajeChat_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
