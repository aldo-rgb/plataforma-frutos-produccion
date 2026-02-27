import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

const TRIGGER_EVENT_LABELS: Record<string, string> = {
  BASIC_SEATED: 'Básico - Check-in',
  ADVANCE_SEATED: 'Avanzado - Normal',
  ADVANCE_COMBO_SEATED: 'Avanzado - Combo',
  PL_START: 'PL - Semana 1',
  PL_WEEK3_CHECKPOINT: 'PL - Semana 3',
  PL_GUEST_PAID: 'PL - Invitado',
  PL_GRADUATION: 'PL - Graduación',
  REFUND_ADJUSTMENT: 'Ajuste por Reembolso'
};

// GET: List pending commissions for authorization
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const allowedRoles = ['ADMIN', 'SCHOOL_ADMIN'];
    if (!allowedRoles.includes(session.user.rol)) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING_REVIEW';
    const visionId = searchParams.get('visionId');
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    // Build where clause
    const whereClause: any = {
      status: status
    };

    // If SCHOOL_ADMIN, filter by their organization
    if (session.user.rol === 'SCHOOL_ADMIN' && session.user.organizationId) {
      whereClause.organizationId = session.user.organizationId;
    }

    if (visionId) {
      whereClause.visionId = parseInt(visionId);
    }

    // Get pending commissions
    const [commissions, total] = await Promise.all([
      prisma.coordinator_commissions.findMany({
        where: whereClause,
        include: {
          Usuario_coordinator_commissions_coordinatorIdToUsuario: {
            select: { id: true, nombre: true, email: true }
          },
          Usuario_coordinator_commissions_relatedUserIdToUsuario: {
            select: { id: true, nombre: true }
          },
          Vision: {
            select: { id: true, nombre: true }
          },
          Organization: {
            select: { id: true, name: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.coordinator_commissions.count({ where: whereClause })
    ]);

    // Format response
    const formattedCommissions = commissions.map(c => ({
      id: c.id,
      coordinatorId: c.coordinatorId,
      coordinatorName: c.Usuario_coordinator_commissions_coordinatorIdToUsuario?.nombre || 'Sin nombre',
      coordinatorEmail: c.Usuario_coordinator_commissions_coordinatorIdToUsuario?.email || '',
      participantId: c.relatedUserId,
      participantName: c.Usuario_coordinator_commissions_relatedUserIdToUsuario?.nombre || 'Sin nombre',
      triggerEvent: c.triggerEvent,
      triggerEventLabel: TRIGGER_EVENT_LABELS[c.triggerEvent] || c.triggerEvent,
      amount: Number(c.amount),
      status: c.status,
      visionId: c.visionId,
      visionName: c.Vision?.nombre || 'Sin visión',
      organizationName: c.Organization?.name || 'Sin organización',
      createdAt: c.createdAt.toISOString(),
      notes: c.notes
    }));

    return NextResponse.json({
      success: true,
      commissions: formattedCommissions,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    console.error('Error fetching pending commissions:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Authorize or reject commissions
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const allowedRoles = ['ADMIN', 'SCHOOL_ADMIN'];
    if (!allowedRoles.includes(session.user.rol)) {
      return NextResponse.json({ success: false, error: 'Sin permisos' }, { status: 403 });
    }

    const body = await req.json();
    const { action, commissionIds, notes } = body;

    if (!action || !commissionIds || !Array.isArray(commissionIds) || commissionIds.length === 0) {
      return NextResponse.json({ 
        success: false, 
        error: 'Se requiere action y commissionIds' 
      }, { status: 400 });
    }

    if (!['authorize', 'reject'].includes(action)) {
      return NextResponse.json({ 
        success: false, 
        error: 'Action debe ser authorize o reject' 
      }, { status: 400 });
    }

    const newStatus = action === 'authorize' ? 'AUTHORIZED' : 'CANCELLED';
    const verifiedAt = new Date();

    // Build where clause for update
    const whereClause: any = {
      id: { in: commissionIds },
      status: 'PENDING_REVIEW' // Only update pending ones
    };

    // If SCHOOL_ADMIN, ensure they can only modify their organization's commissions
    if (session.user.rol === 'SCHOOL_ADMIN' && session.user.organizationId) {
      whereClause.organizationId = session.user.organizationId;
    }

    // Update commissions
    const result = await prisma.coordinator_commissions.updateMany({
      where: whereClause,
      data: {
        status: newStatus,
        verifiedBy: session.user.id,
        verifiedAt: verifiedAt,
        notes: notes || null,
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} comisión(es) ${action === 'authorize' ? 'autorizada(s)' : 'rechazada(s)'} correctamente`,
      updatedCount: result.count
    });

  } catch (error) {
    console.error('Error updating commissions:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}
