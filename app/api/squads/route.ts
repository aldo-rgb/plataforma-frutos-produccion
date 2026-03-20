import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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

    logger.debug('📦 Creating squad request:', { visionId, level, userId: user.id, orgId: user.organizationId });

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

    // Crear el grupo - usar la organizationId de la visión, no del usuario
    const squad = await prisma.smallGroup.create({
      data: {
        id: crypto.randomUUID(),
        name: groupName,
        visionId: parseInt(visionId),
        leaderId: user.id,
        organizationId: vision.organizationId!,
        productId: productId ? parseInt(productId) : null,
        level: level,
        maxSize: maxSize,
        updatedAt: new Date(),
      },
      include: {
        Usuario: {
          select: { id: true, nombre: true, imagen: true },
        },
        Vision: {
          select: { id: true, nombre: true },
        },
        _count: {
          select: { SmallGroupMember: true },
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
        leader: squad.Usuario,
        vision: squad.Vision,
        membersCount: squad._count.SmallGroupMember,
        createdAt: squad.createdAt,
      },
    });
  } catch (error: any) {
    logger.error('Error creating squad:', error);
    logger.error('Error details:', error?.message, error?.code);
    
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
      
      // Para GC: obtener visiones donde tiene asignación activa
      const now = new Date();
      const gracePeriodDays = 7;
      const cutoffDate = new Date(now);
      cutoffDate.setDate(cutoffDate.getDate() - gracePeriodDays);
      
      // Buscar asignaciones de VisionGameChanger con visiones activas
      const gcAssignments = await prisma.visionGameChanger.findMany({
        where: { gameChangerId: user.id },
        include: {
          Vision: {
            select: {
              id: true,
              isActive: true,
              endDate: true,
              advancedEndDate: true,
              plWeekend3EndDate: true,
            },
          },
        },
      });
      
      // Filtrar visiones que tienen al menos un nivel activo
      const validVisionIds = gcAssignments
        .filter(a => {
          const vision = a.Vision;
          if (!vision?.isActive) return false;
          
          let levelEndDate: Date | null = null;
          if (a.level === 'PL' && vision.plWeekend3EndDate) {
            levelEndDate = new Date(vision.plWeekend3EndDate);
          } else if (a.level === 'ADVANCED' && vision.advancedEndDate) {
            levelEndDate = new Date(vision.advancedEndDate);
          } else if (vision.endDate) {
            levelEndDate = new Date(vision.endDate);
          }
          
          return !levelEndDate || levelEndDate >= cutoffDate;
        })
        .map(a => a.visionId);
      
      // Obtener IDs únicos
      const uniqueVisionIds = [...new Set(validVisionIds)];
      
      logger.debug('📦 squads GET: Valid visions for GC', {
        userId: user.id,
        totalAssignments: gcAssignments.length,
        validVisionIds: uniqueVisionIds,
      });
      
      if (uniqueVisionIds.length > 0) {
        where.visionId = { in: uniqueVisionIds };
      } else {
        // Si no hay visiones válidas, retornar vacío
        return NextResponse.json({
          success: true,
          squads: [],
          total: 0,
        });
      }
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
        Usuario: {
          select: { id: true, nombre: true, imagen: true, email: true },
        },
        Vision: {
          select: { id: true, nombre: true },
        },
        SchoolProduct: {
          select: { id: true, name: true },
        },
        ...(includeMembers && {
          SmallGroupMember: {
            where: { isActive: true },
            include: {
              Usuario_SmallGroupMember_userIdToUsuario: {
                select: { id: true, nombre: true, imagen: true, email: true, telefono: true },
              },
              vision_enrollments: {
                select: { id: true, attendanceStatus: true, level: true },
              },
            },
            orderBy: { joinedAt: 'asc' },
          },
        }),
        _count: {
          select: { SmallGroupMember: { where: { isActive: true } } },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Si se incluyen miembros, obtener la próxima llamada de cada participante
    let nextCallsByParticipant: Record<number, { scheduledDate: Date; scheduledTime: string } | null> = {};
    
    if (includeMembers) {
      const allParticipantIds = squads.flatMap(squad => 
        ((squad as any).SmallGroupMember || []).map((m: any) => m.userId)
      );
      
      if (allParticipantIds.length > 0) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const upcomingCalls = await prisma.gCCallSlot.findMany({
          where: {
            participantId: { in: allParticipantIds },
            scheduledDate: { gte: today },
            status: { in: ['SCHEDULED', 'CONFIRMED'] }
          },
          select: {
            participantId: true,
            scheduledDate: true,
            scheduledTime: true
          },
          orderBy: [
            { scheduledDate: 'asc' },
            { scheduledTime: 'asc' }
          ]
        });
        
        // Agrupar por participante y tomar solo la próxima llamada
        for (const call of upcomingCalls) {
          if (!nextCallsByParticipant[call.participantId]) {
            nextCallsByParticipant[call.participantId] = {
              scheduledDate: call.scheduledDate,
              scheduledTime: call.scheduledTime
            };
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      squads: squads.map((squad) => ({
        id: squad.id,
        name: squad.name,
        level: squad.level,
        maxSize: squad.maxSize,
        isActive: squad.isActive,
        visionId: squad.visionId,
        leader: squad.Usuario,
        vision: squad.Vision,
        product: squad.SchoolProduct,
        membersCount: squad._count.SmallGroupMember,
        isFull: squad._count.SmallGroupMember >= squad.maxSize,
        members: includeMembers ? (squad as any).SmallGroupMember?.map((member: any) => ({
          id: member.id,
          userId: member.userId,
          joinedAt: member.joinedAt,
          isActive: member.isActive,
          user: member.Usuario_SmallGroupMember_userIdToUsuario,
          enrollment: member.vision_enrollments,
          nextCall: nextCallsByParticipant[member.userId] || null
        })) : undefined,
        createdAt: squad.createdAt,
      })),
      total: squads.length,
    });
  } catch (error) {
    logger.error('Error fetching squads:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener Átomos' },
      { status: 500 }
    );
  }
}
