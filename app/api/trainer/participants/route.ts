import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener participantes del trainer actual
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get('productId');
    const visionId = searchParams.get('visionId');
    const excludeWithMetamorfosis = searchParams.get('excludeWithMetamorfosis') === 'true';

    // Obtener el trainer y sus productos asignados
    const trainer = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        organizationId: true,
        rol: true
      }
    });

    if (!trainer) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si necesitamos excluir participantes con metamorfosis activa, obtener sus IDs
    let participantsWithActiveMetamorfosis: number[] = [];
    if (excludeWithMetamorfosis) {
      // Excluir CUALQUIER participante con metamorfosis activa (sin importar visión)
      // Status activos: SENT (enviada) y VIEWED (vista pero no completada)
      const activeAssignments = await prisma.metamorfosisAssignment.findMany({
        where: {
          status: { in: ['SENT', 'VIEWED'] }
        },
        select: { participantId: true },
        distinct: ['participantId']
      });
      participantsWithActiveMetamorfosis = activeAssignments.map(a => a.participantId);
    }

    // Construir consulta basada en el rol
    let participants: any[] = [];

    logger.debug('🎯 Trainer participants API:', { userId, rol: trainer.rol, visionId, productId, excludeWithMetamorfosis });

    if (trainer.rol === 'TRAINER') {
      // Obtener productos donde es trainer
      const products = await prisma.schoolProduct.findMany({
        where: {
          trainerId: userId,
          isActive: true,
          ...(productId && { id: parseInt(productId) })
        },
        select: { id: true, visionId: true }
      });

      logger.debug('🎯 Products found for trainer:', products);

      const productIds = products.map(p => p.id);
      const visionIds = [...new Set(products.map(p => p.visionId).filter(Boolean))] as number[];
      
      logger.debug('🎯 VisionIds from products:', visionIds);

      if (productIds.length > 0 || visionIds.length > 0) {
        // Obtener enrollments de esos productos/visiones - SOLO nivel ADVANCED con asistencia
        const enrollments = await prisma.vision_enrollments.findMany({
          where: {
            OR: [
              ...(visionIds.length > 0 ? [{ visionId: { in: visionIds } }] : []),
              ...(productId ? [{ 
                Vision: { SchoolProduct: { some: { id: parseInt(productId) } } } 
              }] : [])
            ],
            enrollmentStatus: { in: ['ENROLLED', 'CONFIRMED', 'ACTIVE'] },
            level: 'ADVANCED', // Solo participantes de nivel ADVANCED
            attendanceStatus: 'ATTENDED' // Solo los que tienen asistencia confirmada
          },
          select: {
            userId: true
          },
          distinct: ['userId']
        });

        logger.debug('🎯 Enrollments found (ADVANCED with attendance):', enrollments.length);

        const userIds = enrollments.map(e => e.userId);

        if (userIds.length > 0) {
          // Filtrar los que ya tienen metamorfosis activa
          const filteredUserIds = excludeWithMetamorfosis 
            ? userIds.filter(id => !participantsWithActiveMetamorfosis.includes(id))
            : userIds;

          logger.debug('🎯 Filtered user IDs:', filteredUserIds.length);

          participants = await prisma.usuario.findMany({
            where: {
              id: { in: filteredUserIds },
              isActive: true
            },
            select: {
              id: true,
              nombre: true,
              email: true,
              profileImage: true,
              currentVisionLevel: true
            },
            orderBy: { nombre: 'asc' }
          });
        }
      }
    } else if (['DIRECTOR', 'SCHOOL_ADMIN', 'ADMINISTRADOR'].includes(trainer.rol)) {
      // Para directores/admins, obtener participantes con asistencia en ADVANCED
      // Primero obtener los userIds que cumplen con los criterios de enrollment
      const advancedEnrollments = await prisma.vision_enrollments.findMany({
        where: {
          level: 'ADVANCED',
          attendanceStatus: 'ATTENDED',
          enrollmentStatus: { in: ['ENROLLED', 'CONFIRMED', 'ACTIVE'] },
          ...(visionId && { visionId: parseInt(visionId) })
        },
        select: { userId: true },
        distinct: ['userId']
      });
      
      const advancedUserIds = advancedEnrollments.map(e => e.userId);
      
      if (advancedUserIds.length > 0) {
        participants = await prisma.usuario.findMany({
          where: {
            id: { in: advancedUserIds },
            rol: 'PARTICIPANTE',
            isActive: true,
            ...(excludeWithMetamorfosis && participantsWithActiveMetamorfosis.length > 0 && {
              id: { notIn: participantsWithActiveMetamorfosis }
            }),
            ...(trainer.rol !== 'ADMINISTRADOR' && trainer.organizationId && {
              organizationId: trainer.organizationId
            })
          },
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true,
            currentVisionLevel: true
          },
          orderBy: { nombre: 'asc' },
          take: 200 // Limitar resultados
        });
      }
    }

    return NextResponse.json({ 
      participants,
      total: participants.length
    });

  } catch (error) {
    logger.error('Error fetching trainer participants:', error);
    return NextResponse.json({ error: 'Error al obtener participantes' }, { status: 500 });
  }
}
