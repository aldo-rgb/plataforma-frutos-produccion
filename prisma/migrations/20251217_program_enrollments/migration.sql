-- Crear tabla de inscripciones a programas intensivos
CREATE TABLE "ProgramEnrollment" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "totalWeeks" INTEGER NOT NULL DEFAULT 17,
    "missedCallsCount" INTEGER NOT NULL DEFAULT 0,
    "maxMissedAllowed" INTEGER NOT NULL DEFAULT 3,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProgramEnrollment_pkey" PRIMARY KEY ("id")
);

-- Agregar columnas a CallBooking para vincular con programa
ALTER TABLE "CallBooking" ADD COLUMN "programEnrollmentId" INTEGER;
ALTER TABLE "CallBooking" ADD COLUMN "attendanceStatus" TEXT DEFAULT 'PENDING';
ALTER TABLE "CallBooking" ADD COLUMN "weekNumber" INTEGER;

-- Índices para optimizar consultas
CREATE INDEX "ProgramEnrollment_userId_idx" ON "ProgramEnrollment"("userId");
CREATE INDEX "ProgramEnrollment_mentorId_idx" ON "ProgramEnrollment"("mentorId");
CREATE INDEX "ProgramEnrollment_status_idx" ON "ProgramEnrollment"("status");
CREATE INDEX "CallBooking_programEnrollmentId_idx" ON "CallBooking"("programEnrollmentId");
CREATE INDEX "CallBooking_attendanceStatus_idx" ON "CallBooking"("attendanceStatus");

-- Foreign keys
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ProgramEnrollment" ADD CONSTRAINT "ProgramEnrollment_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CallBooking" ADD CONSTRAINT "CallBooking_programEnrollmentId_fkey" FOREIGN KEY ("programEnrollmentId") REFERENCES "ProgramEnrollment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
