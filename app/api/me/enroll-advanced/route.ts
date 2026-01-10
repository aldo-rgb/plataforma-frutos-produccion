import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { visionId, organizationId, paymentMethod, amountPaid, appliedCodes } = body;

    if (!visionId || !organizationId) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Check if already enrolled in ADVANCED for this vision
    const existingEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        visionId: visionId,
        level: 'ADVANCED',
      },
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Ya estás inscrito en este entrenamiento Avanzado' },
        { status: 400 }
      );
    }

    // Verify user has completed BASIC
    const basicEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: userId,
        level: 'BASIC',
        enrollmentStatus: 'ACTIVE',
      },
    });

    if (!basicEnrollment) {
      return NextResponse.json(
        { success: false, error: 'Debes completar el entrenamiento Básico primero' },
        { status: 400 }
      );
    }

    // Get the vision to verify it exists and has ADVANCED enabled
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        id: true,
        enabledLevels: true,
        advancedStartDate: true,
        advancedEndDate: true,
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    if (!vision.enabledLevels?.includes('ADVANCED')) {
      return NextResponse.json(
        { success: false, error: 'Esta visión no tiene el nivel Avanzado habilitado' },
        { status: 400 }
      );
    }

    // Create enrollment in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the ADVANCED enrollment
      // Use the coordinatorId from the basic enrollment
      const enrollment = await tx.vision_enrollments.create({
        data: {
          userId: userId,
          visionId: visionId,
          coordinatorId: basicEnrollment.coordinatorId,
          level: 'ADVANCED',
          enrollmentStatus: 'ACTIVE',
          paymentStatus: amountPaid > 0 ? 'PAID' : 'PENDING',
          enrolledAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Update user's currentVisionLevel if they didn't have one higher
      const user = await tx.usuario.findUnique({
        where: { id: userId },
        select: { currentVisionLevel: true },
      });

      const levelHierarchy = ['BASIC', 'ADVANCED', 'PL'];
      const currentLevelIndex = levelHierarchy.indexOf(user?.currentVisionLevel || 'BASIC');
      const newLevelIndex = levelHierarchy.indexOf('ADVANCED');

      if (newLevelIndex > currentLevelIndex) {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            currentVisionLevel: 'ADVANCED',
          },
        });
      }

      // If organization changed, update user's organization
      const currentUser = await tx.usuario.findUnique({
        where: { id: userId },
        select: { organizationId: true },
      });

      if (currentUser?.organizationId !== organizationId) {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            organizationId: organizationId,
          },
        });
      }

      return enrollment;
    });

    return NextResponse.json({
      success: true,
      message: '¡Inscripción exitosa al entrenamiento Avanzado!',
      enrollment: {
        id: result.id,
        level: result.level,
        status: result.enrollmentStatus,
      },
    });
  } catch (error) {
    console.error('Error enrolling in advanced:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
