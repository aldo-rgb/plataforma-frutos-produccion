import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// Roles permitidos para acceder a esta API
const ALLOWED_ROLES = [
  'SCHOOL_ADMIN', 
  'ADMINISTRADOR', 
  'COORDINADOR', 
  'COORDINATOR_BASIC', 
  'COORDINATOR_ADVANCED'
];

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener staff actual de la visión
    const staff = await prisma.VisionStaff.findMany({
      where: { visionId },
      include: {
        Usuario_VisionStaff_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
      },
    });

    logger.debug(`🔍 STAFF RECORDS FOUND for vision ${visionId}:`, staff.length);
    logger.debug('📋 Staff records:', staff.map(s => ({ userId: s.userId, role: s.role, plWeekendNumber: s.plWeekendNumber })));

    // Mapear los registros a la estructura esperada por el frontend
    const staffData = {
      basicCoordinatorId: '',
      basicTrainerId: '',
      advancedCoordinatorId: '',
      advancedTrainerId: '',
      plCoordinatorId: '',
      plTrainers: ['', '', ''],
    };

    staff.forEach((record: any) => {
      const userId = record.userId.toString();
      
      switch (record.role) {
        case 'BASIC_COORDINATOR':
          staffData.basicCoordinatorId = userId;
          break;
        case 'BASIC_TRAINER':
          staffData.basicTrainerId = userId;
          break;
        case 'ADVANCED_COORDINATOR':
          staffData.advancedCoordinatorId = userId;
          break;
        case 'ADVANCED_TRAINER':
          staffData.advancedTrainerId = userId;
          break;
        case 'PL_COORDINATOR':
          staffData.plCoordinatorId = userId;
          break;
        case 'PL_TRAINER':
          if (record.plWeekendNumber && record.plWeekendNumber >= 1 && record.plWeekendNumber <= 3) {
            staffData.plTrainers[record.plWeekendNumber - 1] = userId;
          }
          break;
      }
    });

    logger.debug('📦 Final staffData to be returned:', staffData);

    return NextResponse.json({
      success: true,
      data: staffData,
    });

  } catch (error) {
    logger.error('Error fetching staff:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el staff' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !ALLOWED_ROLES.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      basicCoordinatorId,
      basicTrainerId,
      advancedCoordinatorId,
      advancedTrainerId,
      plCoordinatorId,
      plTrainers
    } = body;

    // Verificar que la visión existe y pertenece a la organización del director
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { organizationId: true },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId || vision.organizationId !== user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Eliminar configuración de staff existente
    await prisma.VisionStaff.deleteMany({
      where: { visionId }
    });

    // Construir array de registros de staff
    const staffRecords = [];
    const now = new Date();

    if (basicCoordinatorId) {
      staffRecords.push({
        visionId,
        userId: parseInt(basicCoordinatorId),
        role: 'BASIC_COORDINATOR' as const,
        level: 'BASIC' as const,
        assignedBy: session.user.id,
        updatedAt: now,
      });
    }

    if (basicTrainerId) {
      staffRecords.push({
        visionId,
        userId: parseInt(basicTrainerId),
        role: 'BASIC_TRAINER' as const,
        level: 'BASIC' as const,
        assignedBy: session.user.id,
        updatedAt: now,
      });
    }

    if (advancedCoordinatorId) {
      staffRecords.push({
        visionId,
        userId: parseInt(advancedCoordinatorId),
        role: 'ADVANCED_COORDINATOR' as const,
        level: 'ADVANCED' as const,
        assignedBy: session.user.id,
        updatedAt: now,
      });
    }

    if (advancedTrainerId) {
      staffRecords.push({
        visionId,
        userId: parseInt(advancedTrainerId),
        role: 'ADVANCED_TRAINER' as const,
        level: 'ADVANCED' as const,
        assignedBy: session.user.id,
        updatedAt: now,
      });
    }

    if (plCoordinatorId) {
      staffRecords.push({
        visionId,
        userId: parseInt(plCoordinatorId),
        role: 'PL_COORDINATOR' as const,
        level: 'PL' as const,
        assignedBy: session.user.id,
        updatedAt: now,
      });
    }

    if (plTrainers && Array.isArray(plTrainers)) {
      plTrainers.forEach((trainerId, index) => {
        if (trainerId) {
          staffRecords.push({
            visionId,
            userId: parseInt(trainerId),
            role: 'PL_TRAINER' as const,
            level: 'PL' as const,
            plWeekendNumber: index + 1, // 1, 2, or 3
            assignedBy: session.user.id,
            updatedAt: now,
          });
        }
      });
    }

    // Crear nuevos registros de staff
    let createdStaff = [];
    if (staffRecords.length > 0) {
      await prisma.VisionStaff.createMany({
        data: staffRecords,
      });

      // Obtener los registros creados con información del usuario
      createdStaff = await prisma.VisionStaff.findMany({
        where: { visionId },
        include: {
          Usuario_VisionStaff_userIdToUsuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
            },
          },
        },
      });
    }

    // IMPORTANTE: También actualizar SchoolProduct para mantener sincronizado
    // Actualizar producto BASIC
    if (basicCoordinatorId || basicTrainerId) {
      await prisma.schoolProduct.updateMany({
        where: { visionId, levelType: 'BASIC' },
        data: {
          ...(basicCoordinatorId && { coordinatorId: parseInt(basicCoordinatorId) }),
          ...(basicTrainerId && { trainerId: parseInt(basicTrainerId) }),
        },
      });
    }

    // Actualizar producto ADVANCED
    if (advancedCoordinatorId || advancedTrainerId) {
      await prisma.schoolProduct.updateMany({
        where: { visionId, levelType: 'ADVANCED' },
        data: {
          ...(advancedCoordinatorId && { coordinatorId: parseInt(advancedCoordinatorId) }),
          ...(advancedTrainerId && { trainerId: parseInt(advancedTrainerId) }),
        },
      });
    }

    // Actualizar producto PL (solo coordinador, trainers van en VisionStaff)
    if (plCoordinatorId) {
      await prisma.schoolProduct.updateMany({
        where: { visionId, levelType: 'PL' },
        data: {
          coordinatorId: parseInt(plCoordinatorId),
        },
      });
    }

    logger.debug('✅ Staff guardado y SchoolProduct sincronizado');

    return NextResponse.json({
      success: true,
      message: 'Configuración de staff guardada correctamente',
      data: {
        basicCoordinatorId,
        basicTrainerId,
        advancedCoordinatorId,
        advancedTrainerId,
        plCoordinatorId,
        plTrainers,
        staffRecords: createdStaff,
      }
    });

  } catch (error) {
    logger.error('Error updating staff:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el staff' },
      { status: 500 }
    );
  }
}
