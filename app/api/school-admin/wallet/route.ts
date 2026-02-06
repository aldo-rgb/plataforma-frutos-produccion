import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * 🏦 TICKET 4: Organization Wallet API
 * GET /api/school-admin/wallet
 * 
 * Retorna el saldo disponible en la billetera de la organización
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Sin organización asociada' }, { status: 400 });
    }

    // Obtener o crear billetera
    let wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!wallet) {
      // Crear billetera si no existe
      wallet = await prisma.organizationWallet.create({
        data: {
          organizationId: user.organizationId,
          balance: 0,
          currency: 'MXN',
        },
      });
    }

    // Obtener últimas transacciones
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { walletId: wallet.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: {
        id: true,
        amount: true,
        type: true,
        source: true,
        description: true,
        createdAt: true,
      },
    });

    return NextResponse.json({
      balance: parseFloat(wallet.balance.toString()),
      currency: wallet.currency,
      availableForUse: parseFloat(wallet.balance.toString()),
      netPayment: 0, // Se calcula en el frontend
      recentTransactions,
      updatedAt: wallet.updatedAt,
    });
  } catch (error) {
    logger.error('❌ Error fetching wallet:', error);
    return NextResponse.json(
      { error: 'Error al obtener información de la billetera' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-admin/wallet/add-funds
 * Agregar fondos manualmente (para admin o ajustes)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { amount, description, source } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto inválido' }, { status: 400 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Sin organización asociada' }, { status: 400 });
    }

    // Obtener billetera
    let wallet = await prisma.organizationWallet.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!wallet) {
      wallet = await prisma.organizationWallet.create({
        data: {
          organizationId: user.organizationId,
          balance: 0,
          currency: 'MXN',
        },
      });
    }

    // Agregar fondos en transacción
    const result = await prisma.$transaction(async (tx) => {
      // Crear transacción
      const transaction = await tx.walletTransaction.create({
        data: {
          walletId: wallet!.id,
          amount: amount,
          type: 'CREDIT',
          source: source || 'ADMIN_ADJUSTMENT',
          description: description || `Fondos agregados manualmente: $${amount} MXN`,
        },
      });

      // Actualizar balance
      const updatedWallet = await tx.organizationWallet.update({
        where: { id: wallet!.id },
        data: {
          balance: {
            increment: amount,
          },
        },
      });

      return { transaction, wallet: updatedWallet };
    });

    return NextResponse.json({
      success: true,
      transaction: result.transaction,
      newBalance: parseFloat(result.wallet.balance.toString()),
    });
  } catch (error) {
    logger.error('❌ Error adding funds:', error);
    return NextResponse.json(
      { error: 'Error al agregar fondos' },
      { status: 500 }
    );
  }
}
