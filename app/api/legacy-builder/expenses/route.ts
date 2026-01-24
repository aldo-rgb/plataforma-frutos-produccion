import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener mis solicitudes de gasto
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const campaignId = searchParams.get('campaignId');

    const where: any = {
      requestedById: userId
    };

    if (campaignId) {
      where.campaignId = parseInt(campaignId);
    }

    const expenses = await prisma.legacyExpense.findMany({
      where,
      include: {
        campaign: {
          select: {
            id: true,
            title: true,
            slug: true,
            availableAmount: true
          }
        },
        auditedBy: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({ expenses });

  } catch (error) {
    console.error('Error fetching expenses:', error);
    return NextResponse.json(
      { error: 'Error obteniendo gastos' },
      { status: 500 }
    );
  }
}

// POST - Crear solicitud de gasto
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();
    
    const {
      campaignId,
      concept,
      description,
      amount,
      providerName,
      providerRFC,
      providerBank,
      providerClabe,
      quotationUrl,
      invoiceUrl,
      evidenceUrls
    } = body;

    // Validaciones
    if (!campaignId || !concept || !amount) {
      return NextResponse.json(
        { error: 'campaignId, concept y amount son requeridos' },
        { status: 400 }
      );
    }

    // Verificar membresía y permisos
    const membership = await prisma.legacyCampaignMember.findUnique({
      where: {
        campaignId_userId: {
          campaignId: campaignId,
          userId: userId
        }
      }
    });

    if (!membership) {
      return NextResponse.json(
        { error: 'No eres miembro de esta campaña' },
        { status: 403 }
      );
    }

    // Solo capitanes y coordinadores pueden solicitar gastos
    if (!['CAPTAIN', 'COORDINATOR'].includes(membership.role)) {
      return NextResponse.json(
        { error: 'Solo capitanes y coordinadores pueden solicitar gastos' },
        { status: 403 }
      );
    }

    // Verificar que la campaña tiene fondos disponibles
    const campaign = await prisma.legacyCampaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        availableAmount: true,
        status: true
      }
    });

    if (!campaign || campaign.status !== 'ACTIVE') {
      return NextResponse.json(
        { error: 'Campaña no activa' },
        { status: 400 }
      );
    }

    if (Number(campaign.availableAmount) < amount) {
      return NextResponse.json(
        { error: `Fondos insuficientes. Disponible: $${campaign.availableAmount}` },
        { status: 400 }
      );
    }

    // Crear solicitud de gasto
    const expense = await prisma.legacyExpense.create({
      data: {
        campaignId: campaignId,
        requestedById: userId,
        concept: concept,
        description: description || null,
        amount: amount,
        providerName: providerName || null,
        providerRFC: providerRFC || null,
        providerBank: providerBank || null,
        providerClabe: providerClabe || null,
        quotationUrl: quotationUrl || null,
        invoiceUrl: invoiceUrl || null,
        evidenceUrls: evidenceUrls || [],
        status: 'REQUESTED'
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Solicitud de gasto enviada a auditoría',
      expense: expense
    });

  } catch (error) {
    console.error('Error creating expense:', error);
    return NextResponse.json(
      { error: 'Error creando solicitud de gasto' },
      { status: 500 }
    );
  }
}
