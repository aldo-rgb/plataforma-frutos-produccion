import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener productos de playeras de la visión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar acceso a la visión
    const hasAccess = await checkVisionAccess(userId, parseInt(visionId));
    if (!hasAccess.allowed) {
      return NextResponse.json({ error: hasAccess.error }, { status: 403 });
    }

    // Obtener todos los productos de playeras de la visión
    const products = await prisma.tribeShirtProduct.findMany({
      where: { visionId: parseInt(visionId) },
      include: {
        TribeShirtPayment: {
          include: {
            Usuario_TribeShirtPayment_userIdToUsuario: {
              select: { id: true, nombre: true, email: true, profileImage: true }
            },
            Usuario_TribeShirtPayment_verifiedByIdToUsuario: {
              select: { id: true, nombre: true }
            }
          }
        },
        Usuario: {
          select: { id: true, nombre: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener miembros de AMBAS fuentes: vision_enrollments Y VisionParticipante
    const visionEnrollments = await prisma.vision_enrollments.findMany({
      where: { 
        visionId: parseInt(visionId),
        enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        }
      },
      distinct: ['userId']
    });

    const visionParticipantes = await prisma.visionParticipante.findMany({
      where: { visionId: parseInt(visionId) },
      include: {
        Usuario_VisionParticipante_participanteIdToUsuario: {
          select: { id: true, nombre: true, email: true, profileImage: true }
        }
      }
    });

    // Combinar miembros de ambas fuentes (sin duplicados)
    const memberMap = new Map<number, { id: number; nombre: string; email: string; profileImage: string | null }>();
    
    visionEnrollments.forEach(ve => {
      const user = ve.Usuario_vision_enrollments_userIdToUsuario;
      if (!memberMap.has(user.id)) {
        memberMap.set(user.id, {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          profileImage: user.profileImage
        });
      }
    });
    
    visionParticipantes.forEach(vp => {
      const user = vp.Usuario_VisionParticipante_participanteIdToUsuario;
      if (!memberMap.has(user.id)) {
        memberMap.set(user.id, {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          profileImage: user.profileImage
        });
      }
    });

    const members = Array.from(memberMap.values());

    // Obtener tallas de los votos de encuestas LOGO (para sugerir tallas)
    const logoPolls = await prisma.tribePoll.findMany({
      where: { 
        visionId: parseInt(visionId),
        category: 'LOGO'
      },
      include: {
        votes: {
          where: { shirtSize: { not: null } },
          select: { userId: true, shirtSize: true }
        }
      }
    });

    // Mapear tallas por usuario (usar la más reciente)
    const memberSizes: Record<number, string> = {};
    logoPolls.forEach(poll => {
      poll.votes.forEach((vote: any) => {
        if (vote.shirtSize) {
          memberSizes[vote.userId] = vote.shirtSize;
        }
      });
    });

    // Formatear productos con estadísticas
    const formattedProducts = products.map(product => {
      const payments = product.TribeShirtPayment;
      const totalPaid = payments.filter(p => p.isPaid).reduce((sum, p) => sum + Number(p.totalAmount), 0);
      const totalPending = payments.filter(p => !p.isPaid).reduce((sum, p) => sum + Number(p.totalAmount), 0);
      const paidCount = payments.filter(p => p.isPaid).length;
      const pendingCount = payments.filter(p => !p.isPaid).length;
      const deliveredCount = payments.filter(p => p.deliveredAt).length;

      return {
        id: product.id,
        name: product.name,
        description: product.description,
        price: Number(product.price),
        imageUrl: product.imageUrl,
        isActive: product.isActive,
        createdAt: product.createdAt,
        createdBy: product.Usuario,
        payments: payments.map(p => ({
          id: p.id,
          userId: p.userId,
          user: p.Usuario_TribeShirtPayment_userIdToUsuario,
          size: p.size,
          quantity: p.quantity,
          totalAmount: Number(p.totalAmount),
          isPaid: p.isPaid,
          paidAt: p.paidAt,
          verifiedBy: p.Usuario_TribeShirtPayment_verifiedByIdToUsuario,
          proofImage: p.proofImage,
          deliveredAt: p.deliveredAt,
          notes: p.notes
        })),
        stats: {
          totalPaid,
          totalPending,
          paidCount,
          pendingCount,
          deliveredCount,
          totalMembers: payments.length,
          progress: payments.length > 0 ? Math.round((paidCount / payments.length) * 100) : 0
        }
      };
    });

    return NextResponse.json({
      success: true,
      products: formattedProducts,
      members,
      memberSizes,
      isTreasurer: hasAccess.isTreasurer
    });

  } catch (error) {
    logger.error('Error al obtener productos de playeras:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear producto de playera o gestionar pagos
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { action, visionId, ...data } = await request.json();

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar que el usuario es tesorero
    const hasAccess = await checkVisionAccess(userId, parseInt(visionId));
    if (!hasAccess.isTreasurer) {
      return NextResponse.json({ error: 'Solo el Tesorero puede realizar esta acción' }, { status: 403 });
    }

    switch (action) {
      case 'create_product': {
        const { name, description, price, imageUrl, memberIds } = data;

        if (!name || !price || price <= 0) {
          return NextResponse.json({ error: 'Nombre y precio válido requeridos' }, { status: 400 });
        }

        // Crear producto
        const product = await prisma.tribeShirtProduct.create({
          data: {
            visionId: parseInt(visionId),
            name,
            description,
            price: parseFloat(price),
            imageUrl,
            createdById: userId
          }
        });

        // Si se proporcionan miembros, crear los pagos pendientes
        if (memberIds && Array.isArray(memberIds) && memberIds.length > 0) {
          // Obtener tallas guardadas si existen
          const logoPolls = await prisma.tribePoll.findMany({
            where: { 
              visionId: parseInt(visionId),
              category: 'LOGO'
            },
            include: {
              votes: {
                where: { 
                  shirtSize: { not: null },
                  userId: { in: memberIds }
                },
                select: { userId: true, shirtSize: true }
              }
            }
          });

          const memberSizes: Record<number, string> = {};
          logoPolls.forEach(poll => {
            poll.votes.forEach((vote: any) => {
              if (vote.shirtSize) {
                memberSizes[vote.userId] = vote.shirtSize;
              }
            });
          });

          await prisma.tribeShirtPayment.createMany({
            data: memberIds.map((memberId: number) => ({
              shirtProductId: product.id,
              userId: memberId,
              size: memberSizes[memberId] || null,
              quantity: 1,
              totalAmount: parseFloat(price),
              isPaid: false
            }))
          });
        }

        return NextResponse.json({
          success: true,
          product,
          message: 'Producto creado correctamente'
        });
      }

      case 'add_members_to_product': {
        const { productId, memberIds } = data;

        if (!productId || !memberIds || !Array.isArray(memberIds)) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Obtener el producto
        const product = await prisma.tribeShirtProduct.findUnique({
          where: { id: productId }
        });

        if (!product) {
          return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
        }

        // Obtener pagos existentes
        const existingPayments = await prisma.tribeShirtPayment.findMany({
          where: { shirtProductId: productId },
          select: { userId: true }
        });
        const existingUserIds = existingPayments.map(p => p.userId);

        const newMembers = memberIds.filter((id: number) => !existingUserIds.includes(id));

        if (newMembers.length > 0) {
          // Obtener tallas guardadas
          const logoPolls = await prisma.tribePoll.findMany({
            where: { 
              visionId: parseInt(visionId),
              category: 'LOGO'
            },
            include: {
              votes: {
                where: { 
                  shirtSize: { not: null },
                  userId: { in: newMembers }
                },
                select: { userId: true, shirtSize: true }
              }
            }
          });

          const memberSizes: Record<number, string> = {};
          logoPolls.forEach(poll => {
            poll.votes.forEach((vote: any) => {
              if (vote.shirtSize) {
                memberSizes[vote.userId] = vote.shirtSize;
              }
            });
          });

          await prisma.tribeShirtPayment.createMany({
            data: newMembers.map((memberId: number) => ({
              shirtProductId: productId,
              userId: memberId,
              size: memberSizes[memberId] || null,
              quantity: 1,
              totalAmount: Number(product.price),
              isPaid: false
            }))
          });
        }

        return NextResponse.json({
          success: true,
          addedCount: newMembers.length,
          message: `${newMembers.length} miembros agregados`
        });
      }

      case 'toggle_payment': {
        const { productId, memberId, isPaid, size } = data;

        if (!productId || !memberId) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        // Buscar o crear el registro de pago
        const existingPayment = await prisma.tribeShirtPayment.findUnique({
          where: {
            shirtProductId_userId: {
              shirtProductId: productId,
              userId: memberId
            }
          }
        });

        if (!existingPayment) {
          // Si no existe, obtener el precio del producto y crear
          const product = await prisma.tribeShirtProduct.findUnique({
            where: { id: productId }
          });

          if (!product) {
            return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
          }

          await prisma.tribeShirtPayment.create({
            data: {
              shirtProductId: productId,
              userId: memberId,
              size: size || null,
              quantity: 1,
              totalAmount: Number(product.price),
              isPaid: isPaid,
              paidAt: isPaid ? new Date() : null,
              verifiedById: isPaid ? userId : null
            }
          });
        } else {
          // Actualizar existente
          await prisma.tribeShirtPayment.update({
            where: { id: existingPayment.id },
            data: {
              isPaid,
              paidAt: isPaid ? new Date() : null,
              verifiedById: isPaid ? userId : null,
              ...(size && { size })
            }
          });
        }

        return NextResponse.json({
          success: true,
          message: isPaid ? 'Pago registrado' : 'Pago desmarcado'
        });
      }

      case 'toggle_delivered': {
        const { productId, memberId, delivered } = data;

        if (!productId || !memberId) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        const existingPayment = await prisma.tribeShirtPayment.findUnique({
          where: {
            shirtProductId_userId: {
              shirtProductId: productId,
              userId: memberId
            }
          }
        });

        if (!existingPayment) {
          return NextResponse.json({ error: 'Pago no encontrado' }, { status: 404 });
        }

        await prisma.tribeShirtPayment.update({
          where: { id: existingPayment.id },
          data: {
            deliveredAt: delivered ? new Date() : null
          }
        });

        return NextResponse.json({
          success: true,
          message: delivered ? 'Entrega registrada' : 'Entrega desmarcada'
        });
      }

      case 'update_size': {
        const { productId, memberId, size } = data;

        if (!productId || !memberId || !size) {
          return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 });
        }

        await prisma.tribeShirtPayment.update({
          where: {
            shirtProductId_userId: {
              shirtProductId: productId,
              userId: memberId
            }
          },
          data: { size }
        });

        return NextResponse.json({
          success: true,
          message: 'Talla actualizada'
        });
      }

      case 'delete_product': {
        const { productId } = data;

        if (!productId) {
          return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
        }

        await prisma.tribeShirtProduct.delete({
          where: { id: productId }
        });

        return NextResponse.json({
          success: true,
          message: 'Producto eliminado'
        });
      }

      case 'toggle_product_active': {
        const { productId, isActive } = data;

        if (!productId) {
          return NextResponse.json({ error: 'productId requerido' }, { status: 400 });
        }

        await prisma.tribeShirtProduct.update({
          where: { id: productId },
          data: { isActive }
        });

        return NextResponse.json({
          success: true,
          message: isActive ? 'Producto activado' : 'Producto archivado'
        });
      }

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    logger.error('Error en productos de playeras:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// Helper para verificar acceso a la visión
async function checkVisionAccess(userId: number, visionId: number) {
  // Verificar si es tesorero
  const treasurerAssignment = await prisma.tribeCaptainAssignment.findFirst({
    where: {
      userId,
      status: 'ACCEPTED',
      captaincy: {
        visionId,
        roleType: 'TREASURER'
      }
    }
  });

  // Verificar si es Capitán de Tribu o Co-Capitán
  const isTribeCaptainOrCoCaptain = await prisma.tribeCaptainAssignment.findFirst({
    where: {
      userId,
      status: 'ACCEPTED',
      captaincy: {
        visionId,
        roleType: { in: ['TRIBE_CAPTAIN', 'TRIBE_CO_CAPTAIN'] }
      }
    }
  });

  // Verificar si es staff
  const isStaff = await prisma.visionStaff.findFirst({
    where: { userId, visionId }
  });

  // Verificar si es coordinador
  const vision = await prisma.vision.findUnique({
    where: { id: visionId },
    select: { coordinadorId: true }
  });

  const isTreasurer = !!treasurerAssignment || !!isTribeCaptainOrCoCaptain;
  const allowed = isTreasurer || !!isStaff || vision?.coordinadorId === userId;

  return {
    allowed,
    isTreasurer,
    error: allowed ? null : 'No tienes acceso a esta visión'
  };
}
