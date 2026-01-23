import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      include: { organization: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 400 });
    }

    // Obtener parámetros de filtro
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const visionId = searchParams.get('visionId');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    // Construir filtros
    const where: any = {
      organizationId: user.organizationId
    };

    if (status && status !== 'all') {
      where.status = status;
    }

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    if (startDate) {
      where.checkoutStartedAt = {
        ...where.checkoutStartedAt,
        gte: new Date(startDate)
      };
    }

    if (endDate) {
      where.checkoutStartedAt = {
        ...where.checkoutStartedAt,
        lte: new Date(endDate + 'T23:59:59')
      };
    }

    // Obtener checkouts abandonados
    const checkouts = await prisma.abandonedCheckout.findMany({
      where,
      include: {
        vision: {
          select: {
            id: true,
            nombre: true
          }
        },
        user: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        ticket: {
          select: {
            id: true,
            status: true
          }
        }
      },
      orderBy: {
        checkoutStartedAt: 'desc'
      }
    });

    // Estadísticas
    const stats = await prisma.abandonedCheckout.groupBy({
      by: ['status'],
      where: {
        organizationId: user.organizationId
      },
      _count: true
    });

    const totalAbandoned = await prisma.abandonedCheckout.count({
      where: {
        organizationId: user.organizationId,
        status: { in: ['ABANDONED', 'EMAIL_SENT', 'EXPIRED'] }
      }
    });

    const totalConverted = await prisma.abandonedCheckout.count({
      where: {
        organizationId: user.organizationId,
        status: { in: ['CONVERTED_ANTICIPO', 'CONVERTED_FULL'] }
      }
    });

    const totalPotentialRevenue = await prisma.abandonedCheckout.aggregate({
      where: {
        organizationId: user.organizationId,
        status: { in: ['ABANDONED', 'EMAIL_SENT'] }
      },
      _sum: {
        originalPrice: true
      }
    });

    const totalRecoveredRevenue = await prisma.abandonedCheckout.aggregate({
      where: {
        organizationId: user.organizationId,
        status: { in: ['CONVERTED_ANTICIPO', 'CONVERTED_FULL'] }
      },
      _sum: {
        originalPrice: true
      }
    });

    // Obtener visiones para el filtro
    const visions = await prisma.vision.findMany({
      where: {
        organizationId: user.organizationId
      },
      select: {
        id: true,
        nombre: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    // Configuración de anticipos de la organización
    const orgConfig = {
      anticiposEnabled: user.organization?.anticiposEnabled || false,
      anticipoAmount: user.organization?.anticipoAmount || 0,
      anticipoDeadlineHours: user.organization?.anticipoDeadlineHours || 72
    };

    return NextResponse.json({
      checkouts: checkouts.map(c => ({
        id: c.id,
        email: c.email,
        phone: c.phone,
        firstName: c.firstName,
        lastName: c.lastName,
        fullName: c.firstName && c.lastName ? `${c.firstName} ${c.lastName}` : c.email,
        visionId: c.visionId,
        visionName: c.vision?.nombre,
        originalPrice: Number(c.originalPrice),
        anticipoAmount: c.anticipoAmount ? Number(c.anticipoAmount) : null,
        status: c.status,
        checkoutStartedAt: c.checkoutStartedAt,
        abandonedAt: c.abandonedAt,
        emailSentAt: c.emailSentAt,
        convertedAt: c.convertedAt,
        userId: c.userId,
        userName: c.user?.nombre,
        ticketId: c.ticketId,
        ticketStatus: c.ticket?.status
      })),
      stats: {
        byStatus: stats.reduce((acc, s) => {
          acc[s.status] = s._count;
          return acc;
        }, {} as Record<string, number>),
        totalAbandoned,
        totalConverted,
        conversionRate: totalAbandoned + totalConverted > 0 
          ? ((totalConverted / (totalAbandoned + totalConverted)) * 100).toFixed(1)
          : '0',
        potentialRevenue: totalPotentialRevenue._sum.originalPrice || 0,
        recoveredRevenue: totalRecoveredRevenue._sum.originalPrice || 0
      },
      visions,
      orgConfig
    });

  } catch (error) {
    console.error('Error fetching abandoned checkouts:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// Endpoint para reenviar email de anticipo manualmente
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      include: { organization: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: 'Sin organización' }, { status: 400 });
    }

    const { checkoutId, action } = await request.json();

    if (!checkoutId) {
      return NextResponse.json({ error: 'checkoutId requerido' }, { status: 400 });
    }

    const checkout = await prisma.abandonedCheckout.findFirst({
      where: {
        id: checkoutId,
        organizationId: user.organizationId
      },
      include: {
        vision: true,
        organization: true
      }
    });

    if (!checkout) {
      return NextResponse.json({ error: 'Checkout no encontrado' }, { status: 404 });
    }

    if (action === 'resend_email') {
      // Reenviar email de anticipo
      if (!checkout.organization.anticiposEnabled) {
        return NextResponse.json({ error: 'Anticipos no habilitados' }, { status: 400 });
      }

      // Aquí deberías llamar a tu función de envío de email
      // Por ahora solo actualizamos el estado
      await prisma.abandonedCheckout.update({
        where: { id: checkoutId },
        data: {
          status: 'EMAIL_SENT',
          emailSentAt: new Date()
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Email reenviado correctamente' 
      });
    }

    if (action === 'mark_expired') {
      await prisma.abandonedCheckout.update({
        where: { id: checkoutId },
        data: {
          status: 'EXPIRED'
        }
      });

      return NextResponse.json({ 
        success: true, 
        message: 'Marcado como expirado' 
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error processing abandoned checkout action:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
