import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const visionId = parseInt(resolvedParams.id);

    // Buscar enrollments del nivel AVANZADO para esta visión
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level: 'ADVANCED'
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          include: {
            Organization_Usuario_organizationIdToOrganization: {
              select: {
                id: true,
                name: true,
                slug: true
              }
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    // Formatear los datos para el frontend
    const formattedEnrollments = enrollments.map(enrollment => ({
      id: enrollment.id,
      userId: enrollment.userId,
      visionId: enrollment.visionId,
      enrolledAt: enrollment.enrolledAt,
      enrollmentStatus: enrollment.enrollmentStatus,
      level: enrollment.level,
      Usuario: {
        id: enrollment.Usuario_vision_enrollments_userIdToUsuario.id,
        nombre: enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre,
        email: enrollment.Usuario_vision_enrollments_userIdToUsuario.email,
        organizationId: enrollment.Usuario_vision_enrollments_userIdToUsuario.organizationId,
        createdAt: enrollment.Usuario_vision_enrollments_userIdToUsuario.createdAt,
        Organization: enrollment.Usuario_vision_enrollments_userIdToUsuario.Organization_Usuario_organizationIdToOrganization
      }
    }));

    return NextResponse.json({
      success: true,
      enrollments: formattedEnrollments
    });

  } catch (error) {
    console.error('Error fetching advanced enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar los registros' },
      { status: 500 }
    );
  }
}
