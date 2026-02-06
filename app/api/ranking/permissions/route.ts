import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/ranking/permissions
 * Obtiene los permisos y opciones disponibles para el usuario según su rol
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    
    // Obtener información del usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      include: {
        Organization: true,
        ParticipanteEnVisiones: {
          where: {
            Vision: {
              isActive: true
            }
          },
          include: {
            Vision: true
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const rol = usuario.rol;
    const organizationId = usuario.organizationId;
    
    // Definir permisos según rol
    let permissions = {
      role: rol, // Agregar el rol del usuario
      canViewGlobal: false,
      canViewSchool: false,
      canViewSchoolWar: false,
      canViewVision: false,
      canViewMentors: false,
      availableSchools: [] as any[],
      availableVisions: [] as any[],
      userOrganizationId: organizationId,
      userVisionId: null as number | null
    };

    // PARTICIPANTE y GAME_CHANGER: Solo su escuela (global de su escuela) y su visión
    if (rol === 'PARTICIPANTE' || rol === 'GAME_CHANGER') {
      permissions.canViewGlobal = true; // Global filtrado por su escuela
      permissions.canViewVision = true; // Solo su visión
      permissions.canViewMentors = true;
      
      // Solo puede ver su propia escuela
      if (usuario.Organization) {
        permissions.availableSchools = [{
          id: usuario.Organization.id,
          name: usuario.Organization.name,
          logo: usuario.Organization.logoUrl,
          brandColor: usuario.Organization.brandColor
        }];
      }
      
      // Solo puede ver sus propias visiones
      permissions.availableVisions = usuario.ParticipanteEnVisiones.map(vp => ({
        id: vp.Vision.id,
        nombre: vp.Vision.nombre,
        descripcion: vp.Vision.descripcion
      }));
      
      // Guardar la visión del usuario (si tiene una activa)
      if (usuario.ParticipanteEnVisiones.length > 0) {
        permissions.userVisionId = usuario.ParticipanteEnVisiones[0].Vision.id;
      }
    }
    
    // COORDINADOR y DIRECTOR: Todas las visiones de su escuela y global de su escuela
    else if (rol === 'COORDINADOR' || rol === 'DIRECTOR') {
      permissions.canViewGlobal = true; // Global filtrado por su escuela
      permissions.canViewSchool = true; // Puede ver ranking interno de su escuela
      permissions.canViewVision = true; // Todas las visiones de su escuela
      permissions.canViewMentors = true;
      
      // Solo puede ver su propia escuela
      if (usuario.Organization) {
        permissions.availableSchools = [{
          id: usuario.Organization.id,
          name: usuario.Organization.name,
          logo: usuario.Organization.logoUrl,
          brandColor: usuario.Organization.brandColor
        }];
        
        // Obtener todas las visiones de su escuela
        const visionesEscuela = await prisma.vision.findMany({
          where: {
            organizationId: usuario.Organization.id,
            isActive: true
          },
          select: {
            id: true,
            nombre: true,
            descripcion: true
          },
          orderBy: {
            nombre: 'asc'
          }
        });
        
        permissions.availableVisions = visionesEscuela;
      }
    }
    
    // ADMINISTRADOR: Acceso completo a todo
    else if (rol === 'ADMIN' || rol === 'ADMINISTRADOR') {
      permissions.canViewGlobal = true;
      permissions.canViewSchool = true;
      permissions.canViewSchoolWar = true;
      permissions.canViewVision = true;
      permissions.canViewMentors = true;
      
      // Puede ver todas las escuelas
      const allSchools = await prisma.organization.findMany({
        select: {
          id: true,
          name: true,
          logoUrl: true,
          brandColor: true
        },
        orderBy: {
          name: 'asc'
        }
      });
      permissions.availableSchools = allSchools.map(s => ({
        id: s.id,
        name: s.name,
        logo: s.logoUrl,
        brandColor: s.brandColor
      }));
      
      // Puede ver todas las visiones
      const allVisions = await prisma.vision.findMany({
        where: {
          isActive: true
        },
        select: {
          id: true,
          nombre: true,
          descripcion: true
        },
        orderBy: {
          nombre: 'asc'
        }
      });
      permissions.availableVisions = allVisions;
    }
    
    // MENTOR: Puede ver global general y las visiones donde tiene mentorados asignados
    else if (rol === 'MENTOR') {
      permissions.canViewGlobal = true; // Global SIN filtrar por escuela
      permissions.canViewSchool = false; // No necesita ver por escuela específica
      permissions.canViewVision = true; // Visiones donde tiene mentorados
      permissions.canViewMentors = true;
      
      // No necesita filtro de escuelas ya que ve global general
      permissions.availableSchools = [];
      
      // Obtener visiones donde tiene mentorados asignados
      // Buscar por ProgramEnrollment donde él es el mentor
      const enrollmentsAsMentor = await prisma.programEnrollment.findMany({
        where: {
          mentorId: userId,
          status: 'ACTIVE'
        },
        include: {
          Usuario_ProgramEnrollment_userIdToUsuario: {
            include: {
              ParticipanteEnVisiones: {
                where: {
                  Vision: {
                    isActive: true
                  }
                },
                include: {
                  Vision: true
                }
              }
            }
          }
        }
      });
      
      // Extraer visiones únicas de todos sus mentorados
      const visionesSet = new Set<number>();
      const visionesMap = new Map<number, any>();
      
      enrollmentsAsMentor.forEach(enrollment => {
        enrollment.Usuario_ProgramEnrollment_userIdToUsuario.ParticipanteEnVisiones.forEach(vp => {
          if (!visionesSet.has(vp.Vision.id)) {
            visionesSet.add(vp.Vision.id);
            visionesMap.set(vp.Vision.id, {
              id: vp.Vision.id,
              nombre: vp.Vision.nombre,
              descripcion: vp.Vision.descripcion
            });
          }
        });
      });
      
      permissions.availableVisions = Array.from(visionesMap.values());
    }

    logger.debug('🔐 Permisos de ranking para usuario:', {
      userId,
      rol,
      permissions: {
        canViewGlobal: permissions.canViewGlobal,
        canViewSchool: permissions.canViewSchool,
        canViewSchoolWar: permissions.canViewSchoolWar,
        canViewVision: permissions.canViewVision,
        schools: permissions.availableSchools.length,
        visions: permissions.availableVisions.length
      }
    });

    return NextResponse.json(permissions);

  } catch (error) {
    logger.error('❌ Error obteniendo permisos de ranking:', error);
    return NextResponse.json(
      { 
        error: 'Error obteniendo permisos',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
