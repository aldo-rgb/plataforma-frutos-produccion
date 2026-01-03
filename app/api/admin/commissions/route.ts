import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/commissions
 * 
 * Obtiene el ledger de comisiones con filtros
 * Query params:
 * - status: PENDING | PAID | ALL
 * - mentorId: number
 * - sourceType: MENTORSHIP_SESSION | DISCIPLINE_CALL | ALL
 * - from: date
 * - to: date
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const mentorId = searchParams.get('mentorId');
    const sourceType = searchParams.get('sourceType');
    const from = searchParams.get('from');
    const to = searchParams.get('to');

    // Construir filtros
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (mentorId) {
      where.mentorId = Number(mentorId);
    }

    if (sourceType && sourceType !== 'ALL') {
      where.sourceType = sourceType;
    }

    if (from || to) {
      where.completedAt = {};
      if (from) where.completedAt.gte = new Date(from);
      if (to) where.completedAt.lte = new Date(to);
    }

    // Obtener entradas del ledger
    const entries = await prisma.commissionLedger.findMany({
      where,
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            profileImage: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 500 // Límite de 500 entradas por query
    });

    // Calcular resumen
    const summary = entries.reduce((acc, entry) => {
      return {
        totalSales: acc.totalSales + Number(entry.totalAmount),
        platformRevenue: acc.platformRevenue + Number(entry.platformFee),
        mentorPayable: acc.mentorPayable + Number(entry.payableAmount),
        entriesCount: acc.entriesCount + 1
      };
    }, {
      totalSales: 0,
      platformRevenue: 0,
      mentorPayable: 0,
      entriesCount: 0
    });

    // Formatear respuesta
    const formattedEntries = entries.map(entry => ({
      id: entry.id,
      mentorId: entry.mentorId,
      mentorName: entry.Mentor.nombre,
      mentorImage: entry.Mentor.profileImage,
      sourceType: entry.sourceType,
      sourceId: entry.sourceId,
      studentName: entry.studentName,
      totalAmount: Number(entry.totalAmount),
      platformFee: Number(entry.platformFee),
      platformPercent: entry.platformPercent,
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
    console.error('❌ Error fetching commissions:', error);
    return NextResponse.json(
      { error: 'Error al obtener comisiones', details: error.message },
      { status: 500 }
    );
  }
}
