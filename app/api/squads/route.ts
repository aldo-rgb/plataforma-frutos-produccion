import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'GAMECHANGER', 'TRAINER', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/squads
 * Crea un nuevo Átomo (mini-grupo)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true, nombre: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para crear Átomos' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { visionId, productId, name, level = 'BASIC', maxSize = 10 } = body;

    console.log('📦 Creating squad request:', { visionId, level, userId: user.id, orgId: user.organizationId });

    if (!visionId) {
      return NextResponse.json(
        { success: false, error: 'visionId es requerido' },
        { status: 400 }
      );
    }

    // Validar que level sea válido
    const validLevels = ['BASIC', 'ADVANCED', 'PL'];
    if (!validLevels.includes(level)) {
      return NextResponse.json(
        { success: false, error: `Nivel inválido: ${level}. Debe ser BASIC, ADVANCED o PL` },
        { status: 400 }
      );
    }

    // Verificar que la visión existe
    const vision = await prisma.vision.findFirst({
      where: {
        id: parseInt(visionId),
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Para Game Changers, verificar que tienen enrollment en esa visión
    if (user.rol === 'GAMECHANGER') {
      // Buscar en VisionGameChanger
      const gcEnrollment = await prisma.visionGameChanger.findFirst({
        where: {
          gameChangerId: user.id,
          visionId: parseInt(visionId),
        },
      });

      if (!gcEnrollment) {
        return NextResponse.json(
          { success: false, error: 'No tienes asignación como Game Changer en esta visión' },
          { status: 403 }
        );
      }
    } else {
      // Para otros roles, verificar organización
      if (vision.organizationId !== user.organizationId) {
        return NextResponse.json(
          { success: false, error: 'Visión no pertenece a tu organización' },
          { status: 403 }
        );
      }
    }

    // Verificar si ya existe un grupo para este GC en esta visión/nivel
    const existingGroup = await prisma.smallGroup.findFirst({
      where: {
        visionId: parseInt(visionId),
        leaderId: user.id,
        level: level,
        isActive: true,
      },
    });

    if (existingGroup) {
      return NextResponse.json({
        success: true,
        message: 'Ya tienes un grupo activo para este nivel',
        squad: existingGroup,
        isExisting: true,
      });
    }

    // Generar nombre automático si no se proporciona
    const groupName = name || `Átomo ${user.nombre?.split(' ')[0] || 'GC'}`;

    // Crear el grupo
    const squad = await prisma.smallGroup.create({
      data: {
        name: groupName,
        visionId: parseInt(visionId),
        leaderId: user.id,
        organizationId: user.organizationId,
        productId: productId ? parseInt(productId) : null,
        level: level,
        maxSize: maxSize,
      },
      include: {
        leader: {
          select: { id: true, nombre: true, imagen: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
        _count: {
          select: { members: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: `Átomo "${groupName}" creado exitosamente`,
      squad: {
        id: squad.id,
        name: squad.name,
        level: squad.level,
        maxSize: squad.maxSize,
        leader: squad.leader,
        vision: squad.vision,
        membersCount: squad._count.members,
        createdAt: squad.createdAt,
      },
    });
  } catch (error: any) {
    console.error('Error creating squad:', error);
    console.error('Error details:', error?.message, error?.code);
    
    // Devolver mensaje más específico
    let errorMessage = 'Error al crear Átomo';
    if (error?.code === 'P2002') {
      errorMessage = 'Ya tienes un grupo activo para esta visión y nivel';
    } else if (error?.message) {
      errorMessage = `Error: ${error.message}`;
    }
    
    return NextResponse.json(
      { success: false, error: errorMessage },
      { status: 500 }
    );
  }
}

/**
 * GET /api/squads
 * Lista los Átomos
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const productId = searchParams.get('productId');
    const level = searchParams.get('level');
    const leaderId = searchParams.get('leaderId');
    const includeMembers = searchParams.get('includeMembers') === 'true';

    // Construir filtros
    const where: any = {
      isActive: true,
    };

    // Si es GC, solo ver sus grupos
    if (user.rol === 'GAMECHANGER' || user.rol === 'TRAINER') {
      where.leaderId = user.id;
    } else {
      // Para otros roles, filtrar por organización
      where.organizationId = user.organizationId;
      if (leaderId) {
        where.leaderId = parseInt(leaderId);
      }
    }

    if (visionId) where.visionId = parseInt(visionId);
    if (productId) where.productId = parseInt(productId);
    if (level) where.level = level;

    const squads = await prisma.smallGroup.findMany({
      where,
      include: {
        leader: {
          select: { id: true, nombre: true, imagen: true, email: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
        product: {
          select: { id: true, name: true },
        },
        ...(includeMembers && {
          members: {
            where: { isActive: true },
            include: {
              user: {
                select: { id: true, nombre: true, imagen: true, email: true },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
        }),
        _count: {
          select: { members: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      squads: squads.map((squad) => ({
        id: squad.id,
        name: squad.name,
        level: squad.level,
        maxSize: squad.maxSize,
        isActive: squad.isActive,
        leader: squad.leader,
        vision: squad.vision,
        product: squad.product,
        membersCount: squad._count.members,
        isFull: squad._count.members >= squad.maxSize,
        members: includeMembers ? squad.members : undefined,
        createdAt: squad.createdAt,
      })),
      total: squads.length,
    });
  } catch (error) {
    console.error('Error fetching squads:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener Átomos' },
      { status: 500 }
    );
  }
}
