// API para obtener el Hall of Fame de enrolamientos de un producto
// Muestra cuántos participantes ha invitado cada persona

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { productId } = await params;
    const productIdNum = parseInt(productId);

    // Obtener el producto
    const product = await prisma.schoolProduct.findUnique({
      where: { id: productIdNum },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
          }
        },
        Organization: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!product) {
      return NextResponse.json({ error: 'Producto no encontrado' }, { status: 404 });
    }

    // Determinar el nivel del producto
    const level = product.levelType;
    const visionId = product.visionId;

    if (!visionId) {
      return NextResponse.json({ error: 'Producto sin visión asociada' }, { status: 400 });
    }

    // Obtener todos los participantes de este producto/nivel
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: visionId,
        level: level as any,
        enrollmentStatus: { not: 'CANCELLED' },
      },
      select: {
        id: true,
        userId: true,
        attendanceStatus: true,
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
          }
        }
      }
    });

    // Obtener el siguiente nivel para contar enrolados
    const nextLevel = level === 'BASIC' ? 'ADVANCED' : level === 'ADVANCED' ? 'PL' : null;

    // Contar cuántas personas ha confirmado cada participante al siguiente nivel
    const participantsWithEnrollments = await Promise.all(
      enrollments.map(async (enrollment) => {
        const user = enrollment.Usuario_vision_enrollments_userIdToUsuario;
        
        // Contar invitados confirmados al siguiente nivel de esta misma visión
        let enrolledCount = 0;
        
        if (nextLevel) {
          enrolledCount = await prisma.vision_enrollments.count({
            where: {
              visionId: visionId,
              level: nextLevel as any,
              invitedBy: user.id,
              enrollmentStatus: { not: 'CANCELLED' },
            }
          });
        }

        return {
          id: user.id,
          nombre: user.nombre,
          email: user.email,
          imagen: user.imagen,
          enrolledCount,
          declaredCount: 0, // Ya no se usa, mantenido por compatibilidad
          totalCount: enrolledCount, // Ahora solo cuenta confirmados
          attendanceStatus: enrollment.attendanceStatus,
        };
      })
    );

    // Ordenar por total de enrolados (descendente)
    const sortedParticipants = participantsWithEnrollments.sort((a, b) => b.enrolledCount - a.enrolledCount);

    // Calcular estadísticas
    const stats = {
      totalParticipants: sortedParticipants.length,
      totalEnrolled: sortedParticipants.reduce((acc, p) => acc + p.enrolledCount, 0),
      totalDeclared: 0, // Ya no se usa
      participantsWithEnrollments: sortedParticipants.filter(p => p.enrolledCount > 0).length,
      topPerformer: sortedParticipants[0] || null,
    };

    // Determinar niveles de los participantes basado en enrolledCount
    const rankedParticipants = sortedParticipants.map((p, index) => ({
      ...p,
      rank: index + 1,
      tier: p.enrolledCount >= 4 ? 'QUANTUM' : p.enrolledCount >= 2 ? 'RUNNER' : 'WALKER',
    }));

    return NextResponse.json({
      product: {
        id: product.id,
        name: product.name,
        levelType: product.levelType,
        vision: product.Vision,
        organization: product.Organization,
      },
      participants: rankedParticipants,
      stats,
      nextLevel,
    });

  } catch (error) {
    logger.error('Error getting hall of fame:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
