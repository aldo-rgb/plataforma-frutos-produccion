import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { shouldAutoGraduate } from '@/lib/auto-graduate-config';

// Función para generar código de licencia único
function generateLicenseCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = 'FRU-';
  
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 4; j++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    if (i < 2) code += '-';
  }
  
  return code;
}

// Roles permitidos para asignar licencias
const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR'];

export async function POST(
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
    const { participanteId } = await request.json();

    if (isNaN(visionId) || !participanteId) {
      return NextResponse.json(
        { success: false, error: 'Datos inválidos' },
        { status: 400 }
      );
    }

    // Verificar que el director tiene organización
    const director = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!director?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes organización asignada' },
        { status: 400 }
      );
    }

    // Verificar que la visión pertenece a la organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
    });

    if (!vision || vision.organizationId !== director.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes acceso a esta visión' },
        { status: 403 }
      );
    }

    // Verificar que el usuario está en la visión (puede ser participante, game changer o enrollment)
    const visionParticipante = await prisma.visionParticipante.findFirst({
      where: {
        visionId,
        participanteId,
      },
    });

    const visionGameChanger = await prisma.visionGameChanger.findFirst({
      where: {
        visionId,
        gameChangerId: participanteId,
      },
    });

    // También verificar en vision_enrollments
    const visionEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        visionId,
        userId: participanteId,
      },
    });

    if (!visionParticipante && !visionGameChanger && !visionEnrollment) {
      return NextResponse.json(
        { success: false, error: 'El usuario no está en esta visión' },
        { status: 400 }
      );
    }

    // Verificar que el participante no tiene ya una licencia
    const participante = await prisma.usuario.findUnique({
      where: { id: participanteId },
      select: { licenseCode: true, tier: true },
    });

    if (participante?.licenseCode) {
      return NextResponse.json(
        { success: false, error: 'El participante ya tiene una licencia asignada' },
        { status: 400 }
      );
    }

    // Verificar créditos disponibles usando licensesAvailable de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: director.organizationId },
      select: { licensesAvailable: true },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'No se encontró la organización' },
        { status: 404 }
      );
    }

    const availableCredits = organization.licensesAvailable ?? 0;

    if (availableCredits < 1) {
      return NextResponse.json(
        { success: false, error: 'No hay licencias disponibles. Compra más licencias.' },
        { status: 400 }
      );
    }

    // Generar código de licencia único
    let licenseCode = generateLicenseCode();
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      const existing = await prisma.usuario.findFirst({
        where: { licenseCode },
      });

      if (!existing) {
        isUnique = true;
      } else {
        licenseCode = generateLicenseCode();
        attempts++;
      }
    }

    if (!isUnique) {
      return NextResponse.json(
        { success: false, error: 'Error al generar código único' },
        { status: 500 }
      );
    }

    // Realizar la transacción: asignar licencia y actualizar créditos
    const result = await prisma.$transaction(async (tx) => {
      // Actualizar participante con licencia y tier STANDARD
      // Si es Vision 12 (Tu Vida en Equilibrio), también marcar como graduado
      const updatedParticipante = await tx.usuario.update({
        where: { id: participanteId },
        data: {
          licenseCode,
          tier: 'STANDARD',
          ...(shouldAutoGraduate(visionId) && { isGraduated: true }),
        },
      });

      // Decrementar licensesAvailable en la organización
      await tx.organization.update({
        where: { id: director.organizationId },
        data: {
          licensesAvailable: {
            decrement: 1,
          },
        },
      });

      // Incrementar licensesAllocated en Vision
      await tx.vision.update({
        where: { id: visionId },
        data: {
          licensesAllocated: {
            increment: 1,
          },
        },
      });

      // Crear registro de asignación de licencia (opcional, para auditoría)
      await tx.licenseAssignment.create({
        data: {
          userId: participanteId,
          organizationId: director.organizationId,
          visionId,
          licenseCode,
          assignedBy: session.user.id,
          assignedAt: new Date(),
          isActive: true, // Activada inmediatamente al ser asignada por director
          activatedAt: new Date(),
          expiresAt: vision.endDate, // Expira cuando termina la visión
          notes: 'Licencia asignada manualmente por director'
        },
      });

      return updatedParticipante;
    });

    return NextResponse.json({
      success: true,
      message: 'Licencia asignada exitosamente',
      licenseCode,
      participante: result,
    });
  } catch (error) {
    logger.error('Error assigning license:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar licencia' },
      { status: 500 }
    );
  }
}
