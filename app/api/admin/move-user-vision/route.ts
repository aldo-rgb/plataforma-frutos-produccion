import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Solo ADMINISTRADOR puede mover usuarios entre visiones
    if (session.user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Solo administradores pueden realizar esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, fromVisionId, toVisionId, level } = body;

    if (!userId || !fromVisionId || !toVisionId) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
    }

    // Verificar que la visión destino existe
    const targetVision = await prisma.vision.findUnique({
      where: { id: toVisionId },
      select: { id: true, nombre: true, organizationId: true }
    });

    if (!targetVision) {
      return NextResponse.json({ error: 'Visión destino no encontrada' }, { status: 404 });
    }

    // Obtener el producto destino del mismo nivel
    const targetProduct = await prisma.schoolProduct.findFirst({
      where: {
        visionId: toVisionId,
        levelType: level
      },
      select: { id: true }
    });

    if (!targetProduct) {
      return NextResponse.json({ 
        error: `No existe un producto de nivel ${level} en la visión destino` 
      }, { status: 400 });
    }

    // Obtener el producto origen
    const sourceProduct = await prisma.schoolProduct.findFirst({
      where: {
        visionId: fromVisionId,
        levelType: level
      },
      select: { id: true }
    });

    // Usar transacción para mover todos los datos
    await prisma.$transaction(async (tx) => {
      // 1. Actualizar vision_enrollments
      await tx.vision_enrollments.updateMany({
        where: {
          userId: userId,
          visionId: fromVisionId,
          level: level
        },
        data: {
          visionId: toVisionId
        }
      });

      // 2. Actualizar tickets
      await tx.ticket.updateMany({
        where: {
          ownerId: userId,
          visionId: fromVisionId,
          level: level
        },
        data: {
          visionId: toVisionId
        }
      });

      // 3. Actualizar check-in records si existe producto origen
      if (sourceProduct) {
        await tx.checkInRecord.updateMany({
          where: {
            userId: userId,
            productId: sourceProduct.id
          },
          data: {
            productId: targetProduct.id
          }
        });
      }

      // 4. Si es Game Changer, actualizar VisionGameChanger
      await tx.visionGameChanger.updateMany({
        where: {
          gameChangerId: userId,
          visionId: fromVisionId
        },
        data: {
          visionId: toVisionId
        }
      });

      // 5. Actualizar la organización del usuario si es diferente
      if (targetVision.organizationId) {
        await tx.usuario.update({
          where: { id: userId },
          data: { organizationId: targetVision.organizationId }
        });
      }

      // 6. Registrar el movimiento en el log
      logger.debug(`[MOVE-VISION] Usuario ${userId} movido de visión ${fromVisionId} a ${toVisionId} (nivel ${level}) por admin ${session.user.id}`);
    });

    return NextResponse.json({
      success: true,
      message: `Usuario movido exitosamente a ${targetVision.nombre}`
    });

  } catch (error: any) {
    logger.error('Error moving user between visions:', error);
    return NextResponse.json(
      { error: 'Error al mover usuario', details: error?.message },
      { status: 500 }
    );
  }
}
