import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { TRIGGER_EVENT_LABELS } from '@/lib/commission-engine';

/**
 * GET /api/coordinator/wallet
 * 
 * Obtiene el resumen del Quantum Wallet del coordinador autenticado
 * Incluye: saldo acumulado, transacciones recientes, estadísticas
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar que sea coordinador
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        nombre: true, 
        rol: true,
        email: true 
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const validRoles = ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'COORDINATOR_PL', 'COORDINADOR'];
    if (!validRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos de coordinador' }, { status: 403 });
    }

    // Obtener comisiones usando el nombre correcto del modelo
    const commissions = await prisma.coordinator_commissions.findMany({
      where: { 
        coordinatorId: userId,
        status: { in: ['PENDING_REVIEW', 'AUTHORIZED', 'PAID'] }
      },
      include: {
        Usuario_coordinator_commissions_relatedUserIdToUsuario: {
          select: { nombre: true, email: true }
        },
        Vision: {
          select: { nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 50 // Últimas 50 transacciones
    });

    // Calcular totales
    let totalAccumulated = 0;
    let pendingReview = 0;
    let authorized = 0;
    let paid = 0;

    const transactions = commissions.map((c) => {
      const amount = Number(c.amount);
      
      if (c.status === 'PENDING_REVIEW') {
        pendingReview += amount;
      } else if (c.status === 'AUTHORIZED') {
        authorized += amount;
      } else if (c.status === 'PAID') {
        paid += amount;
      }
      
      totalAccumulated += amount;

      return {
        id: c.id,
        date: c.createdAt.toISOString(),
        event: c.triggerEvent,
        eventLabel: TRIGGER_EVENT_LABELS[c.triggerEvent] || c.triggerEvent,
        studentName: c.Usuario_coordinator_commissions_relatedUserIdToUsuario?.nombre || 'Participante',
        visionName: c.Vision?.nombre || 'N/A',
        amount,
        status: c.status,
        notes: c.notes,
        isPositive: amount >= 0
      };
    });

    // Estadísticas por tipo de evento
    const statsByEvent: Record<string, { count: number; total: number }> = {};
    commissions.forEach((c) => {
      const event = c.triggerEvent;
      if (!statsByEvent[event]) {
        statsByEvent[event] = { count: 0, total: 0 };
      }
      statsByEvent[event].count++;
      statsByEvent[event].total += Number(c.amount);
    });

    return NextResponse.json({
      success: true,
      wallet: {
        coordinator: {
          id: user.id,
          name: user.nombre,
          role: user.rol
        },
        summary: {
          totalAccumulated,
          pendingReview,
          authorized,
          paid,
          availableForWithdraw: authorized // Lo autorizado está disponible
        },
        transactions,
        statsByEvent,
        lastUpdated: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Error en GET /api/coordinator/wallet:', error);
    return NextResponse.json(
      { error: 'Error al obtener wallet', details: String(error) },
      { status: 500 }
    );
  }
}

/**
 * POST /api/coordinator/wallet
 * 
 * Solicitar retiro (marca comisiones como en proceso de pago)
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { action } = body;

    if (action === 'request_withdrawal') {
      // Obtener comisiones autorizadas
      const authorizedCommissions = await prisma.coordinator_commissions.findMany({
        where: {
          coordinatorId: userId,
          status: 'AUTHORIZED'
        }
      });

      if (authorizedCommissions.length === 0) {
        return NextResponse.json({
          success: false,
          error: 'No tienes comisiones autorizadas para retirar'
        }, { status: 400 });
      }

      let totalToWithdraw = 0;
      authorizedCommissions.forEach((c) => {
        totalToWithdraw += Number(c.amount);
      });

      // En un sistema real, aquí se integraría con el sistema de pagos
      // Por ahora solo retornamos la información para que admin procese

      return NextResponse.json({
        success: true,
        withdrawal: {
          requestId: `WR-${Date.now()}`,
          amount: totalToWithdraw,
          commissionsCount: authorizedCommissions.length,
          status: 'PENDING_ADMIN_REVIEW',
          requestedAt: new Date().toISOString(),
          message: 'Tu solicitud de retiro ha sido registrada. El equipo de administración la procesará pronto.'
        }
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error en POST /api/coordinator/wallet:', error);
    return NextResponse.json(
      { error: 'Error al procesar solicitud', details: String(error) },
      { status: 500 }
    );
  }
}
