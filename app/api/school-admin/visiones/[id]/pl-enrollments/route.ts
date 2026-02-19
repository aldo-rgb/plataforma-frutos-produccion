import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
          apodo: enrollment.Usuario_vision_enrollments_userIdToUsuario.apodo,
          email: enrollment.Usuario_vision_enrollments_userIdToUsuario.email,
          telefono: enrollment.Usuario_vision_enrollments_userIdToUsuario.telefono,
          profileImage: enrollment.Usuario_vision_enrollments_userIdToUsuario.profileImage,
          referralCode: enrollment.Usuario_vision_enrollments_userIdToUsuario.referralCode,
          organizationId: enrollment.Usuario_vision_enrollments_userIdToUsuario.organizationId,
          createdAt: enrollment.Usuario_vision_enrollments_userIdToUsuario.createdAt,
          Organization: enrollment.Usuario_vision_enrollments_userIdToUsuario.Organization_Usuario_organizationIdToOrganization
        },
        gameChanger: gameChanger,
        squadName: squadName
      };
    });

    // Obtener staff asignado al nivel PL (Trainers y Coordinators desde VisionStaff)
    const visionStaff = await prisma.visionStaff.findMany({
      where: {
        visionId,
        level: 'PL'
      },
      include: {
        Usuario_VisionStaff_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            referralCode: true
          }
        }
      }
    });

    // Obtener Game Changers de VisionGameChanger para nivel PL
    const visionGameChangers = await prisma.visionGameChanger.findMany({
      where: { 
        visionId,
        level: 'PL'
      },
      include: {
        Usuario_VisionGameChanger_gameChangerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            referralCode: true,
          }
        }
      }
    });

    // Formatear staff para el frontend
    const formattedStaff: any[] = [];
    
    // Agregar staff de VisionStaff (Trainers, Coordinators)
    visionStaff.forEach(s => {
      // Mapear roles para display
      let displayRole = s.role;
      if (s.role === 'PL_TRAINER') displayRole = 'TRAINER';
      if (s.role === 'PL_COORDINATOR') displayRole = 'COORDINATOR';
      
      formattedStaff.push({
        id: s.id,
        oderId: s.Usuario_VisionStaff_userIdToUsuario.id,
        rol: displayRole,
        Usuario: {
          id: s.Usuario_VisionStaff_userIdToUsuario.id,
          nombre: s.Usuario_VisionStaff_userIdToUsuario.nombre,
          email: s.Usuario_VisionStaff_userIdToUsuario.email,
          telefono: s.Usuario_VisionStaff_userIdToUsuario.telefono,
          referralCode: s.Usuario_VisionStaff_userIdToUsuario.referralCode
        }
      });
    });
    
    // Agregar Game Changers de VisionGameChanger
    visionGameChangers.forEach(gc => {
      const gcUser = gc.Usuario_VisionGameChanger_gameChangerIdToUsuario;
      // Evitar duplicados si ya está en staff
      if (formattedStaff.find(s => s.Usuario.id === gcUser.id)) return;
      
      formattedStaff.push({
        id: gc.id + 100000, // ID único para evitar colisiones
        oderId: gcUser.id,
        rol: 'GAME CHANGER',
        Usuario: {
          id: gcUser.id,
          nombre: gcUser.nombre,
          email: gcUser.email,
          telefono: gcUser.telefono,
          referralCode: gcUser.referralCode
        }
      });
    });

    // Agregar Coordinadores únicos de vision_enrollments
    const coordinatorIds = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level: 'PL',
        coordinatorId: { not: null }
      },
      distinct: ['coordinatorId'],
      select: {
        coordinatorId: true
      }
    });

    const uniqueCoordinatorIds = coordinatorIds
      .map(c => c.coordinatorId)
      .filter((id): id is number => id !== null);

    if (uniqueCoordinatorIds.length > 0) {
      const coordinators = await prisma.usuario.findMany({
        where: {
          id: { in: uniqueCoordinatorIds }
        },
        select: {
          id: true,
          nombre: true,
          email: true,
          telefono: true,
          referralCode: true,
        }
      });

      for (const coordUser of coordinators) {
        // Skip si ya está en la lista (como Trainer o GC)
        if (formattedStaff.find(s => s.Usuario.id === coordUser.id)) continue;
        
        formattedStaff.push({
          id: coordUser.id + 200000,
          oderId: coordUser.id,
          rol: 'COORDINADOR',
          Usuario: {
            id: coordUser.id,
            nombre: coordUser.nombre,
            email: coordUser.email,
            telefono: coordUser.telefono,
            referralCode: coordUser.referralCode
          }
        });
      }
    }

    return NextResponse.json({
      success: true,
      enrollments: formattedEnrollments,
      staff: formattedStaff
    });

  } catch (error) {
    logger.error('Error fetching PL enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar los registros' },
      { status: 500 }
    );
  }
}
