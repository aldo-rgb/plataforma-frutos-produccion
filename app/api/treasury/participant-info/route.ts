import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/treasury/participant-info
 * Obtiene información detallada de un participante para cobro
 * Incluye: nivel actual, siguiente nivel, saldo pendiente, historial de visiones
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const participantId = searchParams.get('participantId');
    const organizationId = searchParams.get('organizationId');
    const visionId = searchParams.get('visionId');

    if (!participantId) {
      return NextResponse.json({ error: 'participantId es requerido' }, { status: 400 });
    }

    // Obtener información del participante
    const participant = await prisma.usuario.findUnique({
      where: { id: parseInt(participantId) },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        organizationId: true
      }
    });

    if (!participant) {
      return NextResponse.json({ error: 'Participante no encontrado' }, { status: 404 });
    }

    // Obtener todos los tickets del participante para determinar su historial
    // El nivel está en el campo 'level' del Ticket
    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: participant.id,
        status: { in: ['ACTIVE', 'TRANSFERRED'] }, // Solo tickets completados/activos
        paymentStatus: { in: ['PAID', 'GIFT'] }
      },
      select: {
        id: true,
        visionId: true,
        level: true,
        status: true,
        paymentStatus: true,
        purchasePrice: true,
        amountPaid: true,
        createdAt: true,
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            endDate: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Determinar niveles completados basándose en el campo level del ticket
    const completedLevels = new Set<string>();
    tickets.forEach(ticket => {
      if (ticket.level) {
        completedLevels.add(ticket.level);
      }
    });

    // Determinar el siguiente nivel
    const levelProgression = ['BASIC', 'ADVANCED', 'PL'];
    let nextLevel: string | null = null;
    let currentLevel: string | null = null;
    
    for (const level of levelProgression) {
      if (completedLevels.has(level)) {
        currentLevel = level;
      } else if (!nextLevel) {
        nextLevel = level;
      }
    }

    // Si completó todos los niveles
    const isGraduate = completedLevels.has('BASIC') && completedLevels.has('ADVANCED') && completedLevels.has('PL');
    
    if (isGraduate) {
      nextLevel = null; // Ya es graduado
      currentLevel = 'PL';
    } else if (!nextLevel) {
      nextLevel = 'BASIC'; // Si no tiene ningún nivel
    }

    // Buscar ticket pendiente de pago (si se especificó visionId)
    let pendingTicket = null;
    let pendingAmount = 0;

    if (visionId) {
      pendingTicket = await prisma.ticket.findFirst({
        where: {
          ownerId: participant.id,
          visionId: parseInt(visionId),
          paymentStatus: { in: ['UNPAID', 'PARTIAL', 'PENDING'] }
        },
        select: {
          id: true,
          purchasePrice: true,
          amountPaid: true,
          paymentStatus: true,
          level: true
        }
      });

      if (pendingTicket) {
        const price = pendingTicket.purchasePrice ? Number(pendingTicket.purchasePrice) : 0;
        const paid = pendingTicket.amountPaid ? Number(pendingTicket.amountPaid) : 0;
        pendingAmount = Math.max(0, price - paid);
      }
    }

    // Obtener configuración de precios para el siguiente nivel
    const targetOrgId = organizationId ? parseInt(organizationId) : participant.organizationId;
    let priceConfig = null;
    
    if (nextLevel && targetOrgId) {
      priceConfig = await prisma.ticketPriceConfig.findFirst({
        where: {
          organizationId: targetOrgId,
          level: nextLevel as any,
          isActive: true
        },
        select: {
          regularPrice: true,
          promoPrice: true,
          promoValidUntil: true
        }
      });
    }

    const levelNames: Record<string, string> = {
      'BASIC': 'Básico',
      'ADVANCED': 'Avanzado',
      'PL': 'Liderato'
    };

    return NextResponse.json({
      success: true,
      participant: {
        id: participant.id,
        nombre: participant.nombre,
        email: participant.email,
        telefono: participant.telefono
      },
      progression: {
        completedLevels: Array.from(completedLevels),
        currentLevel,
        currentLevelName: currentLevel ? levelNames[currentLevel] || currentLevel : 'Sin nivel',
        nextLevel,
        nextLevelName: nextLevel ? levelNames[nextLevel] || nextLevel : 'Graduado',
        hasAllLevels: isGraduate
      },
      payment: {
        pendingTicket: pendingTicket ? {
          id: pendingTicket.id,
          level: pendingTicket.level,
          saldoPendiente: pendingAmount
        } : null,
        pendingAmount,
        suggestedPrice: priceConfig?.regularPrice ? Number(priceConfig.regularPrice) : 0,
        promoPrice: priceConfig?.promoPrice ? Number(priceConfig.promoPrice) : null,
        promoValidUntil: priceConfig?.promoValidUntil || null
      },
      history: tickets.slice(0, 10).map(t => ({
        ticketId: t.id,
        visionId: t.visionId,
        visionName: t.vision?.nombre || 'Visión',
        level: t.level,
        date: t.vision?.startDate || t.createdAt
      }))
    });

  } catch (error) {
    console.error('Error fetching participant info:', error);
    return NextResponse.json(
      { error: 'Error al obtener información del participante' },
      { status: 500 }
    );
  }
}
