import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinator = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    // Solo coordinadores pueden graduar
    if (!coordinator || !['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(coordinator.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const { userId, visionId, fromLevel, toLevel, notes } = body;

    if (!userId || !fromLevel || !toLevel) {
      return NextResponse.json(
        { error: 'userId, fromLevel y toLevel son requeridos' },
        { status: 400 }
      );
    }

    // Validar orden de niveles
    const levelOrder: any = { BASIC: 1, ADVANCED: 2, PL: 3 };
    if (levelOrder[fromLevel] >= levelOrder[toLevel]) {
      return NextResponse.json(
        { error: 'El nivel de destino debe ser superior al actual' },
        { status: 400 }
      );
    }

    const student = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { id: true, nombre: true, email: true, currentVisionLevel: true, studentStatus: true }
    });

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    // Transacción para graduar
    const result = await prisma.$transaction(async (tx) => {
      // Registrar graduación
      const graduation = await tx.studentGraduation.create({
        data: {
          userId,
          visionId: visionId || 0, // TODO: Obtener visionId actual del usuario
          fromLevel,
          toLevel,
          graduatedBy: coordinator.id,
          notes,
        },
      });

      // Actualizar estado del estudiante
      let newStatus = null;
      let graduationDate = new Date();

      switch (toLevel) {
        case 'ADVANCED':
          newStatus = 'ADVANCED_CANDIDATE';
          await tx.usuario.update({
            where: { id: userId },
            data: {
              studentStatus: newStatus,
              graduatedFromBasic: graduationDate,
            },
          });
          break;
        case 'PL':
          newStatus = 'PL_CANDIDATE';
          await tx.usuario.update({
            where: { id: userId },
            data: {
              studentStatus: newStatus,
              graduatedFromAdvanced: graduationDate,
            },
          });
          break;
      }

      return { graduation, newStatus };
    });

    // TODO: Enviar notificación al estudiante

    return NextResponse.json({
      success: true,
      graduation: result.graduation,
      newStatus: result.newStatus,
      message: `Estudiante graduado exitosamente a ${toLevel}`,
    });
  } catch (error) {
    logger.error('Error graduando estudiante:', error);
    return NextResponse.json(
      { error: 'Error al graduar estudiante' },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const userId = searchParams.get('userId');
    const visionId = searchParams.get('visionId');

    const where: any = {};

    if (userId) {
      where.userId = parseInt(userId);
    }

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    const graduations = await prisma.studentGraduation.findMany({
      where,
      include: {
        Usuario: {
          select: { id: true, nombre: true, email: true }
        },
        GraduatedBy: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({ graduations });
  } catch (error) {
    logger.error('Error obteniendo graduaciones:', error);
    return NextResponse.json(
      { error: 'Error al obtener graduaciones' },
      { status: 500 }
    );
  }
}
