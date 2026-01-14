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
    const { 
      visionId, 
      organizationId, 
      paymentMethod, 
      amountPaid, 
      appliedCodes,
      packageType = 'ADVANCED_ONLY',
      pendingDebt = 0,
      prices
    } = body;

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
        enrollmentStatus: { in: ['ACTIVE', 'ENROLLED'] },
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
        plWeekend1StartDate: true,
        plWeekend3EndDate: true, // Use last PL weekend end date
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

    // Create enrollment and tickets in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the ADVANCED enrollment
      const advancedEnrollment = await tx.vision_enrollments.create({
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

      // Create ADVANCED ticket (always paid for all package types)
      const advancedTicket = await tx.ticket.create({
        data: {
          ownerId: userId,
          organizationId: organizationId,
          visionId: visionId,
          level: 'ADVANCED',
          type: 'STANDARD',
          status: 'ACTIVE',
          paymentStatus: 'PAID',
          costAtPurchase: prices?.ADVANCED_BASE || amountPaid,
          amountPaid: packageType === 'APARTADO' ? (prices?.ADVANCED_BASE || amountPaid) : amountPaid,
          isTransferable: false,
          validUntil: vision.advancedEndDate || null,
        },
      });

      let plEnrollment = null;
      let plTicket = null;

      // If COMBO or APARTADO, also create PL enrollment and ticket
      if (packageType === 'COMBO' || packageType === 'APARTADO') {
        // Create PL enrollment
        plEnrollment = await tx.vision_enrollments.create({
          data: {
            userId: userId,
            visionId: visionId,
            coordinatorId: basicEnrollment.coordinatorId,
            level: 'PL',
            enrollmentStatus: packageType === 'COMBO' ? 'ACTIVE' : 'PENDING', // APARTADO = pending
            paymentStatus: packageType === 'COMBO' ? 'PAID' : 'PENDING',
            enrolledAt: new Date(),
            updatedAt: new Date(),
          },
        });

        // Create PL ticket
        plTicket = await tx.ticket.create({
          data: {
            ownerId: userId,
            organizationId: organizationId,
            visionId: visionId,
            level: 'PL',
            type: 'STANDARD',
            status: packageType === 'COMBO' ? 'ACTIVE' : 'PENDING_PAYMENT', // APARTADO = pending payment
            paymentStatus: packageType === 'COMBO' ? 'PAID' : 'PENDING', // APARTADO = pending payment
            costAtPurchase: prices?.PL || pendingDebt,
            amountPaid: packageType === 'COMBO' ? (prices?.PL || 0) : 0, // APARTADO hasn't paid PL yet
            isTransferable: false,
            validUntil: vision.plWeekend3EndDate || null,
          },
        });
      }

      // Update user's currentVisionLevel
      const user = await tx.usuario.findUnique({
        where: { id: userId },
        select: { currentVisionLevel: true },
      });

      const levelHierarchy = ['BASIC', 'ADVANCED', 'PL'];
      const currentLevelIndex = levelHierarchy.indexOf(user?.currentVisionLevel || 'BASIC');
      const targetLevel = (packageType === 'COMBO') ? 'PL' : 'ADVANCED';
      const newLevelIndex = levelHierarchy.indexOf(targetLevel);

      if (newLevelIndex > currentLevelIndex) {
        await tx.usuario.update({
          where: { id: userId },
          data: {
            currentVisionLevel: targetLevel,
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

      return {
        advancedEnrollment,
        advancedTicket,
        plEnrollment,
        plTicket,
        packageType,
      };
    });

    // Build response message based on package type
    let message = '¡Inscripción exitosa al entrenamiento Avanzado!';
    if (packageType === 'COMBO') {
      message = '¡Inscripción exitosa al Combo Avanzado + Liderato!';
    } else if (packageType === 'APARTADO') {
      message = '¡Tu lugar en Liderato ha sido apartado! Recuerda pagar antes del inicio del Avanzado.';
    }

    return NextResponse.json({
      success: true,
      message,
      enrollment: {
        id: result.advancedEnrollment.id,
        level: result.advancedEnrollment.level,
        status: result.advancedEnrollment.enrollmentStatus,
        packageType: packageType,
      },
      tickets: {
        advanced: result.advancedTicket ? { id: result.advancedTicket.id, status: result.advancedTicket.status } : null,
        pl: result.plTicket ? { id: result.plTicket.id, status: result.plTicket.status, paymentStatus: result.plTicket.paymentStatus } : null,
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
