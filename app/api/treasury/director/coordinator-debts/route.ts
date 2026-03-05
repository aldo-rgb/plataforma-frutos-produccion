import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/treasury/director/coordinator-debts
 * Obtiene la deuda pendiente de cada coordinador hacia la escuela
 * Solo para SCHOOL_ADMIN
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo el director puede ver esta información' },
        { status: 403 }
      );
    }

    // Obtener todos los coordinadores de la organización
    const coordinators = await prisma.usuario.findMany({
      where: {
        organizationId: user.organizationId,
        rol: { in: ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN'] },
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        profileImage: true,
      },
    });

    // Para cada coordinador, calcular su deuda
    const coordinatorDebts = await Promise.all(
      coordinators.map(async (coordinator) => {
        // Códigos generados pero no entregados en un corte
        const pendingCodes = await prisma.paymentCode.findMany({
          where: {
            createdById: coordinator.id,
            organizationId: user.organizationId,
            status: 'REDEEMED',
            batchId: null, // No han sido incluidos en ningún corte
          },
          select: {
            amount: true,
            code: true,
            redeemedAt: true,
          },
        });

        // También contar códigos activos (generados pero no canjeados aún)
        const activeCodes = await prisma.paymentCode.findMany({
          where: {
            createdById: coordinator.id,
            organizationId: user.organizationId,
            status: 'ACTIVE',
          },
          select: {
            amount: true,
            code: true,
            createdAt: true,
          },
        });

        // Cortes pendientes de confirmar
        const pendingBatches = await prisma.cashBatch.findMany({
          where: {
            coordinatorId: coordinator.id,
            organizationId: user.organizationId,
            status: { not: 'CONFIRMED' },
          },
          select: {
            id: true,
            netAmount: true,
            totalCollected: true,
            status: true,
            createdAt: true,
          },
        });

        // Cortes confirmados (historial)
        const confirmedBatches = await prisma.cashBatch.count({
          where: {
            coordinatorId: coordinator.id,
            organizationId: user.organizationId,
            status: 'CONFIRMED',
          },
        });

        const pendingCodesTotal = pendingCodes.reduce((sum, c) => sum + Number(c.amount), 0);
        const activeCodesTotal = activeCodes.reduce((sum, c) => sum + Number(c.amount), 0);
        const pendingBatchesTotal = pendingBatches.reduce((sum, b) => sum + Number(b.netAmount), 0);

        return {
          coordinator: {
            id: coordinator.id,
            nombre: coordinator.nombre,
            email: coordinator.email,
            profileImage: coordinator.profileImage,
          },
          debt: {
            // Dinero que ya cobró y debe entregar
            pendingCodesAmount: pendingCodesTotal,
            pendingCodesCount: pendingCodes.length,
            // Códigos activos (aún no canjeados)
            activeCodesAmount: activeCodesTotal,
            activeCodesCount: activeCodes.length,
            // Cortes pendientes de confirmar
            pendingBatchesAmount: pendingBatchesTotal,
            pendingBatchesCount: pendingBatches.length,
            // Total de deuda
            totalDebt: pendingCodesTotal + pendingBatchesTotal,
          },
          stats: {
            confirmedBatchesCount: confirmedBatches,
          },
          pendingBatches: pendingBatches.map((b) => ({
            id: b.id,
            amount: Number(b.netAmount),
            totalCollected: Number(b.totalCollected),
            status: b.status,
            createdAt: b.createdAt,
          })),
        };
      })
    );

    // Filtrar solo coordinadores con deuda o actividad
    const activeCoordinators = coordinatorDebts.filter(
      (c) => c.debt.totalDebt > 0 || c.debt.activeCodesCount > 0 || c.stats.confirmedBatchesCount > 0
    );

    // Calcular totales
    const totalDebt = activeCoordinators.reduce((sum, c) => sum + c.debt.totalDebt, 0);
    const totalPendingCodes = activeCoordinators.reduce((sum, c) => sum + c.debt.pendingCodesCount, 0);
    const totalActiveCodes = activeCoordinators.reduce((sum, c) => sum + c.debt.activeCodesCount, 0);

    return NextResponse.json({
      success: true,
      coordinators: activeCoordinators.sort((a, b) => b.debt.totalDebt - a.debt.totalDebt),
      summary: {
        totalDebt,
        totalPendingCodes,
        totalActiveCodes,
        coordinatorsWithDebt: activeCoordinators.filter((c) => c.debt.totalDebt > 0).length,
      },
    });
  } catch (error) {
    logger.error('Error fetching coordinator debts:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener deudas de coordinadores' },
      { status: 500 }
    );
  }
}
