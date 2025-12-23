-- CreateEnum para niveles de mentor
CREATE TYPE "NivelMentor" AS ENUM ('JUNIOR', 'SENIOR', 'MASTER');

-- CreateEnum para tipos de servicio
CREATE TYPE "TipoServicioMentoria" AS ENUM ('SESION_1_1', 'PAQUETE_MENSUAL', 'CONSULTORIA_EXPRESS');

-- CreateEnum para estados de solicitud
CREATE TYPE "EstadoSolicitudMentoria" AS ENUM ('PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA');

-- Tabla de Perfiles de Mentor (Extensión de Usuario)
CREATE TABLE "PerfilMentor" (
    "id" SERIAL NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "nivel" "NivelMentor" NOT NULL DEFAULT 'JUNIOR',
    "especialidad" TEXT NOT NULL,
    "biografia" TEXT,
    "experienciaAnios" INTEGER NOT NULL DEFAULT 0,
    "calificacionPromedio" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalResenas" INTEGER NOT NULL DEFAULT 0,
    "disponible" BOOLEAN NOT NULL DEFAULT true,
    "comisionMentor" INTEGER NOT NULL DEFAULT 85,
    "comisionPlataforma" INTEGER NOT NULL DEFAULT 15,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PerfilMentor_pkey" PRIMARY KEY ("id")
);

-- Tabla de Servicios de Mentoría (Catálogo de precios por mentor)
CREATE TABLE "ServicioMentoria" (
    "id" SERIAL NOT NULL,
    "perfilMentorId" INTEGER NOT NULL,
    "tipo" "TipoServicioMentoria" NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "duracionHoras" DOUBLE PRECISION NOT NULL,
    "precioTotal" DOUBLE PRECISION NOT NULL,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ServicioMentoria_pkey" PRIMARY KEY ("id")
);

-- Tabla de Solicitudes de Mentoría
CREATE TABLE "SolicitudMentoria" (
    "id" SERIAL NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "perfilMentorId" INTEGER NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "estado" "EstadoSolicitudMentoria" NOT NULL DEFAULT 'PENDIENTE',
    "fechaSolicitada" TIMESTAMP(3),
    "horaSolicitada" TEXT,
    "montoTotal" DOUBLE PRECISION NOT NULL,
    "montoPagadoMentor" DOUBLE PRECISION NOT NULL,
    "montoPagadoPlataforma" DOUBLE PRECISION NOT NULL,
    "transaccionId" INTEGER,
    "notas" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SolicitudMentoria_pkey" PRIMARY KEY ("id")
);

-- Tabla de Reseñas de Mentoría
CREATE TABLE "ResenasMentoria" (
    "id" SERIAL NOT NULL,
    "solicitudId" INTEGER NOT NULL,
    "clienteId" INTEGER NOT NULL,
    "perfilMentorId" INTEGER NOT NULL,
    "calificacion" INTEGER NOT NULL,
    "comentario" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ResenasMentoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PerfilMentor_usuarioId_key" ON "PerfilMentor"("usuarioId");

-- CreateIndex
CREATE UNIQUE INDEX "ResenasMentoria_solicitudId_key" ON "ResenasMentoria"("solicitudId");

-- AddForeignKey
ALTER TABLE "PerfilMentor" ADD CONSTRAINT "PerfilMentor_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicioMentoria" ADD CONSTRAINT "ServicioMentoria_perfilMentorId_fkey" FOREIGN KEY ("perfilMentorId") REFERENCES "PerfilMentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudMentoria" ADD CONSTRAINT "SolicitudMentoria_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudMentoria" ADD CONSTRAINT "SolicitudMentoria_perfilMentorId_fkey" FOREIGN KEY ("perfilMentorId") REFERENCES "PerfilMentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudMentoria" ADD CONSTRAINT "SolicitudMentoria_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "ServicioMentoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SolicitudMentoria" ADD CONSTRAINT "SolicitudMentoria_transaccionId_fkey" FOREIGN KEY ("transaccionId") REFERENCES "Transaccion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResenasMentoria" ADD CONSTRAINT "ResenasMentoria_solicitudId_fkey" FOREIGN KEY ("solicitudId") REFERENCES "SolicitudMentoria"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResenasMentoria" ADD CONSTRAINT "ResenasMentoria_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ResenasMentoria" ADD CONSTRAINT "ResenasMentoria_perfilMentorId_fkey" FOREIGN KEY ("perfilMentorId") REFERENCES "PerfilMentor"("id") ON DELETE CASCADE ON UPDATE CASCADE;
