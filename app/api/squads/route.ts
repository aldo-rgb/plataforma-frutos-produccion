import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'GAMECHANGER', 'TRAINER', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/squads
 * Crea un nuevo escuadrón
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
        { success: false, error: 'No tienes permisos para crear escuadrones' },
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

    if (!visionId) {
      return NextResponse.json(
        { success: false, error: 'visionId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que la visión existe y pertenece a la organización
    const vision = await prisma.vision.findFirst({
      where: {
        id: parseInt(visionId),
        organizationId: user.organizationId,
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
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
    const groupName = name || `Escuadrón ${user.nombre?.split(' ')[0] || 'GC'}`;

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
      message: `Escuadrón "${groupName}" creado exitosamente`,
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
  } catch (error) {
    console.error('Error creating squad:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear escuadrón' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/squads
 * Lista los escuadrones
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
      organizationId: user.organizationId,
      isActive: true,
    };

    // Si es GC, solo ver sus grupos (a menos que sea admin/coordinador)
    if (user.rol === 'GAMECHANGER' || user.rol === 'TRAINER') {
      where.leaderId = user.id;
    } else if (leaderId) {
      where.leaderId = parseInt(leaderId);
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
      { success: false, error: 'Error al obtener escuadrones' },
      { status: 500 }
    );
  }
}
