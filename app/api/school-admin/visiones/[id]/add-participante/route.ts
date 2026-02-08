import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateReferralCode } from '@/lib/referralCode';
import logger from '@/lib/logger';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const visionId = parseInt(params.id);
    const { participanteId } = await request.json();

    if (isNaN(visionId) || !participanteId) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización del director
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        _count: {
          select: { Participantes: true },
        },
      },
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

    // Verificar límite de participantes
    if (vision.maxParticipantes && vision._count.Participantes >= vision.maxParticipantes) {
      return NextResponse.json(
        { success: false, error: 'Se alcanzó el límite máximo de participantes' },
        { status: 400 }
      );
    }

    // Verificar que el participante no esté ya en la visión
    const existingRelation = await prisma.visionParticipante.findFirst({
      where: {
        visionId,
        participanteId,
      },
    });

    if (existingRelation) {
      return NextResponse.json(
        { success: false, error: 'El participante ya está en esta visión' },
        { status: 400 }
      );
    }

    // Verificar si el participante tiene referralCode, si no, generarlo
    const participante = await prisma.usuario.findUnique({
      where: { id: participanteId },
      select: { id: true, nombre: true, referralCode: true }
    });

    if (participante && !participante.referralCode) {
      const newReferralCode = generateReferralCode(participante.nombre || 'Usuario', visionId);
      await prisma.usuario.update({
        where: { id: participanteId },
        data: { referralCode: newReferralCode }
      });
      logger.debug(`🎟️ ReferralCode generado para participante ${participante.nombre}: ${newReferralCode}`);
    }

    // Agregar participante a la visión
    const relation = await prisma.visionParticipante.create({
      data: {
        visionId,
        participanteId,
      },
    });

    // Asignar licencia pendiente automáticamente
    try {
      // Verificar si ya tiene licencia para esta visión
      const existingLicense = await prisma.licenseAssignment.findFirst({
        where: {
          userId: participanteId,
          visionId: visionId,
          isActive: true
        }
      });

      if (!existingLicense) {
        const licenseCode = `QNT-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
        await prisma.licenseAssignment.create({
          data: {
            userId: participanteId,
            licenseCode: licenseCode,
            visionId: visionId,
            organizationId: user.organizationId,
            assignedBy: session.user.id,
            isActive: true,
            activatedAt: null, // Pendiente hasta que envíe su carta
            assignedAt: new Date(),
            expiresAt: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000) // 10 días para activar
          }
        });
        logger.debug(`🎫 Licencia pendiente asignada automáticamente`);
      }
    } catch (error) {
      logger.error('Error asignando licencia automática:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Participante agregado exitosamente con licencia pendiente',
      relation,
    });
  } catch (error) {
    logger.error('Error adding participante to vision:', error);
    return NextResponse.json(
      { success: false, error: 'Error al agregar participante' },
      { status: 500 }
    );
  }
}
