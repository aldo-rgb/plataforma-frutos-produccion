import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST - Mover un usuario a otra visión
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userRole = session.user.rol;
    if (!['SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(userRole as string)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    const sourceVisionId = parseInt(params.id);
    const body = await request.json();
    const { userId, targetVisionId, level } = body;

    if (!userId || !targetVisionId) {
      return NextResponse.json(
        { error: 'userId y targetVisionId son requeridos' },
        { status: 400 }
      );
    }

    const targetVisionIdInt = parseInt(targetVisionId);

    // Verificar que la visión destino existe
    const targetVision = await prisma.vision.findUnique({
      where: { id: targetVisionIdInt },
      select: { id: true, nombre: true, organizationId: true, endDate: true }
    });

    if (!targetVision) {
      return NextResponse.json(
        { error: 'La visión destino no existe' },
        { status: 404 }
      );
    }

    // Verificar que el usuario existe
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) },
      select: { id: true, nombre: true, email: true }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener el enrollment actual
    const currentEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: user.id,
        visionId: sourceVisionId,
        level: level || 'BASIC'
      }
    });

    if (!currentEnrollment) {
      return NextResponse.json(
        { error: 'El usuario no tiene enrollment en la visión origen' },
        { status: 404 }
      );
    }

    // Verificar si ya tiene enrollment en la visión destino
    const existingEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: user.id,
        visionId: targetVisionIdInt,
        level: level || 'BASIC'
      }
    });

    if (existingEnrollment) {
      return NextResponse.json(
        { error: 'El usuario ya tiene enrollment en la visión destino' },
        { status: 400 }
      );
    }

    // Realizar la transacción para mover el usuario
    const result = await prisma.$transaction(async (tx) => {
      // 1. Actualizar el enrollment a la nueva visión
      const updatedEnrollment = await tx.vision_enrollments.update({
        where: { id: currentEnrollment.id },
        data: {
          visionId: targetVisionIdInt,
          coordinatorId: null // Resetear coordinador, se asignará según la nueva visión
        }
      });

      // 2. Mover el ticket si existe
      const ticket = await tx.ticket.findFirst({
        where: {
          ownerId: user.id,
          visionId: sourceVisionId,
          level: level || 'BASIC'
        }
      });

      if (ticket) {
        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            visionId: targetVisionIdInt,
            validUntil: targetVision.endDate
          }
        });
      }

      // 3. Actualizar VisionParticipante si existe
      const visionParticipante = await tx.visionParticipante.findFirst({
        where: {
          participanteId: user.id,
          visionId: sourceVisionId
        }
      });

      if (visionParticipante) {
        await tx.visionParticipante.update({
          where: { id: visionParticipante.id },
          data: { visionId: targetVisionIdInt }
        });
      }

      // 4. Eliminar de grupos pequeños de la visión origen
      await tx.smallGroupMembership.deleteMany({
        where: {
          userId: user.id,
          group: {
            visionId: sourceVisionId
          }
        }
      });

      return {
        enrollment: updatedEnrollment,
        ticketMoved: !!ticket
      };
    });

    console.log(`[MOVE USER] Usuario ${user.nombre} (ID: ${user.id}) movido de Vision ${sourceVisionId} a Vision ${targetVisionIdInt}`);

    return NextResponse.json({
      success: true,
      message: `Usuario ${user.nombre} movido exitosamente a ${targetVision.nombre}`,
      data: result
    });

  } catch (error) {
    console.error('[MOVE USER] Error:', error);
    return NextResponse.json(
      { error: 'Error al mover el usuario' },
      { status: 500 }
    );
  }
}

// GET - Obtener visiones disponibles para mover usuarios
export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const currentVisionId = parseInt(params.id);

    // Obtener la organización de la visión actual
    const currentVision = await prisma.vision.findUnique({
      where: { id: currentVisionId },
      select: { organizationId: true }
    });

    if (!currentVision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Obtener todas las visiones de la misma organización excepto la actual
    const visiones = await prisma.vision.findMany({
      where: {
        organizationId: currentVision.organizationId,
        id: { not: currentVisionId },
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            vision_enrollments: true
          }
        }
      },
      orderBy: { startDate: 'desc' }
    });

    return NextResponse.json({
      success: true,
      visiones: visiones.map(v => ({
        id: v.id,
        nombre: v.nombre,
        startDate: v.startDate,
        endDate: v.endDate,
        enrollmentCount: v._count.vision_enrollments
      }))
    });

  } catch (error) {
    console.error('[GET VISIONES] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener visiones' },
      { status: 500 }
    );
  }
}
