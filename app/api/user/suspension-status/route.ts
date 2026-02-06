import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Obtener enrollment activo del usuario
    const enrollment = await prisma.programEnrollment.findFirst({
      where: {
        userId: session.user.id,
        status: { in: ['ACTIVE', 'SUSPENDED'] }
      },
      include: {
        Usuario_ProgramEnrollment_mentorIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    if (!enrollment) {
      return NextResponse.json({
        suspended: false,
        message: 'Sin enrollment activo'
      });
    }

    const isSuspended = enrollment.status === 'SUSPENDED';
    const missedCalls = enrollment.missedCallsCount || 0;
    const maxAllowed = enrollment.maxMissedAllowed || 3;
    const hasExtraLife = enrollment.extraLifeUsed || false;

    return NextResponse.json({
      suspended: isSuspended,
      enrollmentId: enrollment.id,
      missedCallsCount: missedCalls,
      maxMissedAllowed: maxAllowed,
      extraLifeUsed: hasExtraLife,
      extraLifeGrantedBy: enrollment.extraLifeGrantedBy,
      cycleEndDate: enrollment.cycleEndDate,
      mentor: enrollment.Usuario_ProgramEnrollment_mentorIdToUsuario
    });

  } catch (error) {
    logger.error('Error verificando suspensión:', error);
    return NextResponse.json({ 
      error: 'Error verificando estado' 
    }, { status: 500 });
  }
}
