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

    // Buscar enrollments del nivel LIDERATO (PL) para esta visión
    // Solo mostrar los que tienen pago completo (PAID, PAID_FULL, FULL, GIFT, SCHOLARSHIP)
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level: 'PL',
        paymentStatus: { in: ['PAID', 'PAID_FULL', 'FULL', 'GIFT', 'SCHOLARSHIP'] }
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
            },
            // Incluir membresías de SmallGroup para obtener el GameChanger
            SmallGroupMemberships: {
              where: {
                isActive: true,
                group: {
                  visionId: visionId,
                  level: 'PL',
                  isActive: true
                }
              },
              include: {
                group: {
                  include: {
                    leader: {
                      select: {
                        id: true,
                        nombre: true,
                        email: true,
                        telefono: true
                      }
                    }
                  }
                }
              },
              take: 1
            }
          }
        }
      },
      orderBy: {
        enrolledAt: 'desc'
      }
    });

    // Formatear los datos para el frontend
    const formattedEnrollments = enrollments.map(enrollment => {
      const membership = enrollment.Usuario_vision_enrollments_userIdToUsuario.SmallGroupMemberships?.[0];
      const gameChanger = membership?.group?.leader || null;
      const squadName = membership?.group?.name || null;

      return {
        id: enrollment.id,
        userId: enrollment.userId,
        visionId: enrollment.visionId,
        enrolledAt: enrollment.enrolledAt,
        enrollmentStatus: enrollment.enrollmentStatus,
        attendanceStatus: enrollment.attendanceStatus,
        level: enrollment.level,
        Usuario: {
          id: enrollment.Usuario_vision_enrollments_userIdToUsuario.id,
          nombre: enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre,
          email: enrollment.Usuario_vision_enrollments_userIdToUsuario.email,
          telefono: enrollment.Usuario_vision_enrollments_userIdToUsuario.telefono,
          referralCode: enrollment.Usuario_vision_enrollments_userIdToUsuario.referralCode,
          organizationId: enrollment.Usuario_vision_enrollments_userIdToUsuario.organizationId,
          createdAt: enrollment.Usuario_vision_enrollments_userIdToUsuario.createdAt,
          Organization: enrollment.Usuario_vision_enrollments_userIdToUsuario.Organization_Usuario_organizationIdToOrganization
        },
        gameChanger: gameChanger,
        squadName: squadName
      };
    });

    return NextResponse.json({
      success: true,
      enrollments: formattedEnrollments
    });

  } catch (error) {
    console.error('Error fetching PL enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar los registros' },
      { status: 500 }
    );
  }
}
