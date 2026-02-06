import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

// GET /api/director/training-stats
// Obtiene estadísticas de declarados e inscritos para el director
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id;

    // Obtener el usuario con su organización
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        organizationId: true, 
        rol: true 
      }
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organización' },
        { status: 400 }
      );
    }

    // Verificar que sea un director o admin
    const allowedRoles = ['ADMINISTRADOR', 'SUPER_ADMIN', 'TRAINER'];
    if (!allowedRoles.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'Solo directores pueden acceder a estas estadísticas' },
        { status: 403 }
      );
    }

    const orgId = user.organizationId;

    // Obtener todos los productos activos de la organización
    const activeProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: orgId,
        isActive: true,
        levelType: { in: ['BASIC', 'ADVANCED'] }
      },
      select: { id: true, name: true, levelType: true }
    });

    const productIds = activeProducts.map(p => p.id);

    // Obtener estadísticas de pre-registros agrupados por status
    const preRegistroStats = await prisma.advancedPreRegistration.groupBy({
      by: ['status'],
      where: {
        currentProductId: { in: productIds }
      },
      _count: { id: true }
    });

    // Procesar estadísticas de pre-registros
    const preRegistros = {
      pending: 0,
      paid: 0,
      expired: 0,
      cancelled: 0,
      total: 0
    };

    preRegistroStats.forEach(stat => {
      const count = stat._count.id;
      preRegistros.total += count;
      switch (stat.status) {
        case 'PENDING':
          preRegistros.pending = count;
          break;
        case 'PAID':
          preRegistros.paid = count;
          break;
        case 'EXPIRED':
          preRegistros.expired = count;
          break;
        case 'CANCELLED':
          preRegistros.cancelled = count;
          break;
      }
    });

    // Obtener conteo de inscritos por nivel (participantes en visiones activas)
    const inscritosByLevel = await prisma.vision_enrollments.groupBy({
      by: ['level'],
      where: {
        Vision: {
          organizationId: orgId,
          isActive: true
        },
        enrollmentStatus: 'ENROLLED'
      },
      _count: true
    });

    const inscritos = {
      total: 0,
      byLevel: {
        BASIC: 0,
        ADVANCED: 0,
        PL: 0
      }
    };

    inscritosByLevel.forEach(stat => {
      const count = stat._count as number;
      const level = stat.level;
      inscritos.total += count;
      if (level === 'BASIC') inscritos.byLevel.BASIC += count;
      else if (level === 'ADVANCED') inscritos.byLevel.ADVANCED += count;
      else if (level === 'PL') inscritos.byLevel.PL += count;
    });

    return NextResponse.json({
      success: true,
      stats: {
        preRegistros,
        inscritos
      }
    });

  } catch (error) {
    logger.error('[director/training-stats] Error:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener estadísticas' },
      { status: 500 }
    );
  }
}
