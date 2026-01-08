import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener todos los productos de la organización
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para acceder a esta sección' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    // Obtener solo los productos creados por este director (schoolAdmin)
    const products = await prisma.schoolProduct.findMany({
      where: {
        organizationId: user.organizationId,
        createdBy: session.user.id, // Filtrar por el ID del director que los creó
      },
      include: {
        Organization: {
          select: {
            logoUrl: true,
          },
        },
      },
      orderBy: [
        { type: 'asc' }, // CORE primero, luego EXTRA
        { levelType: 'asc' }, // BASIC, ADVANCED, PL, NONE
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      products,
    });
  } catch (error) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener los productos' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo producto
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      imageUrl,
      type,
      levelType,
      basePrice,
      promoPrice,
      promoDeadline,
      startDate,
      endDate,
      maxCapacity,
    } = body;

    // Validaciones
    if (!name || !type || basePrice === undefined) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Crear el producto
    const product = await prisma.schoolProduct.create({
      data: {
        organizationId: user.organizationId,
        name,
        description,
        imageUrl,
        type,
        levelType: levelType || 'NONE',
        basePrice: parseFloat(basePrice),
        promoPrice: promoPrice ? parseFloat(promoPrice) : null,
        promoDeadline: promoDeadline ? new Date(promoDeadline) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        maxCapacity: maxCapacity ? parseInt(maxCapacity) : null,
        createdBy: session.user.id,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Producto creado correctamente',
      product,
    });
  } catch (error) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear el producto' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar un producto
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const {
      id,
      name,
      description,
      imageUrl,
      basePrice,
      promoPrice,
      promoDeadline,
      startDate,
      endDate,
      maxCapacity,
      isActive,
    } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del producto requerido' },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece a la organización
    const existingProduct = await prisma.schoolProduct.findFirst({
      where: {
        id: parseInt(id),
        organizationId: user.organizationId!,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Actualizar el producto
    const updatedProduct = await prisma.schoolProduct.update({
      where: { id: parseInt(id) },
      data: {
        name: name !== undefined ? name : undefined,
        description: description !== undefined ? description : undefined,
        imageUrl: imageUrl !== undefined ? imageUrl : undefined,
        basePrice: basePrice !== undefined ? parseFloat(basePrice) : undefined,
        promoPrice: promoPrice !== undefined ? (promoPrice ? parseFloat(promoPrice) : null) : undefined,
        promoDeadline: promoDeadline !== undefined ? (promoDeadline ? new Date(promoDeadline) : null) : undefined,
        startDate: startDate !== undefined ? (startDate ? new Date(startDate) : null) : undefined,
        endDate: endDate !== undefined ? (endDate ? new Date(endDate) : null) : undefined,
        maxCapacity: maxCapacity !== undefined ? (maxCapacity ? parseInt(maxCapacity) : null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Producto actualizado correctamente',
      product: updatedProduct,
    });
  } catch (error) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el producto' },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar un producto
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'ID del producto requerido' },
        { status: 400 }
      );
    }

    // Verificar que el producto pertenece a la organización y es EXTRA (no se pueden eliminar CORE)
    const existingProduct = await prisma.schoolProduct.findFirst({
      where: {
        id: parseInt(id),
        organizationId: user.organizationId!,
      },
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    if (existingProduct.type === 'CORE_TRAINING') {
      return NextResponse.json(
        { success: false, error: 'No se pueden eliminar productos del core (Básico, Avanzado, PL)' },
        { status: 400 }
      );
    }

    // Eliminar el producto
    await prisma.schoolProduct.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({
      success: true,
      message: 'Producto eliminado correctamente',
    });
  } catch (error) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: 'Error al eliminar el producto' },
      { status: 500 }
    );
  }
}
