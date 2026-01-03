-- CreateEnum
CREATE TYPE "CommissionSource" AS ENUM ('MENTORSHIP_SESSION', 'DISCIPLINE_CALL', 'PACKAGE_SESSION');
CREATE TYPE "CommissionStatus" AS ENUM ('PENDING', 'PAID', 'CANCELLED', 'DISPUTED', 'REFUNDED');

-- CreateTable
CREATE TABLE "CommissionLedger" (
    "id" TEXT NOT NULL,
    "mentorId" INTEGER NOT NULL,
    "sourceType" "CommissionSource" NOT NULL,
    "sourceId" INTEGER NOT NULL,
    "studentId" INTEGER NOT NULL,
    "studentName" TEXT NOT NULL,
    "totalAmount" DECIMAL(10,2) NOT NULL,
    "platformFee" DECIMAL(10,2) NOT NULL,
    "platformPercent" INTEGER NOT NULL,
    "payableAmount" DECIMAL(10,2) NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "status" "CommissionStatus" NOT NULL DEFAULT 'PENDING',
    "serviceName" TEXT,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "paidAt" TIMESTAMP(3),
    "payoutBatchId" TEXT,
    "paymentMethod" TEXT,
    "paymentReference" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionLedger_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "CommissionLedger_mentorId_idx" ON "CommissionLedger"("mentorId");
CREATE INDEX "CommissionLedger_studentId_idx" ON "CommissionLedger"("studentId");
CREATE INDEX "CommissionLedger_sourceType_idx" ON "CommissionLedger"("sourceType");
CREATE INDEX "CommissionLedger_sourceId_idx" ON "CommissionLedger"("sourceId");
CREATE INDEX "CommissionLedger_status_idx" ON "CommissionLedger"("status");
CREATE INDEX "CommissionLedger_completedAt_idx" ON "CommissionLedger"("completedAt");
CREATE INDEX "CommissionLedger_paidAt_idx" ON "CommissionLedger"("paidAt");
CREATE INDEX "CommissionLedger_payoutBatchId_idx" ON "CommissionLedger"("payoutBatchId");

-- AddForeignKey
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_mentorId_fkey" FOREIGN KEY ("mentorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CommissionLedger" ADD CONSTRAINT "CommissionLedger_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
