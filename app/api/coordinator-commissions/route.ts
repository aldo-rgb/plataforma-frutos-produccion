import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener comisiones de un coordinador
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const coordinatorId = searchParams.get('coordinatorId');
    const visionId = searchParams.get('visionId');
    const status = searchParams.get('status');
    const limit = searchParams.get('limit') || '50';

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si no es admin/director, solo puede ver sus propias comisiones
    const targetCoordinatorId = coordinatorId ? parseInt(coordinatorId) : user.id;
    
    if (targetCoordinatorId !== user.id && user.rol !== 'admin' && user.rol !== 'director') {
      return NextResponse.json({ error: 'Sin permisos' }, { status: 403 });
    }

    // Construir filtros
    const where: any = {
      coordinatorId: targetCoordinatorId
    };

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    if (status) {
      where.status = status;
    }

    // Obtener comisiones
    const commissions = await prisma.coordinatorCommission.findMany({
      where,
      take: parseInt(limit),
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        RelatedUser: {
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
        },
        Organization: {
          select: {
            id: true,
            name: true
          }
        },
        VerifiedByUser: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // Calcular resumen
    const summary = {
      total: commissions.length,
      totalAmount: commissions.reduce((sum, c) => sum + parseFloat(c.amount.toString()), 0),
      pending: commissions.filter(c => c.status === 'PENDING_REVIEW').length,
      authorized: commissions.filter(c => c.status === 'AUTHORIZED').length,
      paid: commissions.filter(c => c.status === 'PAID').length,
      byEvent: {} as Record<string, number>
    };

    commissions.forEach(c => {
      if (!summary.byEvent[c.triggerEvent]) {
        summary.byEvent[c.triggerEvent] = 0;
      }
      summary.byEvent[c.triggerEvent]++;
    });

    return NextResponse.json({
      success: true,
      commissions,
      summary
    });

  } catch (error: any) {
    logger.error('Error obteniendo comisiones:', error);
    return NextResponse.json(
      { error: 'Error al obtener comisiones', details: error.message },
      { status: 500 }
    );
  }
}

// POST - Crear comisión manual
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
      return NextResponse.json({ error: 'Solo admin/director pueden crear comisiones manuales' }, { status: 403 });
    }

    const body = await request.json();
    const {
      coordinatorId,
      coordinatorRole,
      amount,
      visionId,
      relatedUserId,
      notes
    } = body;

    if (!coordinatorId || !amount || !visionId || !relatedUserId) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos: coordinatorId, amount, visionId, relatedUserId' 
      }, { status: 400 });
    }

    // Obtener la organización de la visión
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) }
    });

    if (!vision || !vision.organizationId) {
      return NextResponse.json({ error: 'Visión no encontrada o sin organización' }, { status: 404 });
    }

    // Crear comisión
    const commission = await prisma.coordinatorCommission.create({
      data: {
        coordinatorId: parseInt(coordinatorId),
        coordinatorRole: coordinatorRole || 'MANUAL',
        triggerEvent: 'MANUAL_ADJUSTMENT',
        relatedUserId: parseInt(relatedUserId),
        amount: parseFloat(amount),
        visionId: parseInt(visionId),
        organizationId: vision.organizationId,
        status: 'PENDING_REVIEW',
        notes,
        updatedAt: new Date()
      },
      include: {
        Coordinator: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        RelatedUser: {
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

    return NextResponse.json({
      success: true,
      message: 'Comisión manual creada exitosamente',
      commission
    });

  } catch (error: any) {
    logger.error('Error creando comisión manual:', error);
    return NextResponse.json(
      { error: 'Error al crear comisión', details: error.message },
      { status: 500 }
    );
  }
}
