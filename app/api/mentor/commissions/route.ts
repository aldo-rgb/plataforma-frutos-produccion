import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/mentor/commissions
 * 
 * Obtiene las comisiones del mentor logueado
 * Query params:
 * - status: PENDING | PAID | ALL
 * - type: MENTORSHIP_SESSION | DISCIPLINE_CALL | ALL
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');

    const mentorId = session.user.id;

    // Construir filtros
    const where: any = {
      mentorId: mentorId
    };

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (type && type !== 'ALL') {
      where.sourceType = type;
    }

    // Obtener entradas del ledger del mentor
    const entries = await prisma.commissionLedger.findMany({
      where,
      orderBy: {
        completedAt: 'desc'
      },
      take: 200 // Límite de 200 entradas
    });

    // Calcular resumen
    const allEntries = await prisma.commissionLedger.findMany({
      where: { mentorId: mentorId }
    });

    const summary = {
      totalEarned: allEntries.reduce((sum: number, e: any) => sum + Number(e.payableAmount), 0),
      pendingAmount: allEntries
        .filter((e: any) => e.status === 'PENDING')
        .reduce((sum: number, e: any) => sum + Number(e.payableAmount), 0),
      paidAmount: allEntries
        .filter((e: any) => e.status === 'PAID')
        .reduce((sum: number, e: any) => sum + Number(e.payableAmount), 0),
      totalSessions: allEntries.length,
      mentorshipCount: allEntries.filter((e: any) => e.sourceType === 'MENTORSHIP_SESSION').length,
      disciplineCount: allEntries.filter((e: any) => e.sourceType === 'DISCIPLINE_CALL').length,
      packageCount: allEntries.filter((e: any) => e.sourceType === 'PACKAGE_SESSION').length
    };

    // Formatear respuesta
    const formattedEntries = entries.map((entry: any) => ({
      id: entry.id,
      sourceType: entry.sourceType,
      studentName: entry.studentName,
      totalAmount: Number(entry.totalAmount),
      platformFee: Number(entry.platformFee),
      payableAmount: Number(entry.payableAmount),
      status: entry.status,
      serviceName: entry.serviceName,
      scheduledAt: entry.scheduledAt.toISOString(),
      completedAt: entry.completedAt.toISOString(),
      paidAt: entry.paidAt?.toISOString(),
      payoutBatchId: entry.payoutBatchId
    }));

    return NextResponse.json({
      success: true,
      entries: formattedEntries,
      summary
    });

  } catch (error: any) {
    logger.error('❌ Error fetching mentor commissions:', error);
    return NextResponse.json(
      { error: 'Error al obtener comisiones', details: error.message },
      { status: 500 }
    );
  }
}
