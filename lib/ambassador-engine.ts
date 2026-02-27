/**
 * QUANTUM AMBASSADORS - Motor de Comisiones por Referidos
 * 
 * Lógica: Cuando un usuario paga usando un referral_code, el dueño del código
 * (si es graduado y NO está en PL activo) recibe una comisión porcentual.
 * 
 * Porcentajes:
 * - Básico: 20%
 * - Combo (Jornada Completa): 20%
 * - Avanzado: 10%
 * - PL: 10%
 */

import prisma from '@/lib/prisma';
import { Decimal } from '@prisma/client/runtime/library';

// Diccionario de comisiones por tipo de producto
export const AMBASSADOR_COMMISSION_RATES: Record<string, number> = {
  BASIC: 0.20,      // 20%
  COMBO: 0.20,      // 20% (Jornada Completa)
  ADVANCED: 0.10,   // 10%
  PL: 0.10          // 10%
};

export const PRODUCT_TYPE_LABELS: Record<string, string> = {
  BASIC: 'Básico',
  COMBO: 'Jornada Completa',
  ADVANCED: 'Avanzado',
  PL: 'Proyecto de Liderazgo'
};

interface AmbassadorCommissionResult {
  success: boolean;
  commissionId?: number;
  ambassadorId?: number;
  commissionAmount?: number;
  message: string;
}

/**
 * Verifica si un usuario está actualmente en PL activo
 */
export async function isUserInActivePL(userId: number): Promise<boolean> {
  const activePLEnrollment = await prisma.vision_enrollments.findFirst({
    where: {
      userId,
      level: 'PL',
      enrollmentStatus: 'ENROLLED',
      // Verificar que la visión esté activa y en fechas de PL
      Vision: {
        isActive: true,
        plWeekend1StartDate: { lte: new Date() },
        plWeekend3EndDate: { gte: new Date() }
      }
    }
  });
  
  return !!activePLEnrollment;
}

/**
 * Busca al dueño de un referral code y verifica si es elegible para comisión
 */
export async function findEligibleAmbassador(referralCode: string): Promise<{
  eligible: boolean;
  ambassadorId?: number;
  ambassadorName?: string;
  reason?: string;
}> {
  if (!referralCode) {
    return { eligible: false, reason: 'No se proporcionó código de referido' };
  }

  // Buscar al dueño del código
  const ambassador = await prisma.usuario.findFirst({
    where: { referralCode: referralCode.toUpperCase() },
    select: { 
      id: true, 
      nombre: true, 
      isGraduated: true,
      isActive: true
    }
  });

  if (!ambassador) {
    return { eligible: false, reason: 'Código de referido no encontrado' };
  }

  // Verificar si es graduado
  if (!ambassador.isGraduated) {
    return { 
      eligible: false, 
      ambassadorId: ambassador.id,
      reason: 'El usuario no es graduado' 
    };
  }

  // Verificar si está en PL activo (si sí está, no es elegible - el coordinador cobra)
  const inActivePL = await isUserInActivePL(ambassador.id);
  if (inActivePL) {
    return { 
      eligible: false, 
      ambassadorId: ambassador.id,
      reason: 'Usuario está en PL activo - comisión va al coordinador' 
    };
  }

  return {
    eligible: true,
    ambassadorId: ambassador.id,
    ambassadorName: ambassador.nombre
  };
}

/**
 * Determina el tipo de producto basado en el ticket/nivel
 */
export function determineProductType(
  level: string,
  isCombo: boolean = false
): 'BASIC' | 'COMBO' | 'ADVANCED' | 'PL' {
  if (isCombo) return 'COMBO';
  
  switch (level?.toUpperCase()) {
    case 'BASIC':
      return 'BASIC';
    case 'ADVANCED':
      return 'ADVANCED';
    case 'PL':
      return 'PL';
    default:
      return 'BASIC';
  }
}

/**
 * Calcula y registra la comisión del embajador
 */
export async function processAmbassadorCommission(params: {
  referralCode: string;
  referredUserId: number;
  ticketId?: string;
  productType: 'BASIC' | 'COMBO' | 'ADVANCED' | 'PL';
  saleAmount: number; // Monto real pagado (después de descuentos)
  organizationId: number;
  visionId?: number;
}): Promise<AmbassadorCommissionResult> {
  const { referralCode, referredUserId, ticketId, productType, saleAmount, organizationId, visionId } = params;

  try {
    // 1. Verificar elegibilidad del embajador
    const eligibility = await findEligibleAmbassador(referralCode);
    
    if (!eligibility.eligible || !eligibility.ambassadorId) {
      return {
        success: false,
        message: eligibility.reason || 'Embajador no elegible'
      };
    }

    // 2. Verificar que no sea auto-referido
    if (eligibility.ambassadorId === referredUserId) {
      return {
        success: false,
        message: 'No se permiten auto-referidos'
      };
    }

    // 3. Verificar que no exista ya una comisión por este ticket
    if (ticketId) {
      const existingCommission = await prisma.ambassador_wallet_transactions.findFirst({
        where: { ticketId }
      });
      
      if (existingCommission) {
        return {
          success: false,
          message: 'Ya existe una comisión para este ticket'
        };
      }
    }

    // 4. Calcular comisión
    const commissionRate = AMBASSADOR_COMMISSION_RATES[productType];
    const commissionAmount = saleAmount * commissionRate;

    // 5. Crear transacción de comisión
    const transaction = await prisma.ambassador_wallet_transactions.create({
      data: {
        ambassadorId: eligibility.ambassadorId,
        referredUserId,
        ticketId,
        productType,
        saleAmount: new Decimal(saleAmount),
        commissionPercent: new Decimal(commissionRate),
        commissionAmount: new Decimal(commissionAmount),
        status: 'CLEARED', // Directo a disponible porque el pago ya está confirmado
        organizationId,
        visionId
      }
    });

    // 6. Actualizar balance del embajador
    await prisma.usuario.update({
      where: { id: eligibility.ambassadorId },
      data: {
        ambassadorBalance: {
          increment: commissionAmount
        }
      }
    });

    return {
      success: true,
      commissionId: transaction.id,
      ambassadorId: eligibility.ambassadorId,
      commissionAmount,
      message: `Comisión de $${commissionAmount.toFixed(2)} (${commissionRate * 100}%) registrada para ${eligibility.ambassadorName}`
    };

  } catch (error) {
    console.error('Error procesando comisión de embajador:', error);
    return {
      success: false,
      message: 'Error interno al procesar comisión'
    };
  }
}

/**
 * Obtiene el resumen del wallet de un embajador
 */
export async function getAmbassadorWalletSummary(ambassadorId: number) {
  const [user, transactions, stats] = await Promise.all([
    // Usuario con balance
    prisma.usuario.findUnique({
      where: { id: ambassadorId },
      select: {
        id: true,
        nombre: true,
        referralCode: true,
        ambassadorBalance: true,
        isGraduated: true,
        bankClabe: true,
        bankName: true,
        bankAccountHolder: true
      }
    }),
    
    // Últimas transacciones
    prisma.ambassador_wallet_transactions.findMany({
      where: { ambassadorId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        referredUser: {
          select: { nombre: true }
        }
      }
    }),
    
    // Estadísticas
    prisma.ambassador_wallet_transactions.groupBy({
      by: ['status'],
      where: { ambassadorId },
      _sum: { commissionAmount: true },
      _count: { id: true }
    })
  ]);

  if (!user) {
    return null;
  }

  // Procesar stats
  const statsMap = {
    available: 0,
    withdrawn: 0,
    spent: 0,
    totalEarned: 0,
    totalReferrals: 0
  };

  for (const stat of stats) {
    const amount = Number(stat._sum.commissionAmount) || 0;
    statsMap.totalEarned += amount;
    statsMap.totalReferrals += stat._count.id;
    
    if (stat.status === 'CLEARED') {
      statsMap.available = amount;
    } else if (stat.status === 'WITHDRAWN') {
      statsMap.withdrawn = amount;
    } else if (stat.status === 'SPENT') {
      statsMap.spent = amount;
    }
  }

  return {
    user: {
      id: user.id,
      nombre: user.nombre,
      referralCode: user.referralCode,
      balance: Number(user.ambassadorBalance),
      isGraduated: user.isGraduated,
      hasBankInfo: !!(user.bankClabe && user.bankAccountHolder)
    },
    stats: statsMap,
    transactions: transactions.map(t => ({
      id: t.id,
      referredName: t.referredUser?.nombre || 'Usuario',
      productType: t.productType,
      productLabel: PRODUCT_TYPE_LABELS[t.productType],
      saleAmount: Number(t.saleAmount),
      commissionPercent: Number(t.commissionPercent) * 100,
      commissionAmount: Number(t.commissionAmount),
      status: t.status,
      createdAt: t.createdAt
    }))
  };
}

/**
 * Solicita retiro de fondos
 */
export async function requestWithdrawal(params: {
  ambassadorId: number;
  amount: number;
  bankClabe: string;
  bankName?: string;
  accountHolder?: string;
}): Promise<{ success: boolean; message: string; requestId?: number }> {
  const { ambassadorId, amount, bankClabe, bankName, accountHolder } = params;

  try {
    // Verificar balance disponible
    const user = await prisma.usuario.findUnique({
      where: { id: ambassadorId },
      select: { ambassadorBalance: true, nombre: true }
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const balance = Number(user.ambassadorBalance);
    if (amount > balance) {
      return { success: false, message: `Saldo insuficiente. Disponible: $${balance.toFixed(2)}` };
    }

    if (amount < 100) {
      return { success: false, message: 'El monto mínimo de retiro es $100' };
    }

    // Crear solicitud de retiro
    const request = await prisma.ambassador_withdrawal_requests.create({
      data: {
        ambassadorId,
        amount: new Decimal(amount),
        bankClabe,
        bankName,
        accountHolder,
        status: 'PENDING'
      }
    });

    // Actualizar datos bancarios del usuario si no los tiene
    await prisma.usuario.update({
      where: { id: ambassadorId },
      data: {
        bankClabe: bankClabe,
        bankName: bankName || undefined,
        bankAccountHolder: accountHolder || undefined
      }
    });

    return {
      success: true,
      message: 'Solicitud de retiro creada. Un administrador la revisará pronto.',
      requestId: request.id
    };

  } catch (error) {
    console.error('Error al solicitar retiro:', error);
    return { success: false, message: 'Error al procesar solicitud' };
  }
}

/**
 * Usa saldo como crédito interno (para compras en la plataforma)
 */
export async function useBalanceAsCredit(params: {
  ambassadorId: number;
  amount: number;
  description: string;
}): Promise<{ success: boolean; message: string }> {
  const { ambassadorId, amount, description } = params;

  try {
    const user = await prisma.usuario.findUnique({
      where: { id: ambassadorId },
      select: { ambassadorBalance: true }
    });

    if (!user) {
      return { success: false, message: 'Usuario no encontrado' };
    }

    const balance = Number(user.ambassadorBalance);
    if (amount > balance) {
      return { success: false, message: 'Saldo insuficiente' };
    }

    // Actualizar las transacciones CLEARED a SPENT por el monto usado
    // (simplificado - en producción sería más detallado)
    await prisma.usuario.update({
      where: { id: ambassadorId },
      data: {
        ambassadorBalance: {
          decrement: amount
        }
      }
    });

    return {
      success: true,
      message: `$${amount.toFixed(2)} aplicados como crédito: ${description}`
    };

  } catch (error) {
    console.error('Error al usar crédito:', error);
    return { success: false, message: 'Error al procesar' };
  }
}
