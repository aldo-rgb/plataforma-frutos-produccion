-- Tabla para instancias de tareas diarias (El "HOY" de Things)
CREATE TABLE "TaskInstance" (
    "id" SERIAL PRIMARY KEY,
    "accionId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "postponeCount" INTEGER DEFAULT 0,
    "completedAt" TIMESTAMP,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    "updatedAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "TaskInstance_accionId_fkey" FOREIGN KEY ("accionId") REFERENCES "Accion"("id") ON DELETE CASCADE,
    CONSTRAINT "TaskInstance_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE
);

-- Índices para búsquedas rápidas
CREATE INDEX "TaskInstance_usuarioId_dueDate_idx" ON "TaskInstance"("usuarioId", "dueDate");
CREATE INDEX "TaskInstance_status_idx" ON "TaskInstance"("status");
CREATE INDEX "TaskInstance_accionId_idx" ON "TaskInstance"("accionId");

-- Tabla para notificaciones al mentor
CREATE TABLE "MentorAlert" (
    "id" SERIAL PRIMARY KEY,
    "mentorId" INTEGER NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "taskInstanceId" INTEGER,
    "type" VARCHAR(30) DEFAULT 'RISK_ALERT',
    "message" TEXT NOT NULL,
    "read" BOOLEAN DEFAULT FALSE,
    "createdAt" TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "MentorAlert_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
    CONSTRAINT "MentorAlert_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE,
    CONSTRAINT "MentorAlert_taskInstanceId_fkey" FOREIGN KEY ("taskInstanceId") REFERENCES "TaskInstance"("id") ON DELETE SET NULL
);

CREATE INDEX "MentorAlert_mentorId_read_idx" ON "MentorAlert"("mentorId", "read");
