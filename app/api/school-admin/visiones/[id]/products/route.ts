import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/school-admin/visiones/[id]/products
 * Obtener todos los productos de una visión (activos e inactivos)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    const products = await prisma.schoolProduct.findMany({
      where: { visionId },
      include: {
        Trainer: {
          select: { id: true, nombre: true, email: true }
        },
        Coordinator: {
          select: { id: true, nombre: true, email: true }
        }
      },
      orderBy: { levelType: 'asc' }
    });

    return NextResponse.json({
      success: true,
      products
    });

  } catch (error) {
    logger.error('Error obteniendo productos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener productos' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/school-admin/visiones/[id]/products
 * Activar todos los productos de los niveles habilitados en la visión
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Solo ADMINISTRADOR y SCHOOL_ADMIN
    const userRole = session.user.rol as string;
    if (!['ADMINISTRADOR', 'SCHOOL_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const visionId = parseInt(id);

    if (isNaN(visionId)) {
      return NextResponse.json(
        { success: false, error: 'ID de visión inválido' },
        { status: 400 }
      );
    }

    // Obtener la visión con sus niveles habilitados
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { enabledLevels: true }
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Activar todos los productos de los niveles habilitados
    const result = await prisma.schoolProduct.updateMany({
      where: {
        visionId,
        levelType: { in: vision.enabledLevels as any },
        type: 'CORE_TRAINING'
      },
      data: { isActive: true }
    });

    logger.info(`Activados ${result.count} productos para visión ${visionId}`);

    // Obtener productos actualizados
    const products = await prisma.schoolProduct.findMany({
      where: { visionId },
      include: {
        Trainer: { select: { id: true, nombre: true } },
        Coordinator: { select: { id: true, nombre: true } }
      },
      orderBy: { levelType: 'asc' }
    });

    return NextResponse.json({
      success: true,
      message: `${result.count} productos activados`,
      products
    });

  } catch (error) {
    logger.error('Error activando productos:', error);
    return NextResponse.json(
      { success: false, error: 'Error al activar productos' },
      { status: 500 }
    );
  }
}
