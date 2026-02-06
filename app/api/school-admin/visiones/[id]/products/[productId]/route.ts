import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * PATCH /api/school-admin/visiones/[id]/products/[productId]
 * Actualizar un producto de la visión (activar/desactivar, asignar staff, etc.)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Solo ADMINISTRADOR y SCHOOL_ADMIN pueden modificar productos
    const userRole = session.user.rol as string;
    if (!['ADMINISTRADOR', 'SCHOOL_ADMIN'].includes(userRole)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id, productId } = await params;
    const visionId = parseInt(id);
    const productIdNum = parseInt(productId);

    if (isNaN(visionId) || isNaN(productIdNum)) {
      return NextResponse.json(
        { success: false, error: 'IDs inválidos' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { isActive, coordinatorId, trainerId } = body;

    // Verificar que el producto existe y pertenece a la visión
    const existingProduct = await prisma.schoolProduct.findFirst({
      where: {
        id: productIdNum,
        visionId: visionId
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Construir objeto de actualización
    const updateData: any = {};
    
    if (typeof isActive === 'boolean') {
      updateData.isActive = isActive;
    }
    
    if (coordinatorId !== undefined) {
      updateData.coordinatorId = coordinatorId || null;
    }
    
    if (trainerId !== undefined) {
      updateData.trainerId = trainerId || null;
    }

    // Actualizar el producto
    const updatedProduct = await prisma.schoolProduct.update({
      where: { id: productIdNum },
      data: updateData,
      include: {
        Trainer: {
          select: { id: true, nombre: true, email: true }
        },
        Coordinator: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    logger.info(`Producto ${productIdNum} actualizado:`, updateData);

    return NextResponse.json({
      success: true,
      product: updatedProduct,
      message: 'Producto actualizado correctamente'
    });

  } catch (error) {
    logger.error('Error actualizando producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el producto' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/school-admin/visiones/[id]/products/[productId]
 * Obtener detalles de un producto específico
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { id, productId } = await params;
    const visionId = parseInt(id);
    const productIdNum = parseInt(productId);

    const product = await prisma.schoolProduct.findFirst({
      where: {
        id: productIdNum,
        visionId: visionId
      },
      include: {
        Trainer: {
          select: { id: true, nombre: true, email: true }
        },
        Coordinator: {
          select: { id: true, nombre: true, email: true }
        }
      }
    });

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      product
    });

  } catch (error) {
    logger.error('Error obteniendo producto:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener el producto' },
      { status: 500 }
    );
  }
}
