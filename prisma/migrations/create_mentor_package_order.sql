-- CreateTable
CREATE TABLE "MentorPackageOrder" (
    "id" TEXT NOT NULL,
    "usuarioId" INTEGER NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "visionId" INTEGER NOT NULL,
    "organizationId" INTEGER,
    "cantidad" INTEGER NOT NULL,
    "precioUnitario" INTEGER NOT NULL,
    "precioTotal" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "metodoPago" TEXT NOT NULL,
    "status" "PackageOrderStatus" NOT NULL DEFAULT 'PENDING',
    "externalPaymentId" TEXT,
    "paymentUrl" TEXT,
    "paidAt" TIMESTAMP(3),
    "paymentData" JSONB,
    "sessionScheduled" BOOLEAN NOT NULL DEFAULT false,
    "sessionsScheduledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MentorPackageOrder_pkey" PRIMARY KEY ("id")
);

-- CreateEnum
CREATE TYPE "PackageOrderStatus" AS ENUM ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED');

-- CreateIndex
CREATE INDEX "MentorPackageOrder_usuarioId_idx" ON "MentorPackageOrder"("usuarioId");

-- CreateIndex
CREATE INDEX "MentorPackageOrder_mentorId_idx" ON "MentorPackageOrder"("mentorId");

-- CreateIndex
CREATE INDEX "MentorPackageOrder_visionId_idx" ON "MentorPackageOrder"("visionId");

-- CreateIndex
CREATE INDEX "MentorPackageOrder_status_idx" ON "MentorPackageOrder"("status");

-- CreateIndex
CREATE INDEX "MentorPackageOrder_externalPaymentId_idx" ON "MentorPackageOrder"("externalPaymentId");

-- AddForeignKey
ALTER TABLE "MentorPackageOrder" ADD CONSTRAINT "MentorPackageOrder_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPackageOrder" ADD CONSTRAINT "MentorPackageOrder_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPackageOrder" ADD CONSTRAINT "MentorPackageOrder_visionId_fkey" FOREIGN KEY ("visionId") REFERENCES "Vision"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MentorPackageOrder" ADD CONSTRAINT "MentorPackageOrder_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;
