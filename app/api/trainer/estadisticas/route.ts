// API para obtener estadísticas del trainer
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(request: NextRequest) {
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
      return NextResponse.json({ error: 'Solo trainers pueden ver estadísticas' }, { status: 403 });
    }

    // Obtener productos asignados al trainer (directamente o via VisionStaff)
    const productosDirectos = await prisma.schoolProduct.findMany({
      where: { trainerId },
      select: {
        id: true,
        name: true,
        levelType: true,
        trainingStatus: true,
        finishedAt: true,
        visionId: true,
      }
    });

    // Productos via VisionStaff
    const visionStaffAssignments = await prisma.visionStaff.findMany({
      where: {
        userId: trainerId,
        role: { in: ['BASIC_TRAINER', 'ADVANCED_TRAINER', 'PL_TRAINER'] }
      },
      select: { visionId: true, role: true }
    });

    const visionIds = visionStaffAssignments.map(vs => vs.visionId);

    const productosViaStaff = await prisma.schoolProduct.findMany({
      where: {
        visionId: { in: visionIds },
        trainerId: null // Solo los que no tienen trainer directo
      },
      select: {
        id: true,
        name: true,
        levelType: true,
        trainingStatus: true,
        finishedAt: true,
        visionId: true,
      }
    });

    // Combinar y eliminar duplicados
    const todosProductos = [...productosDirectos];
    for (const p of productosViaStaff) {
      if (!todosProductos.find(tp => tp.id === p.id)) {
        todosProductos.push(p);
      }
    }

    // Obtener resultados de fines de semana PL
    const plWeekendResults = await prisma.pLWeekendResult.findMany({
      where: { trainerId },
      include: {
        Product: {
          select: { id: true, name: true }
        }
      },
      orderBy: [
        { productId: 'asc' },
        { weekendNumber: 'asc' }
      ]
    });

    // Calcular estadísticas
    const totalProductos = todosProductos.length;
    const productosCompletados = todosProductos.filter(p => p.trainingStatus === 'COMPLETED').length;
    const productosEnCurso = todosProductos.filter(p => p.trainingStatus === 'IN_PROGRESS').length;

    // Total de participantes y enrollados de los resultados PL
    const totalParticipantes = plWeekendResults.reduce((acc, r) => acc + r.totalParticipants, 0);
    const totalEnrollados = plWeekendResults.reduce((acc, r) => acc + r.totalEnrolled, 0);
    
    // Promedio de porcentaje
    const promedioPercentage = plWeekendResults.length > 0
      ? Math.round(plWeekendResults.reduce((acc, r) => acc + r.percentage, 0) / plWeekendResults.length)
      : 0;

    // Detalle de productos con sus weekends
    const productosDetalle = todosProductos.map(p => ({
      id: p.id,
      name: p.name,
      levelType: p.levelType,
      status: p.trainingStatus || 'PENDING',
      finishedAt: p.finishedAt?.toISOString() || null,
      weekends: plWeekendResults
        .filter(r => r.productId === p.id)
        .map(r => ({
          id: r.id,
          productId: r.productId,
          weekendNumber: r.weekendNumber,
          totalParticipants: r.totalParticipants,
          totalEnrolled: r.totalEnrolled,
          expectedEnrollments: r.expectedEnrollments,
          percentage: r.percentage,
          finishedAt: r.finishedAt.toISOString(),
        }))
    }));

    return NextResponse.json({
      success: true,
      stats: {
        totalProductos,
        productosCompletados,
        productosEnCurso,
        totalParticipantes,
        totalEnrollados,
        promedioPercentage,
        plWeekendResults: plWeekendResults.map(r => ({
          id: r.id,
          productId: r.productId,
          weekendNumber: r.weekendNumber,
          totalParticipants: r.totalParticipants,
          totalEnrolled: r.totalEnrolled,
          expectedEnrollments: r.expectedEnrollments,
          percentage: r.percentage,
          finishedAt: r.finishedAt.toISOString(),
          Product: r.Product,
        })),
        productosDetalle,
      }
    });

  } catch (error) {
    logger.error('Error getting trainer stats:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
