import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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

    // Verificar que el usuario está en la visión (puede ser participante o game changer)
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

    if (!visionParticipante && !visionGameChanger) {
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

    // Verificar créditos disponibles
    const schoolCredit = await prisma.schoolCredit.findFirst({
      where: {
        organizationId: director.organizationId,
        isActive: true,
      },
    });

    if (!schoolCredit) {
      return NextResponse.json(
        { success: false, error: 'No se encontró registro de créditos' },
        { status: 404 }
      );
    }

    const availableCredits = schoolCredit.totalPurchased - schoolCredit.totalAllocated;

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
      // Actualizar participante con licencia y tier PREMIUM
      const updatedParticipante = await tx.usuario.update({
        where: { id: participanteId },
        data: {
          licenseCode,
          tier: 'PREMIUM',
        },
      });

      // Incrementar totalAllocated en SchoolCredit
      await tx.schoolCredit.update({
        where: { id: schoolCredit.id },
        data: {
          totalAllocated: {
            increment: 1,
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
    console.error('Error assigning license:', error);
    return NextResponse.json(
      { success: false, error: 'Error al asignar licencia' },
      { status: 500 }
    );
  }
}
