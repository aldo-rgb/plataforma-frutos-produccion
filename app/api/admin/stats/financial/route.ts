import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';
import logger from '@/lib/logger';

const prisma = new PrismaClient();

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || (user.rol !== 'ADMIN' && user.rol !== 'ADMINISTRADOR')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // ============================================
    // 1. VENTAS BRUTAS TOTALES (Gross Revenue)
    // ============================================
    const licenseOrders = await prisma.licenseOrder.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _sum: {
        amount: true
      }
    });

    const mentorPackageOrders = await prisma.mentorPackageOrder.aggregate({
      where: {
        status: 'COMPLETED'
      },
      _sum: {
        precioTotal: true
      }
    });

    const grossRevenue = 
      (licenseOrders._sum.amount || 0) + 
      (mentorPackageOrders._sum.precioTotal || 0);

    // ============================================
    // 2. EN CUSTODIA (Escrow)
    // ============================================
    const escrowData = await prisma.schoolCredit.aggregate({
      where: {
        isActive: true
      },
      _sum: {
        totalPurchased: true,
        totalAllocated: true
      }
    });

    const escrowAmount = 
      ((escrowData._sum.totalPurchased || 0) - (escrowData._sum.totalAllocated || 0)) * 90;

    // ============================================
    // 3. COMISIONES POR PAGAR
    // ============================================
    // Llamadas completadas que aún no han sido pagadas
    const unpaidCalls = await prisma.callBooking.count({
      where: {
        status: 'COMPLETED'
        // TODO: Filtrar las que NO estén en un MentorPayrollItem con status PAID
      }
    });

    const commissionsToPay = unpaidCalls * 90; // $90 por llamada

    // ============================================
    // 4. REVENUE NETO (Gross - Comisiones)
    // ============================================
    const paidCommissions = await prisma.mentorPayrollItem.aggregate({
      where: {
        status: 'PAID'
      },
      _sum: {
        totalAmount: true
      }
    });

    const netRevenue = grossRevenue - (paidCommissions._sum.totalAmount || 0);

    // ============================================
    // 5. GRÁFICO MENSUAL (Últimos 30 días)
    // ============================================
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const dailyRevenue = await prisma.licenseOrder.groupBy({
      by: ['paidAt'],
      where: {
        status: 'COMPLETED',
        paidAt: {
          gte: thirtyDaysAgo
        }
      },
      _sum: {
        amount: true
      }
    });

    const dailyPayouts = await prisma.mentorPayrollItem.groupBy({
      by: ['paidAt'],
      where: {
        status: 'PAID',
        paidAt: {
          gte: thirtyDaysAgo,
          not: null
        }
      },
      _sum: {
        totalAmount: true
      }
    });

    // Formatear datos del gráfico
    const chartData = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const revenue = dailyRevenue
        .filter(d => d.paidAt && d.paidAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum, d) => sum + (d._sum.amount || 0), 0);

      const payouts = dailyPayouts
        .filter(d => d.paidAt && d.paidAt.toISOString().split('T')[0] === dateStr)
        .reduce((sum, d) => sum + (d._sum.totalAmount || 0), 0);

      chartData.push({
        date: dateStr,
        revenue,
        payouts
      });
    }

    // ============================================
    // 6. ESTADÍSTICAS ADICIONALES
    // ============================================
    const totalMentors = await prisma.usuario.count({
      where: { rol: 'MENTOR' }
    });

    const activeMentors = await prisma.perfilMentor.count({
      where: { 
        disponible: true,
        acceptingNewClients: true
      }
    });

    const totalOrganizations = await prisma.organization.count({
      where: { status: 'ACTIVE' }
    });

    const activeVisions = await prisma.vision.count({
      where: { isActive: true }
    });

    return NextResponse.json({
      success: true,
      kpis: {
        grossRevenue: parseFloat(grossRevenue.toFixed(2)),
        netRevenue: parseFloat(netRevenue.toFixed(2)),
        escrowAmount: parseFloat(escrowAmount.toFixed(2)),
        commissionsToPay: parseFloat(commissionsToPay.toFixed(2))
      },
      chartData,
      stats: {
        totalMentors,
        activeMentors,
        totalOrganizations,
        activeVisions
      }
    });

  } catch (error) {
    logger.error('Error fetching financial stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas financieras' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
