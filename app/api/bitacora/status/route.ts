// API para verificar el estado de la bitácora del usuario
// Usado por el widget de alerta en el dashboard

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);

    // Verificar si tiene enrollment en ADVANCED con pago
    const advancedEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId,
        level: 'ADVANCED',
        paymentStatus: { in: ['FULL', 'PARTIAL', 'GIFT'] },
      },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            advancedStartDate: true,
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!advancedEnrollment) {
      return NextResponse.json({
        hasAdvancedEnrollment: false,
        hasCompletedBitacora: false,
        status: null,
        currentDimension: 0,
        advancedStartDate: null,
        daysUntilDeadline: null,
      });
    }

    // Verificar estado de la bitácora
    const questionnaire = await prisma.advancedQuestionnaire.findUnique({
      where: { userId }
    });

    // Calcular días hasta la fecha de inicio (deadline = 48 horas antes)
    let daysUntilDeadline = null;
    if (advancedEnrollment.Vision?.advancedStartDate) {
      const startDate = new Date(advancedEnrollment.Vision.advancedStartDate);
      const deadline = new Date(startDate);
      deadline.setDate(deadline.getDate() - 2); // 48 horas antes
      
      const today = new Date();
      const diffTime = deadline.getTime() - today.getTime();
      daysUntilDeadline = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }

    return NextResponse.json({
      hasAdvancedEnrollment: true,
      hasCompletedBitacora: questionnaire?.status === 'COMPLETED',
      status: questionnaire?.status || 'NOT_STARTED',
      currentDimension: questionnaire?.currentDimension || 0,
      advancedStartDate: advancedEnrollment.Vision?.advancedStartDate,
      daysUntilDeadline,
      visionName: advancedEnrollment.Vision?.nombre,
    });

  } catch (error) {
    console.error('Error checking bitacora status:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
