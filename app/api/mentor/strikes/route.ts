import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        nombre: true,
        rol: true,
        accumulatedMissedCalls: true,
        mentorStatus: true,
        isAcceptingNewStudents: true,
        lastStrikeDate: true
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Obtener historial de reportes si es mentor
    let reports = [];
    if (user.rol === 'MENTOR') {
      reports = await prisma.mentorAbsenceReport.findMany({
        where: { mentorId: user.id },
        include: {
          Student: {
            select: {
              id: true,
              nombre: true,
              email: true
            }
          }
        },
        orderBy: {
          reportedAt: 'desc'
        },
        take: 10
      });
    }

    // Calcular nivel de confiabilidad
    const strikes = user.accumulatedMissedCalls;
    let reliability = {
      level: 'excellent',
      icon: '🛡️',
      color: 'text-yellow-400',
      label: 'Excelente',
      percentage: 100
    };

    if (strikes >= 5) {
      reliability = {
        level: 'suspended',
        icon: '🚫',
        color: 'text-red-500',
        label: 'Suspendido',
        percentage: 0
      };
    } else if (strikes >= 3) {
      reliability = {
        level: 'warning',
        icon: '⚠️',
        color: 'text-yellow-500',
        label: 'Alerta',
        percentage: 40
      };
    } else if (strikes >= 1) {
      reliability = {
        level: 'good',
        icon: '🛡️',
        color: 'text-blue-400',
        label: 'Bueno',
        percentage: 80
      };
    }

    return NextResponse.json({
      success: true,
      strikes: {
        current: strikes,
        limit: 5,
        remaining: Math.max(0, 5 - strikes),
        status: user.mentorStatus,
        lastStrike: user.lastStrikeDate,
        isAcceptingNewStudents: user.isAcceptingNewStudents
      },
      reliability,
      reports
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo strikes:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener información',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
