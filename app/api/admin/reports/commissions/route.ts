import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/reports/commissions
 * 
 * Obtiene todas las comisiones de todos los mentores (solo admin)
 * Query params:
 * - status: PENDING | PAID | ALL
 * - type: MENTORSHIP_SESSION | DISCIPLINE_CALL | PACKAGE_SESSION | ALL
 * - mentorId: ID del mentor específico o ALL
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    // Validar que sea admin
    const user = await prisma.usuario.findUnique({
      where: { email: session?.user?.email || '' },
      select: { rol: true }
    });

    if (!user || (user.rol !== 'ADMINISTRADOR' && user.rol !== 'ADMIN')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const type = searchParams.get('type');
    const mentorId = searchParams.get('mentorId');

    // Construir filtros
    const where: any = {};

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (type && type !== 'ALL') {
      where.sourceType = type;
    }

    if (mentorId && mentorId !== 'ALL') {
      where.mentorId = mentorId;
    }

    // Obtener todas las entradas del ledger
    const entries = await prisma.commissionLedger.findMany({
      where,
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        completedAt: 'desc'
      },
      take: 500 // Límite de 500 entradas
    });

    // Calcular resumen por mentor
    const allEntries = await prisma.commissionLedger.findMany({
      include: {
        Mentor: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // Agrupar por mentor
    const mentorMap = new Map<string, {
      mentorId: string;
      mentorName: string;
      totalEarned: number;
      pendingAmount: number;
      paidAmount: number;
      totalSessions: number;
    }>();

    allEntries.forEach((entry: any) => {
      const mentorId = entry.mentorId;
      const mentorName = entry.Mentor.nombre;
      
      if (!mentorMap.has(mentorId)) {
        mentorMap.set(mentorId, {
          mentorId,
          mentorName,
          totalEarned: 0,
          pendingAmount: 0,
          paidAmount: 0,
          totalSessions: 0
        });
      }

      const summary = mentorMap.get(mentorId)!;
      summary.totalEarned += Number(entry.payableAmount);
      summary.totalSessions += 1;

      if (entry.status === 'PENDING') {
        summary.pendingAmount += Number(entry.payableAmount);
      } else if (entry.status === 'PAID') {
        summary.paidAmount += Number(entry.payableAmount);
      }
    });

    const mentorSummaries = Array.from(mentorMap.values()).sort((a, b) => 
      b.totalEarned - a.totalEarned
    );

    // Formatear respuesta
    const formattedEntries = entries.map((entry: any) => ({
      id: entry.id,
      mentorId: entry.mentorId,
      mentorName: entry.Mentor.nombre,
      sourceType: entry.sourceType,
      studentName: entry.studentName,
      totalAmount: Number(entry.totalAmount),
      platformFee: Number(entry.platformFee),
      payableAmount: Number(entry.payableAmount),
      status: entry.status,
      serviceName: entry.serviceName,
      scheduledAt: entry.scheduledAt.toISOString(),
      completedAt: entry.completedAt.toISOString(),
      paidAt: entry.paidAt?.toISOString(),
      payoutBatchId: entry.payoutBatchId
    }));

    return NextResponse.json({
      success: true,
      entries: formattedEntries,
      mentorSummaries
    });

  } catch (error: any) {
    console.error('❌ Error fetching admin commissions:', error);
    return NextResponse.json(
      { error: 'Error al obtener comisiones', details: error.message },
      { status: 500 }
    );
  }
}
