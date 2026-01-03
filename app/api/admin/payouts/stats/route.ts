import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * 📊 Dashboard Stats - Quantum Finance Engine
 * GET /api/admin/payouts/stats
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { rol: true },
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Stats generales
    const [
      totalPayouts,
      pendingPayouts,
      paidPayouts,
      totalPaidAmount,
      totalPendingAmount,
      activeEscrows,
      closedEscrows,
      totalRefunds,
    ] = await Promise.all([
      // Total de payouts
      prisma.mentorPayout.count(),
      
      // Payouts pendientes
      prisma.mentorPayout.count({
        where: { status: { in: ['PENDING', 'GENERATED'] } }
      }),
      
      // Payouts pagados
      prisma.mentorPayout.count({
        where: { status: 'PAID' }
      }),
      
      // Total pagado
      prisma.mentorPayout.aggregate({
        where: { status: 'PAID' },
        _sum: { totalAmount: true }
      }),
      
      // Total pendiente
      prisma.mentorPayout.aggregate({
        where: { status: { in: ['PENDING', 'GENERATED'] } },
        _sum: { totalAmount: true }
      }),
      
      // Escrows activos
      prisma.visionEscrow.count({
        where: { status: 'ACTIVE' }
      }),
      
      // Escrows cerrados
      prisma.visionEscrow.count({
        where: { status: 'CLOSED' }
      }),
      
      // Total de reembolsos
      prisma.visionRefund.aggregate({
        _sum: { amountRefunded: true },
        _count: true,
      }),
    ]);

    // Top 5 mentores por earnings
    const topMentors = await prisma.mentorPayout.groupBy({
      by: ['mentorId'],
      where: { status: 'PAID' },
      _sum: { totalAmount: true },
      _count: true,
      orderBy: {
        _sum: { totalAmount: 'desc' }
      },
      take: 5,
    });

    const topMentorsWithDetails = await Promise.all(
      topMentors.map(async (m) => {
        const mentor = await prisma.usuario.findUnique({
          where: { id: m.mentorId },
          select: { nombre: true, email: true }
        });
        return {
          mentorId: m.mentorId,
          mentorNombre: mentor?.nombre,
          totalEarned: Number(m._sum.totalAmount || 0),
          payoutsCount: m._count,
        };
      })
    );

    // Payouts por semana (últimas 8 semanas)
    const weeklyPayouts = await prisma.mentorPayout.groupBy({
      by: ['weekNumber'],
      _sum: { totalAmount: true },
      _count: true,
      orderBy: { weekNumber: 'desc' },
      take: 8,
    });

    return NextResponse.json({
      success: true,
      stats: {
        payouts: {
          total: totalPayouts,
          pending: pendingPayouts,
          paid: paidPayouts,
        },
        amounts: {
          totalPaid: Number(totalPaidAmount._sum.totalAmount || 0),
          totalPending: Number(totalPendingAmount._sum.totalAmount || 0),
        },
        escrows: {
          active: activeEscrows,
          closed: closedEscrows,
        },
        refunds: {
          count: totalRefunds._count,
          totalAmount: Number(totalRefunds._sum.amountRefunded || 0),
        },
      },
      topMentors: topMentorsWithDetails,
      weeklyPayouts: weeklyPayouts.map(w => ({
        weekNumber: w.weekNumber,
        totalAmount: Number(w._sum.totalAmount || 0),
        payoutsCount: w._count,
      })),
    });

  } catch (error) {
    console.error('❌ Error obteniendo stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
