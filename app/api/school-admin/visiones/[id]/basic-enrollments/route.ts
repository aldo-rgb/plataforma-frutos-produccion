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

    // Buscar enrollments del nivel BÁSICO para esta visión
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId,
        level: 'BASIC'
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            apodo: true,
            email: true,
            telefono: true,
            profileImage: true,
            referralCode: true,
            organizationId: true,
            createdAt: true,
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

    // Obtener asignaciones de SmallGroup para estos enrollments
    const enrollmentIds = enrollments.map(e => e.id);
    const smallGroupMembers = await prisma.smallGroupMember.findMany({
      where: {
        enrollmentId: { in: enrollmentIds },
        isActive: true
      },
      include: {
        SmallGroup: {
          include: {
            Usuario: {
              select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true
              }
            }
          }
        }
      }
    });

    // Crear mapa de enrollmentId -> gameChanger
    const gcMap = new Map<number, { gameChanger: any, squadName: string | null }>();
    smallGroupMembers.forEach(member => {
      if (member.enrollmentId) {
        gcMap.set(member.enrollmentId, {
          gameChanger: member.SmallGroup?.Usuario || null,
          squadName: member.SmallGroup?.name || null
        });
      }
    });

    // Formatear los datos para el frontend
    const formattedEnrollments = enrollments.map(enrollment => {
      const gcData = gcMap.get(enrollment.id);
      return {
        id: enrollment.id,
        oderId: enrollment.userId,
        userId: enrollment.userId,
        visionId: enrollment.visionId,
        enrolledAt: enrollment.enrolledAt,
        enrollmentStatus: enrollment.enrollmentStatus,
        attendanceStatus: enrollment.attendanceStatus,
        level: enrollment.level,
        rol: 'PARTICIPANTE',
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
        gameChanger: gcData?.gameChanger || null,
        squadName: gcData?.squadName || null
      };
    });

    // Obtener Game Changers de esta visión para nivel BASIC
    const visionGameChangers = await prisma.visionGameChanger.findMany({
      where: { 
        visionId,
        level: 'BASIC'
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

    // Obtener Trainer y Coordinador del SchoolProduct BASIC
    const schoolProduct = await prisma.schoolProduct.findFirst({
      where: {
        visionId,
        levelType: 'BASIC',
        isActive: true,
      },
      include: {
        Usuario_SchoolProduct_trainerIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            referralCode: true,
          }
        },
        Usuario_SchoolProduct_coordinatorIdToUsuario: {
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

    // Crear lista de staff (Trainer + Coordinador + GC) al principio
    const staffList: typeof formattedEnrollments = [];
    
    // Agregar Trainer primero
    if (schoolProduct?.Usuario_SchoolProduct_trainerIdToUsuario) {
      const trainer = schoolProduct.Usuario_SchoolProduct_trainerIdToUsuario;
      staffList.push({
        id: -trainer.id,
        oderId: trainer.id,
        visionId: visionId,
        enrolledAt: new Date(),
        enrollmentStatus: 'ACTIVE',
        attendanceStatus: null as any,
        level: 'BASIC',
        rol: 'TRAINER',
        Usuario: {
          id: trainer.id,
          nombre: trainer.nombre,
          email: trainer.email,
          telefono: trainer.telefono,
          referralCode: trainer.referralCode,
          organizationId: null as any,
          createdAt: new Date(),
          Organization: null as any
        },
        gameChanger: null,
        squadName: null
      });
    }

    // Agregar Coordinador después del Trainer
    if (schoolProduct?.Usuario_SchoolProduct_coordinatorIdToUsuario) {
      const coordinator = schoolProduct.Usuario_SchoolProduct_coordinatorIdToUsuario;
      staffList.push({
        id: -coordinator.id - 5000,
        oderId: coordinator.id,
        visionId: visionId,
        enrolledAt: new Date(),
        enrollmentStatus: 'ACTIVE',
        attendanceStatus: null as any,
        level: 'BASIC',
        rol: 'COORDINADOR',
        Usuario: {
          id: coordinator.id,
          nombre: coordinator.nombre,
          email: coordinator.email,
          telefono: coordinator.telefono,
          referralCode: coordinator.referralCode,
          organizationId: null as any,
          createdAt: new Date(),
          Organization: null as any
        },
        gameChanger: null,
        squadName: null
      });
    }

    // Agregar Game Changers
    for (const gc of visionGameChangers) {
      const gcUser = gc.Usuario_VisionGameChanger_gameChangerIdToUsuario;
      if (staffList.find(s => s.Usuario.id === gcUser.id)) continue;
      
      staffList.push({
        id: -gcUser.id - 10000,
        oderId: gcUser.id,
        visionId: visionId,
        enrolledAt: gc.createdAt,
        enrollmentStatus: 'ACTIVE',
        attendanceStatus: null as any,
        level: 'BASIC',
        rol: 'GAME CHANGER',
        Usuario: {
          id: gcUser.id,
          nombre: gcUser.nombre,
          email: gcUser.email,
          telefono: gcUser.telefono,
          referralCode: gcUser.referralCode,
          organizationId: null as any,
          createdAt: gc.createdAt,
          Organization: null as any
        },
        gameChanger: null,
        squadName: null
      });
    }

    // Filtrar participantes que ya están en staff (GC o Trainer)
    const staffIds = new Set(staffList.map(s => s.Usuario.id));
    const filteredEnrollments = formattedEnrollments.filter(e => !staffIds.has(e.Usuario.id));

    // Solo participantes en la lista principal (sin staff)
    // Staff se devuelve aparte para gafetes
    return NextResponse.json({
      success: true,
      enrollments: filteredEnrollments,
      staff: staffList // Para gafetes
    });

  } catch (error) {
    logger.error('Error fetching basic enrollments:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cargar los registros' },
      { status: 500 }
    );
  }
}
