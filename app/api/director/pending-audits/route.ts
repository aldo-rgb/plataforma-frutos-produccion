import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener auditorías pendientes del Director/School Admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || !['SCHOOL_ADMIN', 'DIRECTOR', 'ADMIN'].includes(user.rol)) {
      return NextResponse.json({ pendingAudits: [] });
    }

    if (!user.organizationId) {
      return NextResponse.json({ pendingAudits: [] });
    }

    // Obtener productos COMPLETED de la organización del director
    const completedProducts = await prisma.schoolProduct.findMany({
      where: {
        organizationId: user.organizationId,
        trainingStatus: 'COMPLETED',
        type: 'CORE_TRAINING', // Solo entrenamientos core, no talleres extra
      },
      select: {
        id: true,
        name: true,
        levelType: true,
        visionId: true,
        endDate: true,
        Vision: {
          select: { nombre: true }
        }
      },
      orderBy: { endDate: 'desc' }
    });

    if (completedProducts.length === 0) {
      return NextResponse.json({ pendingAudits: [] });
    }

    // Obtener auditorías ya completadas
    const completedAudits = await prisma.directorAudit.findMany({
      where: { 
        directorId: user.id,
        productId: { in: completedProducts.map(p => p.id) }
      },
      select: { productId: true }
    });

    const completedProductIds = new Set(completedAudits.map(a => a.productId));

    // Filtrar productos sin auditoría
    const pendingAudits = completedProducts
      .filter(p => !completedProductIds.has(p.id))
      .map(p => ({
        productId: p.id,
        productName: p.name,
        levelType: p.levelType,
        visionName: p.Vision?.nombre || 'Visión',
        endDate: p.endDate
      }));

    return NextResponse.json({ 
      pendingAudits,
      total: pendingAudits.length
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo auditorías pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener auditorías pendientes' },
      { status: 500 }
    );
  }
}
