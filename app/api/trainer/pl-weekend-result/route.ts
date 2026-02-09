// API para guardar y obtener resultados de fines de semana de Liderato (PL)
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET: Obtener el último fin de semana finalizado para un producto
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');

    if (!productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
    }

    // Obtener el último resultado de fin de semana para este producto
    const lastResult = await prisma.pLWeekendResult.findFirst({
      where: { productId: parseInt(productId) },
      orderBy: { weekendNumber: 'desc' },
      select: {
        id: true,
        weekendNumber: true,
        totalParticipants: true,
        totalEnrolled: true,
        percentage: true,
        finishedAt: true,
      }
    });

    // Obtener todos los resultados para estadísticas
    const allResults = await prisma.pLWeekendResult.findMany({
      where: { productId: parseInt(productId) },
      orderBy: { weekendNumber: 'asc' },
    });

    return NextResponse.json({
      success: true,
      lastWeekendFinished: lastResult?.weekendNumber || 0,
      lastResult,
      allResults,
    });

  } catch (error) {
    logger.error('Error getting PL weekend result:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// POST: Guardar resultado de fin de semana
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const trainerId = Number(session.user.id);

    // Verificar que es TRAINER
    const trainer = await prisma.usuario.findUnique({
      where: { id: trainerId },
      select: { id: true, rol: true, nombre: true }
    });

    if (!trainer || trainer.rol !== 'TRAINER') {
      return NextResponse.json({ error: 'Solo trainers pueden guardar resultados' }, { status: 403 });
    }

    const body = await request.json();
    const { productId, totalParticipants, totalEnrolled, expectedEnrollments, percentage, participantsData } = body;

    if (!productId) {
      return NextResponse.json({ error: 'productId es requerido' }, { status: 400 });
    }

    // Verificar que el producto existe y es PL
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: { id: true, levelType: true, visionId: true }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    if (product.levelType !== 'PL') {
      return NextResponse.json({ error: 'Solo productos de Liderato (PL) pueden tener resultados de fin de semana' }, { status: 400 });
    }

    // Verificar que el trainer está asignado a este producto (via VisionStaff o trainerId)
    let isAssigned = false;
    
    if (product.visionId) {
      const visionStaff = await prisma.visionStaff.findFirst({
        where: {
          visionId: product.visionId,
          userId: trainerId,
          role: 'PL_TRAINER'
        }
      });
      isAssigned = !!visionStaff;
    }

    // También verificar trainerId directo del producto
    const productWithTrainer = await prisma.schoolProduct.findUnique({
      where: { id: productId },
      select: { trainerId: true }
    });
    
    if (productWithTrainer?.trainerId === trainerId) {
      isAssigned = true;
    }

    if (!isAssigned) {
      return NextResponse.json({ error: 'No estás asignado como trainer de este producto' }, { status: 403 });
    }

    // Determinar qué número de fin de semana es
    const lastResult = await prisma.pLWeekendResult.findFirst({
      where: { productId },
      orderBy: { weekendNumber: 'desc' },
    });

    const nextWeekendNumber = (lastResult?.weekendNumber || 0) + 1;

    if (nextWeekendNumber > 3) {
      return NextResponse.json({ error: 'Ya se finalizaron los 3 fines de semana de este Liderato' }, { status: 400 });
    }

    // Crear el resultado
    const result = await prisma.pLWeekendResult.create({
      data: {
        productId,
        trainerId,
        weekendNumber: nextWeekendNumber,
        totalParticipants: totalParticipants || 0,
        totalEnrolled: totalEnrolled || 0,
        expectedEnrollments: expectedEnrollments || 0,
        percentage: percentage || 0,
        participantsData: participantsData || null,
      }
    });

    logger.info(`✅ PL Weekend ${nextWeekendNumber} finalizado - Producto ${productId} - Trainer ${trainer.nombre} - ${percentage}%`);

    // Si es el fin de semana 3, marcar el producto como completado
    if (nextWeekendNumber === 3) {
      await prisma.schoolProduct.update({
        where: { id: productId },
        data: {
          trainingStatus: 'COMPLETED',
          finishedAt: new Date(),
          finishedBy: trainerId,
        }
      });
      logger.info(`🎓 Liderato completado - Producto ${productId}`);
    }

    return NextResponse.json({
      success: true,
      result,
      weekendNumber: nextWeekendNumber,
      isCompleted: nextWeekendNumber === 3,
    });

  } catch (error) {
    logger.error('Error saving PL weekend result:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
