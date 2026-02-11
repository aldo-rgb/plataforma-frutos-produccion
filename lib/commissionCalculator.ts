import { prisma } from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';
import { randomUUID } from 'crypto';

/**
 * 💰 COMMISSION CALCULATOR SERVICE
 * 
 * Sistema de cálculo de comisiones para mentores.
 * Registra cada transacción en el Commission Ledger de forma inmutable.
 */

interface CommissionCalculation {
  totalAmount: number;
  platformFee: number;
  platformPercent: number;
  payableAmount: number;
}

interface CreateLedgerEntryParams {
  mentorId: number;
  sourceType: 'MENTORSHIP_SESSION' | 'DISCIPLINE_CALL' | 'PACKAGE_SESSION';
  sourceId: number;
  studentId: number;
  studentName: string;
  totalAmount: number;
  platformPercent: number;
  serviceName?: string;
  scheduledAt: Date;
  completedAt?: Date;
}

/**
 * Calcula el reparto de comisiones según el porcentaje del mentor
 */
export function calculateCommission(
  totalAmount: number, 
  platformPercent: number
): CommissionCalculation {
  const platformFee = (totalAmount * platformPercent) / 100;
  const payableAmount = totalAmount - platformFee;

  return {
    totalAmount,
    platformFee: Math.round(platformFee * 100) / 100, // 2 decimales
    platformPercent,
    payableAmount: Math.round(payableAmount * 100) / 100
  };
}

/**
 * Crea una entrada en el Commission Ledger
 * Esta función congela el precio y la comisión en el momento del servicio
 */
export async function createLedgerEntry(params: CreateLedgerEntryParams) {
  const {
    mentorId,
    sourceType,
    sourceId,
    studentId,
    studentName,
    totalAmount,
    platformPercent,
    serviceName,
    scheduledAt,
    completedAt
  } = params;

  // Calcular comisiones
  const commission = calculateCommission(totalAmount, platformPercent);

  // Crear registro inmutable
  const ledgerEntry = await prisma.commissionLedger.create({
    data: {
      id: randomUUID(),
      mentorId,
      sourceType,
      sourceId,
      studentId,
      studentName,
      totalAmount: new Decimal(commission.totalAmount),
      platformFee: new Decimal(commission.platformFee),
      platformPercent: commission.platformPercent,
      payableAmount: new Decimal(commission.payableAmount),
      currency: 'MXN',
      status: 'PENDING',
      serviceName: serviceName || `${sourceType} - ${studentName}`,
      scheduledAt,
      completedAt: completedAt || new Date(),
      updatedAt: new Date(),
    }
  });

  console.log(`💰 Commission Ledger Entry Created:`, {
    id: ledgerEntry.id,
    mentor: mentorId,
    amount: commission.payableAmount,
    platform: commission.platformFee
  });

  return ledgerEntry;
}

/**
 * Obtiene el porcentaje de comisión de un mentor
 * Si no tiene configurado, usa 30% por defecto
 */
export async function getMentorCommissionRate(mentorId: number): Promise<number> {
  const perfilMentor = await prisma.perfilMentor.findUnique({
    where: { usuarioId: mentorId },
    select: { comisionPlataforma: true }
  });

  return perfilMentor?.comisionPlataforma || 30; // Default 30%
}

/**
 * TRIGGER: Al completar una sesión de mentoría
 * Se llama desde /api/mentor/complete-session
 * 
 * ✅ REGISTRA comisión por cada sesión completada, incluyendo las de paquetes
 * El mentor gana $90 por cada sesión que completa (no por adelantado)
 */
export async function onMentorshipSessionCompleted(
  bookingId: number,
  mentorId: number,
  studentId: number,
  amount: number,
  scheduledAt: Date
) {
  // 📦 VERIFICAR SI ES SESIÓN DE PAQUETE
  const booking = await prisma.callBooking.findUnique({
    where: { id: bookingId },
    select: { packageOrderId: true, PackageOrder: { select: { precioTotal: true, cantidad: true } } }
  });

  // Si es sesión de paquete, calcular el pago por sesión ($90 por sesión)
  if (booking?.packageOrderId && booking.PackageOrder) {
    const paymentPerSession = booking.PackageOrder.precioTotal / booking.PackageOrder.cantidad;
    console.log(`✅ Sesión ${bookingId} de paquete ${booking.packageOrderId}. Registrando comisión: $${paymentPerSession}`);
    amount = paymentPerSession; // $1620 / 18 = $90 por sesión
  }

  // Obtener datos del estudiante
  const student = await prisma.usuario.findUnique({
    where: { id: studentId },
    select: { nombre: true }
  });

  if (!student) {
    console.error(`❌ Student ${studentId} not found for ledger entry`);
    return null;
  }

  // Obtener comisión del mentor
  const platformPercent = await getMentorCommissionRate(mentorId);

  // Crear entrada en el ledger
  return await createLedgerEntry({
    mentorId,
    sourceType: 'MENTORSHIP_SESSION',
    sourceId: bookingId,
    studentId,
    studentName: student.nombre,
    totalAmount: amount,
    platformPercent,
    serviceName: `Sesión de Mentoría 1:1`,
    scheduledAt,
    completedAt: new Date()
  });
}

/**
 * TRIGGER: Al completar una llamada de disciplina
 * Se llama desde el sistema de llamadas de disciplina
 */
export async function onDisciplineCallCompleted(
  callBookingId: number,
  mentorId: number,
  studentId: number,
  rateApplied: number,
  scheduledAt: Date
) {
  const student = await prisma.usuario.findUnique({
    where: { id: studentId },
    select: { nombre: true }
  });

  if (!student) {
    console.error(`❌ Student ${studentId} not found for ledger entry`);
    return null;
  }

  const platformPercent = await getMentorCommissionRate(mentorId);

  return await createLedgerEntry({
    mentorId,
    sourceType: 'DISCIPLINE_CALL',
    sourceId: callBookingId,
    studentId,
    studentName: student.nombre,
    totalAmount: rateApplied,
    platformPercent,
    serviceName: `Llamada de Disciplina`,
    scheduledAt,
    completedAt: new Date()
  });
}

/**
 * Marca múltiples comisiones como PAGADAS
 * Se usa en el proceso de payout masivo
 */
export async function markCommissionsAsPaid(
  ledgerIds: string[],
  payoutBatchId: string,
  paymentMethod: string,
  paymentReference?: string
) {
  const result = await prisma.commissionLedger.updateMany({
    where: {
      id: { in: ledgerIds },
      status: 'PENDING'
    },
    data: {
      status: 'PAID',
      paidAt: new Date(),
      payoutBatchId,
      paymentMethod,
      paymentReference
    }
  });

  console.log(`💸 Marked ${result.count} commissions as PAID (Batch: ${payoutBatchId})`);
  
  return result;
}

/**
 * Obtiene resumen de comisiones pendientes por mentor
 */
export async function getPendingCommissionsSummary(mentorId?: number) {
  const whereClause = mentorId 
    ? { mentorId, status: 'PENDING' as const }
    : { status: 'PENDING' as const };

  const ledgerEntries = await prisma.commissionLedger.findMany({
    where: whereClause,
    include: {
      Mentor: {
        select: {
          id: true,
          nombre: true,
          email: true,
          profileImage: true
        }
      }
    },
    orderBy: {
      completedAt: 'desc'
    }
  });

  // Calcular totales
  const summary = ledgerEntries.reduce((acc, entry) => {
    const mentorId = entry.mentorId;
    
    if (!acc[mentorId]) {
      acc[mentorId] = {
        mentor: entry.Mentor,
        totalSales: 0,
        platformRevenue: 0,
        mentorPayable: 0,
        entriesCount: 0,
        entries: []
      };
    }

    acc[mentorId].totalSales += Number(entry.totalAmount);
    acc[mentorId].platformRevenue += Number(entry.platformFee);
    acc[mentorId].mentorPayable += Number(entry.payableAmount);
    acc[mentorId].entriesCount += 1;
    acc[mentorId].entries.push(entry);

    return acc;
  }, {} as Record<number, any>);

  return Object.values(summary);
}

/**
 * 📦 TRIGGER: Se ejecuta cuando se completa el pago de un paquete de 18 sesiones
 * 
 * Este método crea una entrada en el Commission Ledger por la VENTA COMPLETA del paquete.
 * Las sesiones individuales NO generan comisiones adicionales, ya están incluidas aquí.
 */
export async function onPackagePurchaseCompleted(
  packageOrderId: string,
  mentorId: number,
  studentId: number,
  studentName: string,
  totalAmount: number,
  sessionQuantity: number,
  purchasedAt: Date
) {
  try {
    // Obtener comisión del mentor
    const platformPercent = await getMentorCommissionRate(mentorId);

    // Crear entrada en el ledger
    const ledgerEntry = await createLedgerEntry({
      mentorId,
      sourceType: 'PACKAGE_SESSION',
      sourceId: parseInt(packageOrderId.replace(/\D/g, '').slice(0, 9)) || 0, // Convertir CUID a número temporal
      studentId,
      studentName,
      totalAmount,
      platformPercent,
      serviceName: `Paquete de ${sessionQuantity} Sesiones - ${studentName}`,
      scheduledAt: purchasedAt,
      completedAt: purchasedAt
    });

    console.log(`📦 Package Commission Registered:`, {
      packageId: packageOrderId,
      mentor: mentorId,
      student: studentName,
      sessions: sessionQuantity,
      total: totalAmount,
      mentorEarns: Number(ledgerEntry.payableAmount),
      platformEarns: Number(ledgerEntry.platformFee)
    });

    return ledgerEntry;
  } catch (error) {
    console.error('❌ Error creating package commission:', error);
    throw error;
  }
}

/**
 * Exporta reporte para pago bancario (CSV)
 */
export async function generatePayoutReport(ledgerIds: string[]) {
  const entries = await prisma.commissionLedger.findMany({
    where: {
      id: { in: ledgerIds },
      status: 'PENDING'
    },
    include: {
      Mentor: {
        select: {
          nombre: true,
          email: true,
          PerfilMentor: {
            select: {
              // Aquí irían campos bancarios si los tuvieras
              // cuentaBancaria, clabe, etc.
            }
          }
        }
      }
    }
  });

  // Generar datos CSV
  const csvData = entries.map(entry => ({
    mentorId: entry.mentorId,
    mentorName: entry.Mentor.nombre,
    mentorEmail: entry.Mentor.email,
    amount: Number(entry.payableAmount).toFixed(2),
    currency: entry.currency,
    reference: `PAYOUT-${entry.id}`,
    concept: entry.serviceName,
    date: entry.completedAt.toISOString().split('T')[0]
  }));

  return csvData;
}
