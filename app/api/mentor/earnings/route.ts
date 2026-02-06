import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * 💰 Mentor Earnings Overview
 * GET /api/mentor/earnings
 * 
 * Permite al mentor ver sus pagos y ganancias
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true },
    });

    if (!user || user.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');

    // Obtener payouts del mentor
    const payouts = await prisma.mentorPayout.findMany({
      where: {
        mentorId: user.id,
        ...(status && { status: status as any }),
      },
      include: {
        VisionEscrow: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
                fechaInicio: true,
                fechaFin: true,
              }
            }
          }
        },
        _count: {
          select: { PayableCall: true }
        }
      },
      orderBy: {
        generatedAt: 'desc'
      }
    });

    // Stats del mentor
    const stats = await prisma.mentorPayout.aggregate({
      where: { mentorId: user.id },
      _sum: { totalAmount: true, callsCompleted: true },
      _count: true,
    });

    const paidStats = await prisma.mentorPayout.aggregate({
      where: { mentorId: user.id, status: 'PAID' },
      _sum: { totalAmount: true },
    });

    const pendingStats = await prisma.mentorPayout.aggregate({
      where: { mentorId: user.id, status: { in: ['PENDING', 'GENERATED'] } },
      _sum: { totalAmount: true },
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalEarnings: Number(paidStats._sum.totalAmount || 0),
        pendingEarnings: Number(pendingStats._sum.totalAmount || 0),
        totalCalls: stats._sum.callsCompleted || 0,
        totalPayouts: stats._count,
      },
      payouts: payouts.map(p => ({
        id: p.id,
        visionId: p.visionId,
        visionNombre: p.VisionEscrow.Vision.nombre,
        weekNumber: p.weekNumber,
        callsCompleted: p.callsCompleted,
        ratePerCall: Number(p.ratePerCall),
        totalAmount: Number(p.totalAmount),
        status: p.status,
        generatedAt: p.generatedAt,
        paidAt: p.paidAt,
        paymentMethod: p.paymentMethod,
      }))
    });

  } catch (error) {
    logger.error('❌ Error obteniendo earnings:', error);
    return NextResponse.json(
      { error: 'Error al obtener ganancias' },
      { status: 500 }
    );
  }
}
