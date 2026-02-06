import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// API para que el TRAINER finalice un entrenamiento
// Solo puede finalizar el día del endDate

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const trainer = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, nombre: true }
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo TRAINER puede finalizar entrenamientos
    if (trainer.rol !== 'TRAINER') {
      return NextResponse.json({ 
        error: 'Solo el TRAINER puede finalizar entrenamientos' 
      }, { status: 403 });
    }

    const body = await request.json();
    const { productId } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
    }

    // Buscar el producto
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        trainerId: true,
        endDate: true,
        trainingStatus: true,
        levelType: true,
        plWeekend3EndDate: true
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Verificar que el TRAINER está asignado a este producto
    if (product.trainerId !== trainer.id) {
      return NextResponse.json({ 
        error: 'No eres el TRAINER asignado a este entrenamiento' 
      }, { status: 403 });
    }

    // Verificar que el entrenamiento está en progreso
    if (product.trainingStatus === 'COMPLETED') {
      return NextResponse.json({ 
        error: 'Este entrenamiento ya fue finalizado' 
      }, { status: 400 });
    }

    if (product.trainingStatus !== 'IN_PROGRESS') {
      return NextResponse.json({ 
        error: 'Solo puedes finalizar entrenamientos que están en progreso' 
      }, { status: 400 });
    }

    // Determinar la fecha de fin según el tipo de producto
    let relevantEndDate = product.endDate;
    if (product.levelType === 'PL' && product.plWeekend3EndDate) {
      relevantEndDate = product.plWeekend3EndDate;
    }

    if (!relevantEndDate) {
      return NextResponse.json({ 
        error: 'Este producto no tiene fecha de finalización configurada' 
      }, { status: 400 });
    }

    // Verificar que estamos en el día del endDate
    const now = new Date();
    const endDateStart = new Date(relevantEndDate);
    endDateStart.setHours(0, 0, 0, 0);
    
    const endDateEnd = new Date(relevantEndDate);
    endDateEnd.setHours(23, 59, 59, 999);

    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    if (todayStart < endDateStart) {
      const daysRemaining = Math.ceil((endDateStart.getTime() - todayStart.getTime()) / (1000 * 60 * 60 * 24));
      return NextResponse.json({ 
        error: `Solo puedes finalizar el día del fin del entrenamiento. Faltan ${daysRemaining} día(s).`,
        endDate: relevantEndDate
      }, { status: 400 });
    }

    // Actualizar el producto
    const updatedProduct = await prisma.schoolProduct.update({
      where: { id: productId },
      data: {
        trainingStatus: 'COMPLETED',
        finishedAt: now,
        finishedBy: trainer.id,
        updatedAt: now
      }
    });

    // === SISTEMA DE CIERRE DE ENTRENAMIENTO ===
    
    // 1. Bloquear a todos los Game Changers de esta visión
    if (product.visionId) {
      const gameChangers = await prisma.visionGameChanger.findMany({
        where: { visionId: product.visionId },
        select: { gameChangerId: true }
      });

      for (const gc of gameChangers) {
        await prisma.gameChangerLockStatus.upsert({
          where: {
            productId_gameChangerId: {
              productId,
              gameChangerId: gc.gameChangerId
            }
          },
          update: {
            isLocked: true,
            surveyCompleted: false
          },
          create: {
            productId,
            gameChangerId: gc.gameChangerId,
            isLocked: true,
            surveyCompleted: false
          }
        });

        // Notificar al Game Changer
        await prisma.notification.create({
          data: {
            userId: gc.gameChangerId,
            type: 'OTHER',
            title: '🔒 Misión Finalizada',
            message: `El entrenamiento "${product.name}" ha finalizado. Completa tus asignaciones de llamadas para desbloquear.`,
            relatedId: productId
          }
        });
      }

      logger.debug(`🔒 ${gameChangers.length} Game Changers bloqueados para encuesta`);
    }

    // 2. Notificar al Director/Coordinador para auditoría
    const productWithOrg = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      include: {
        Organization: {
          include: {
            Usuario_Organization_schoolAdminIdToUsuario: {
              select: { id: true }
            }
          }
        },
        Coordinator: {
          select: { id: true }
        }
      }
    });

    // Notificar al admin de la escuela (Director)
    if (productWithOrg?.Organization?.Usuario_Organization_schoolAdminIdToUsuario?.id) {
      await prisma.notification.create({
        data: {
          userId: productWithOrg.Organization.Usuario_Organization_schoolAdminIdToUsuario.id,
          type: 'OTHER',
          title: '📋 Auditoría Requerida',
          message: `El entrenamiento "${product.name}" ha finalizado. Requiere auditoría de calidad.`,
          relatedId: productId
        }
      });
    }

    // Notificar al Coordinador
    if (productWithOrg?.Coordinator?.id) {
      await prisma.notification.create({
        data: {
          userId: productWithOrg.Coordinator.id,
          type: 'OTHER',
          title: '✅ Entrenamiento Finalizado',
          message: `El TRAINER ha finalizado "${product.name}". Las encuestas de cierre están activas.`,
          relatedId: productId
        }
      });
    }

    // 3. Crear notificación para el Trainer (encuesta)
    await prisma.notification.create({
      data: {
        userId: trainer.id,
        type: 'OTHER',
        title: '🎉 ¡Entrenamiento Finalizado!',
        message: `Finalizaste "${product.name}" exitosamente. Completa tu encuesta de cierre.`,
        relatedId: productId
      }
    });

    logger.debug(`✅ Entrenamiento "${product.name}" finalizado por TRAINER ${trainer.nombre}`);

    return NextResponse.json({
      success: true,
      message: 'Entrenamiento finalizado correctamente',
      product: {
        id: updatedProduct.id,
        name: product.name,
        trainingStatus: updatedProduct.trainingStatus,
        finishedAt: updatedProduct.finishedAt,
        finishedBy: trainer.nombre
      },
      // Indicar que debe mostrar la encuesta
      showSurvey: true
    });

  } catch (error: any) {
    logger.error('❌ Error finalizando entrenamiento:', error);
    return NextResponse.json(
      { error: 'Error al finalizar entrenamiento', message: error?.message },
      { status: 500 }
    );
  }
}

// GET para verificar si puede finalizar
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
    }

    const trainer = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!trainer || trainer.rol !== 'TRAINER') {
      return NextResponse.json({ canFinish: false, reason: 'No eres TRAINER' });
    }

    const product = await prisma.schoolProduct.findUnique({
      where: { id: parseInt(productId) },
      select: {
        id: true,
        trainerId: true,
        endDate: true,
        trainingStatus: true,
        levelType: true,
        plWeekend3EndDate: true
      }
    });

    if (!product) {
      return NextResponse.json({ canFinish: false, reason: 'Producto no encontrado' });
    }

    if (product.trainerId !== trainer.id) {
      return NextResponse.json({ canFinish: false, reason: 'No eres el TRAINER asignado' });
    }

    if (product.trainingStatus === 'COMPLETED') {
      return NextResponse.json({ canFinish: false, reason: 'Ya fue finalizado' });
    }

    if (product.trainingStatus !== 'IN_PROGRESS') {
      return NextResponse.json({ canFinish: false, reason: 'No está en progreso' });
    }

    let relevantEndDate = product.endDate;
    if (product.levelType === 'PL' && product.plWeekend3EndDate) {
      relevantEndDate = product.plWeekend3EndDate;
    }

    if (!relevantEndDate) {
      return NextResponse.json({ canFinish: false, reason: 'Sin fecha de fin' });
    }

    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);
    
    const endDateStart = new Date(relevantEndDate);
    endDateStart.setHours(0, 0, 0, 0);

    const isEndDate = todayStart.getTime() === endDateStart.getTime();
    const isPastEndDate = todayStart.getTime() > endDateStart.getTime();

    return NextResponse.json({
      canFinish: isEndDate || isPastEndDate,
      isEndDate,
      isPastEndDate,
      endDate: relevantEndDate,
      reason: isEndDate ? 'Hoy es el día de finalización' : 
              isPastEndDate ? 'Ya pasó la fecha de fin' :
              'Aún no es el día de finalización'
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: 'Error', message: error?.message },
      { status: 500 }
    );
  }
}
