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

    // Obtener todos los productos de la organización (cualquier SCHOOL_ADMIN puede verlos)
    const products = await prisma.schoolProduct.findMany({
      where: {
        organizationId: user.organizationId,
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
      location,
      videoUrl,
      transferDeadline,
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
        location: location || null,
        videoUrl: videoUrl || null,
        transferDeadline: transferDeadline ? new Date(transferDeadline) : null,
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
      location,
      videoUrl,
      isActive,
      transferDeadline,
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
        location: location !== undefined ? (location || null) : undefined,
        videoUrl: videoUrl !== undefined ? (videoUrl || null) : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
        transferDeadline: transferDeadline !== undefined ? (transferDeadline ? new Date(transferDeadline) : null) : undefined,
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

    // Verificar que el producto pertenece a la organización
    const existingProduct = await prisma.schoolProduct.findFirst({
      where: {
        id: parseInt(id),
        organizationId: user.organizationId!,
      },
      include: {
        Vision: {
          include: {
            _count: {
              select: {
                vision_enrollments: true,
                VisionParticipante: true,
                VisionGameChanger: true,
                VisionMentor: true,
                VisionStaff: true,
              }
            }
          }
        }
      }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    // Si es CORE_TRAINING, verificar que la visión no tenga usuarios registrados
    if (existingProduct.type === 'CORE_TRAINING') {
      if (!existingProduct.Vision) {
        return NextResponse.json(
          { success: false, error: 'Este producto no tiene una visión asociada' },
          { status: 400 }
        );
      }

      const vision = existingProduct.Vision;
      const totalUsuarios = 
        vision._count.vision_enrollments + 
        vision._count.VisionParticipante + 
        vision._count.VisionGameChanger + 
        vision._count.VisionMentor + 
        vision._count.VisionStaff;

      if (totalUsuarios > 0) {
        return NextResponse.json(
          { 
            success: false, 
            error: `No se puede eliminar el entrenamiento porque tiene ${totalUsuarios} usuario(s) registrado(s). Debes eliminar o mover los usuarios primero.`,
            details: {
              enrollments: vision._count.vision_enrollments,
              participantes: vision._count.VisionParticipante,
              gamechangers: vision._count.VisionGameChanger,
              mentores: vision._count.VisionMentor,
              staff: vision._count.VisionStaff
            }
          },
          { status: 400 }
        );
      }

      // Eliminar toda la visión con sus productos asociados
      await prisma.$transaction(async (tx) => {
        // Eliminar todos los productos de la visión
        await tx.schoolProduct.deleteMany({
          where: { visionId: vision.id }
        });

        // Eliminar configuración de comisiones
        await tx.visionCommissionConfig.deleteMany({
          where: { visionId: vision.id }
        });

        // Eliminar coordinator commission config
        await tx.coordinator_commission_config.deleteMany({
          where: { visionId: vision.id }
        });

        // Eliminar escrow
        await tx.visionEscrow.deleteMany({
          where: { visionId: vision.id }
        });

        // Finalmente eliminar la visión
        await tx.vision.delete({
          where: { id: vision.id }
        });
      });

      return NextResponse.json({
        success: true,
        message: `Entrenamiento "${vision.nombre}" y sus productos eliminados correctamente`,
      });
    }

    // Para productos EXTRA_WORKSHOP, eliminar solo el producto
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
