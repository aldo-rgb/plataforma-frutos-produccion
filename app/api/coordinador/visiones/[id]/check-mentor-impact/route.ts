import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'COORDINADOR') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);
    const { searchParams } = new URL(request.url);
    const userId = parseInt(searchParams.get('userId') || '0');
    const userType = searchParams.get('userType') || '';

    if (!userId || !userType) {
      return NextResponse.json(
        { success: false, error: 'Parámetros inválidos' },
        { status: 400 }
      );
    }

    // Obtener el usuario con su información de programa
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        ProgramEnrollment_ProgramEnrollment_userIdToUsuario: {
          where: {
            status: 'ACTIVE'
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 1
        }
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar llamadas de disciplina programadas
    const scheduledCalls = await prisma.callBooking.count({
      where: {
        studentId: userId,
        status: 'SCHEDULED',
        startTime: {
          gte: new Date()
        }
      }
    });

    // Calcular semanas restantes del ciclo
    let remainingWeeks = 0;
    const enrollment = usuario.ProgramEnrollment_ProgramEnrollment_userIdToUsuario[0];
    
    if (enrollment && enrollment.cycleEndDate) {
      const now = new Date();
      const endDate = new Date(enrollment.cycleEndDate);
      const diffTime = Math.abs(endDate.getTime() - now.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      remainingWeeks = Math.ceil(diffDays / 7);
    }

    return NextResponse.json({
      success: true,
      hasScheduledCalls: scheduledCalls > 0,
      scheduledCalls,
      remainingWeeks,
      cycleType: enrollment?.cycleType || null,
      cycleEndDate: enrollment?.cycleEndDate || null
    });

  } catch (error) {
    console.error('Error checking mentor impact:', error);
    return NextResponse.json(
      { success: false, error: 'Error al verificar impacto' },
      { status: 500 }
    );
  }
}
