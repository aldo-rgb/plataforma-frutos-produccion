import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Generar resumen semanal de nómina
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Solo admin/director pueden generar reportes' }, { status: 403 });
    }

    const body = await request.json();
    const { weekStartDate, weekEndDate, organizationId, visionId } = body;

    if (!weekStartDate || !weekEndDate || !organizationId) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: weekStartDate, weekEndDate, organizationId' 
      }, { status: 400 });
    }

    const startDate = new Date(weekStartDate);
    const endDate = new Date(weekEndDate);

    // Calcular fecha de pago (miércoles siguiente)
    const payoutDate = new Date(endDate);
    payoutDate.setDate(payoutDate.getDate() + (3 - payoutDate.getDay() + 7) % 7);

    // Obtener comisiones autorizadas del periodo
    const where: any = {
      organizationId: parseInt(organizationId),
      status: 'AUTHORIZED',
      createdAt: {
        gte: startDate,
        lte: endDate
      }
    };

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    const commissions = await prisma.coordinatorCommission.findMany({
      where,
      include: {
        Coordinator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    if (commissions.length === 0) {
      return NextResponse.json({ 
        error: 'No hay comisiones autorizadas en este periodo' 
      }, { status: 404 });
    }

    // Agrupar por coordinador
    const coordinatorSummary = commissions.reduce((acc: any, comm) => {
      const coordId = comm.coordinatorId;
      if (!acc[coordId]) {
        acc[coordId] = {
          coordinator: comm.Coordinator,
          commissions: [],
          totalAmount: 0,
          byEvent: {} as Record<string, { count: number, amount: number }>
        };
      }

      acc[coordId].commissions.push(comm);
      acc[coordId].totalAmount += parseFloat(comm.amount.toString());

      if (!acc[coordId].byEvent[comm.triggerEvent]) {
        acc[coordId].byEvent[comm.triggerEvent] = { count: 0, amount: 0 };
      }
      acc[coordId].byEvent[comm.triggerEvent].count++;
      acc[coordId].byEvent[comm.triggerEvent].amount += parseFloat(comm.amount.toString());

      return acc;
    }, {});

    const coordinatorsArray = Object.values(coordinatorSummary);

    const summaryData = {
      period: {
        start: weekStartDate,
        end: weekEndDate
      },
      coordinators: coordinatorsArray.map((c: any) => ({
        coordinator: c.coordinator,
        totalAmount: c.totalAmount,
        totalCommissions: c.commissions.length,
        breakdown: c.byEvent
      })),
      totalAmount: coordinatorsArray.reduce((sum: number, c: any) => sum + c.totalAmount, 0),
      totalCommissions: commissions.length,
      coordinatorsCount: coordinatorsArray.length
    };

    // Crear resumen
    const summary = await prisma.weeklyPayoutSummary.create({
      data: {
        weekStartDate: startDate,
        weekEndDate: endDate,
        payoutDate,
        organizationId: parseInt(organizationId),
        visionId: visionId ? parseInt(visionId) : null,
        totalAmount: summaryData.totalAmount,
        totalCommissions: summaryData.totalCommissions,
        coordinatorsCount: summaryData.coordinatorsCount,
        status: 'DRAFT',
        generatedBy: user.id,
        summaryData,
        updatedAt: new Date()
      },
      include: {
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Resumen semanal generado exitosamente',
      summary,
      details: summaryData
    });

  } catch (error: any) {
    logger.error('Error generando resumen semanal:', error);
    return NextResponse.json(
      { error: 'Error al generar resumen', details: error.message },
      { status: 500 }
    );
  }
}

// GET - Listar resumenes semanales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user || (user.rol !== 'admin' && user.rol !== 'director')) {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const organizationId = searchParams.get('organizationId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '20';

    const where: any = {};

    if (organizationId) {
      where.organizationId = parseInt(organizationId);
    }

    if (status) {
      where.status = status;
    }

    const summaries = await prisma.weeklyPayoutSummary.findMany({
      where,
      take: parseInt(limit),
      orderBy: {
        weekStartDate: 'desc'
      },
      include: {
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        GeneratedByUser: {
          select: {
            id: true,
            nombre: true
          }
        },
        ApprovedByUser: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      summaries
    });

  } catch (error: any) {
    logger.error('Error obteniendo resumenes:', error);
    return NextResponse.json(
      { error: 'Error al obtener resumenes', details: error.message },
      { status: 500 }
    );
  }
}
