import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/school-admin/comisiones/stats
 * 
 * Obtiene estadísticas generales de comisiones
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar permisos
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true, organizationId: true }
    });

    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'SUPER_ADMIN'];
    if (!user || !allowedRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No tienes permisos' }, { status: 403 });
    }

    // Obtener todas las comisiones de la organización
    const whereClause = user.organizationId 
      ? { organizationId: user.organizationId }
      : {};

    const commissions = await prisma.coordinator_commissions.findMany({
      where: whereClause,
      select: {
        amount: true,
        status: true,
        triggerEvent: true
      }
    });

    // Calcular totales por estado
    let totalPending = 0;
    let totalAuthorized = 0;
    let totalPaid = 0;
    const byEvent: Record<string, { count: number; total: number }> = {};

    commissions.forEach((c) => {
      const amount = Number(c.amount);
      
      // Por estado
      if (c.status === 'PENDING_REVIEW') {
        totalPending += amount;
      } else if (c.status === 'AUTHORIZED') {
        totalAuthorized += amount;
      } else if (c.status === 'PAID') {
        totalPaid += amount;
      }

      // Por evento
      if (!byEvent[c.triggerEvent]) {
        byEvent[c.triggerEvent] = { count: 0, total: 0 };
      }
      byEvent[c.triggerEvent].count++;
      byEvent[c.triggerEvent].total += amount;
    });

    return NextResponse.json({
      success: true,
      stats: {
        totalPending,
        totalAuthorized,
        totalPaid,
        totalCommissions: commissions.length,
        byEvent
      }
    });

  } catch (error) {
    console.error('Error en GET /api/school-admin/comisiones/stats:', error);
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: String(error) },
      { status: 500 }
    );
  }
}
