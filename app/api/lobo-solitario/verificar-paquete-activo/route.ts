import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/lobo-solitario/verificar-paquete-activo
 * Verifica si el usuario tiene un paquete activo de Lobo Solitario
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Buscar créditos activos
    const activeCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: session.user.id,
          status: 'COMPLETED'
        },
        remainingSessions: {
          gt: 0
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        MentorPackageOrder: {
          select: {
            id: true,
            paymentData: true,
            paidAt: true,
            Mentor: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!activeCredits) {
      return NextResponse.json({
        hasActivePackage: false
      });
    }

    const planInfo = activeCredits.MentorPackageOrder.paymentData as any;

    return NextResponse.json({
      hasActivePackage: true,
      package: {
        remainingSessions: activeCredits.remainingSessions,
        totalSessions: activeCredits.totalSessions,
        usedSessions: activeCredits.usedSessions,
        expiresAt: activeCredits.expiresAt,
        mentor: activeCredits.MentorPackageOrder.Mentor,
        planType: planInfo?.plan,
        frecuencia: planInfo?.frecuencia,
        isAnual: planInfo?.frecuencia === 'ANUAL',
        paidAt: activeCredits.MentorPackageOrder.paidAt
      }
    });

  } catch (error: any) {
    logger.error('❌ Error verificando paquete activo:', error);
    return NextResponse.json(
      { error: 'Error al verificar paquete activo', details: error.message },
      { status: 500 }
    );
  }
}
