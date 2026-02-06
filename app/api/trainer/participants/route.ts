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

    // Construir consulta basada en el rol
    let participants: any[] = [];

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

      const productIds = products.map(p => p.id);
      const visionIds = [...new Set(products.map(p => p.visionId).filter(Boolean))] as number[];

      if (productIds.length > 0 || visionIds.length > 0) {
        // Obtener enrollments de esos productos/visiones
        const enrollments = await prisma.vision_enrollments.findMany({
          where: {
            OR: [
              ...(visionIds.length > 0 ? [{ visionId: { in: visionIds } }] : []),
              ...(productId ? [{ 
                Vision: { SchoolProduct: { some: { id: parseInt(productId) } } } 
              }] : [])
            ],
            enrollmentStatus: { in: ['ENROLLED', 'CONFIRMED', 'ACTIVE'] }
          },
          select: {
            userId: true
          },
          distinct: ['userId']
        });

        const userIds = enrollments.map(e => e.userId);

        if (userIds.length > 0) {
          participants = await prisma.usuario.findMany({
            where: {
              id: { in: userIds },
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
      // Para directores/admins, obtener todos los participantes
      participants = await prisma.usuario.findMany({
        where: {
          rol: 'PARTICIPANTE',
          isActive: true,
          ...(trainer.rol !== 'ADMINISTRADOR' && trainer.organizationId && {
            organizationId: trainer.organizationId
          }),
          ...(visionId && {
            vision_enrollments_vision_enrollments_userIdToUsuario: {
              some: { visionId: parseInt(visionId) }
            }
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

    return NextResponse.json({ 
      participants,
      total: participants.length
    });

  } catch (error) {
    logger.error('Error fetching trainer participants:', error);
    return NextResponse.json({ error: 'Error al obtener participantes' }, { status: 500 });
  }
}
