/**
 * 🧬 QUANTUM PATTERNS API
 * GET /api/quantum/insights - Obtener insights activos del usuario
 * POST /api/quantum/insights/[id]/viewed - Marcar insight como visto
 * POST /api/quantum/insights/[id]/dismiss - Descartar insight
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getActiveInsights } from '@/lib/quantum-engine';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const insights = await getActiveInsights(session.user.id);

    return NextResponse.json({
      success: true,
      insights: insights.map((insight) => ({
        id: insight.id,
        title: insight.title,
        message: insight.message,
        iconEmoji: insight.iconEmoji,
        actionButton: insight.actionButton,
        actionUrl: insight.actionUrl,
        chartData: insight.chartData,
        patternType: insight.Pattern.patternType,
        confidence: Math.round(insight.Pattern.confidence * 100),
        createdAt: insight.createdAt,
      })),
    });
  } catch (error) {
    console.error('[QUANTUM API] Error:', error);
    return NextResponse.json({ error: 'Error al obtener insights' }, { status: 500 });
  }
}
