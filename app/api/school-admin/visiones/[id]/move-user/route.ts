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
    const { userId, targetVisionId, level, moveAllLevels = true } = body;

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
      select: { id: true, nombre: true, organizationId: true, endDate: true, advancedEndDate: true, plWeekend3EndDate: true }
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

    // Obtener TODOS los enrollments del usuario en la visión origen
    const currentEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: user.id,
        visionId: sourceVisionId,
        ...(moveAllLevels ? {} : { level: level || 'BASIC' })
      }
    });

    if (currentEnrollments.length === 0) {
      return NextResponse.json(
        { error: 'El usuario no tiene enrollment en la visión origen' },
        { status: 404 }
      );
    }

    // Obtener los niveles que se van a mover
    const levelsToMove = currentEnrollments.map(e => e.level);

    // Verificar si ya tiene algún enrollment en la visión destino para los niveles a mover
    const existingEnrollments = await prisma.vision_enrollments.findMany({
      where: {
        userId: user.id,
        visionId: targetVisionIdInt,
        level: { in: levelsToMove }
      }
    });

    if (existingEnrollments.length > 0) {
      const existingLevels = existingEnrollments.map(e => e.level).join(', ');
      return NextResponse.json(
        { error: `El usuario ya tiene enrollment en la visión destino para: ${existingLevels}` },
        { status: 400 }
      );
    }

    // Realizar la transacción para mover el usuario
    const result = await prisma.$transaction(async (tx) => {
      const movedEnrollments = [];
      const movedTickets = [];

      // 1. Actualizar TODOS los enrollments a la nueva visión
      for (const enrollment of currentEnrollments) {
        const updatedEnrollment = await tx.vision_enrollments.update({
          where: { id: enrollment.id },
          data: {
            visionId: targetVisionIdInt,
            coordinatorId: null, // Resetear coordinador
            updatedAt: new Date()
          }
        });
        movedEnrollments.push(updatedEnrollment);
      }

      // 2. Mover TODOS los tickets que correspondan
      const tickets = await tx.ticket.findMany({
        where: {
          ownerId: user.id,
          visionId: sourceVisionId,
          level: { in: levelsToMove }
        }
      });

      for (const ticket of tickets) {
        // Determinar la fecha de validez según el nivel
        let validUntil = targetVision.endDate;
        if (ticket.level === 'ADVANCED' && targetVision.advancedEndDate) {
          validUntil = targetVision.advancedEndDate;
        } else if (ticket.level === 'PL' && targetVision.plWeekend3EndDate) {
          validUntil = targetVision.plWeekend3EndDate;
        }

        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            visionId: targetVisionIdInt,
            validUntil: validUntil
          }
        });
        movedTickets.push(ticket.level);
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
        enrollmentsMoved: movedEnrollments.length,
        ticketsMoved: movedTickets,
        levelsMoved: levelsToMove
      };
    });

    console.log(`[MOVE USER] Usuario ${user.nombre} (ID: ${user.id}) movido de Vision ${sourceVisionId} a Vision ${targetVisionIdInt}. Niveles: ${result.levelsMoved.join(', ')}`);

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
