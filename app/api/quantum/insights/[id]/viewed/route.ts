/**
 * 🧬 QUANTUM PATTERNS API - Acciones sobre Insight
 * POST /api/quantum/insights/[id]/viewed - Marcar como visto
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const insightId = parseInt(params.id);

    // Verificar que el insight pertenece al usuario
    const insight = await prisma.quantumInsight.findFirst({
      where: {
        id: insightId,
        usuarioId: session.user.id,
      },
    });

    if (!insight) {
      return NextResponse.json({ error: 'Insight no encontrado' }, { status: 404 });
    }

    // Marcar como visto
    await prisma.quantumInsight.update({
      where: { id: insightId },
      data: {
        viewed: true,
        viewedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Insight marcado como visto',
    });
  } catch (error) {
    console.error('[QUANTUM API] Error al marcar como visto:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
