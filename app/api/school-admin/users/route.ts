import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;
    logger.info('SCHOOL_ADMIN users API - Session user:', { id: user.id, rol: user.rol, organizationId: user.organizationId });

    // Verificar que el usuario sea SCHOOL_ADMIN
    if (user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener usuario completo de la BD para tener organizationId actualizado
    const fullUser = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true }
    });
    
    logger.info('SCHOOL_ADMIN users API - Full user from DB:', fullUser);

    if (!fullUser?.organizationId) {
      return NextResponse.json({ 
        error: 'Usuario no tiene organización asignada'
      }, { status: 400 });
    }

    // 1. Obtener usuarios directos de la organización (Participantes, GameChangers, Coordinadores)
    const orgUsers = await prisma.usuario.findMany({
      where: {
        organizationId: fullUser.organizationId,
        isActive: true,
        rol: { in: ['PARTICIPANTE', 'GAMECHANGER', 'COORDINADOR'] }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tier: true,
        experienciaXP: true,
        isActive: true,
        createdAt: true,
        Ticket_Ticket_ownerIdToUsuario: {
          select: {
            id: true,
            level: true,
            paymentStatus: true,
            visionId: true,
            Vision: {
              select: {
                id: true,
                nombre: true,
              }
            }
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
        // Incluir participación en visiones
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          select: {
            visionId: true,
            Vision: {
              select: {
                id: true,
                nombre: true,
              }
            }
          }
        },
        // Incluir datos de cuestionarios
        MedicalForm_MedicalForm_userIdToUsuario: {
          select: {
            id: true,
            consentAccepted: true,
          }
        },
        AdvancedQuestionnaire_AdvancedQuestionnaire_userIdToUsuario: {
          select: {
            id: true,
            status: true,
            completedAt: true,
          }
        },
        CartaFrutos: {
          select: {
            id: true,
            estado: true,
            invitadosInscritos: true,
          },
          orderBy: { fechaCreacion: 'desc' },
          take: 1
        },
        BusinessProfile: {
          select: {
            id: true,
            status: true,
          }
        },
        // Contar invitados enrollados (usuarios que este usuario invitó)
        vision_enrollments_vision_enrollments_invitedByToUsuario: {
          where: {
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
          },
          select: { id: true }
        },
        // Enrollments del usuario (para filtrar por visión y nivel correctamente)
        vision_enrollments_vision_enrollments_userIdToUsuario: {
          where: {
            enrollmentStatus: { in: ['ENROLLED', 'ACTIVE', 'COMPLETED'] }
          },
          select: {
            id: true,
            visionId: true,
            level: true,
            enrollmentStatus: true,
            Vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        experienciaXP: 'desc'
      }
    });

    // 2. Obtener mentores que están activos con usuarios de esta organización
    // Usando la relación ProgramEnrollment_ProgramEnrollment_mentorIdToUsuario
    const activeMentors = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        ProgramEnrollment_ProgramEnrollment_mentorIdToUsuario: {
          some: {
            Usuario_ProgramEnrollment_userIdToUsuario: {
              organizationId: fullUser.organizationId,
              isActive: true
            }
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tier: true,
        experienciaXP: true,
        isActive: true,
        createdAt: true,
        Ticket_Ticket_ownerIdToUsuario: {
          select: {
            id: true,
            level: true,
            paymentStatus: true,
          },
          orderBy: {
            createdAt: 'desc',
          },
          take: 3,
        },
      },
      orderBy: {
        experienciaXP: 'desc'
      }
    });

    logger.info('SCHOOL_ADMIN users API - orgUsers count:', orgUsers.length, 'activeMentors count:', activeMentors.length);

    // Combinar ambas listas y eliminar duplicados
    const allUsers = [...orgUsers, ...activeMentors];
    const uniqueUsersMap = new Map(allUsers.map(u => [u.id, u]));
    const uniqueUsers = Array.from(uniqueUsersMap.values()).map(u => {
      // Determinar el estado de pago general del usuario
      const tickets = (u as any).Ticket_Ticket_ownerIdToUsuario || [];
      const enrollments = (u as any).vision_enrollments_vision_enrollments_userIdToUsuario || [];
      
      let overallPaymentStatus = 'NO_TICKET';
      
      if (tickets.length > 0) {
        const hasUnpaid = tickets.some((t: any) => t.paymentStatus === 'UNPAID');
        const hasPartial = tickets.some((t: any) => t.paymentStatus === 'PARTIAL');
        const allPaid = tickets.every((t: any) => t.paymentStatus === 'PAID' || t.paymentStatus === 'GIFT');
        
        if (hasUnpaid) {
          overallPaymentStatus = 'UNPAID';
        } else if (hasPartial) {
          overallPaymentStatus = 'PARTIAL';
        } else if (allPaid) {
          overallPaymentStatus = 'PAID';
        }
      }
      
      // Usar enrollments como fuente principal para visiones y niveles
      // (Solo incluye ENROLLED, ACTIVE, COMPLETED - no PENDING)
      const enrollmentVisionIds = enrollments.map((e: any) => e.visionId).filter(Boolean);
      const enrollmentLevels = enrollments.map((e: any) => e.level).filter(Boolean);
      const enrollmentVisiones = enrollments
        .filter((e: any) => e.Vision)
        .map((e: any) => ({ id: e.Vision.id, nombre: e.Vision.nombre }));
      
      // También obtener de VisionParticipante como backup
      const vpVisiones = ((u as any).VisionParticipante_VisionParticipante_participanteIdToUsuario || [])
        .filter((vp: any) => vp.Vision)
        .map((vp: any) => ({ id: vp.Vision.id, nombre: vp.Vision.nombre }));
      const vpVisionIds = ((u as any).VisionParticipante_VisionParticipante_participanteIdToUsuario || [])
        .map((vp: any) => vp.visionId).filter(Boolean);
      
      // Combinar y deduplicar
      const allVisionIds = [...new Set([...enrollmentVisionIds, ...vpVisionIds])];
      const allLevels = [...new Set(enrollmentLevels)];
      const allVisiones = [...new Map([
        ...enrollmentVisiones.map((v: any) => [v.id, v]),
        ...vpVisiones.map((v: any) => [v.id, v])
      ]).values()];
      
      return {
        id: u.id,
        nombre: u.nombre,
        email: u.email,
        rol: u.rol,
        tier: u.tier,
        experienciaXP: u.experienciaXP,
        isActive: u.isActive,
        createdAt: u.createdAt,
        paymentStatus: overallPaymentStatus,
        ticketsCount: tickets.length,
        // Niveles de enrollments activos (ENROLLED, ACTIVE, COMPLETED - no PENDING)
        levels: allLevels,
        // Visiones del usuario (de enrollments activos y VisionParticipante)
        visionIds: allVisionIds,
        visiones: allVisiones,
        // Nuevos campos de cuestionarios
        quizMedico: !!(u as any).MedicalForm_MedicalForm_userIdToUsuario?.consentAccepted,
        quizAvanzado: (u as any).AdvancedQuestionnaire_AdvancedQuestionnaire_userIdToUsuario?.status === 'COMPLETED',
        cartaFrutos: (u as any).CartaFrutos?.[0]?.estado || null,
        tieneNegocio: !!(u as any).BusinessProfile?.id,
        negocioStatus: (u as any).BusinessProfile?.status || null,
        invitadosEnrolados: (u as any).vision_enrollments_vision_enrollments_invitedByToUsuario?.length || 0,
      };
    });

    // Obtener todas las visiones de la organización para los filtros
    const allVisiones = await prisma.vision.findMany({
      where: { organizationId: fullUser.organizationId },
      select: { id: true, nombre: true },
      orderBy: { nombre: 'asc' }
    });

    // Ordenar por XP
    uniqueUsers.sort((a, b) => (b.experienciaXP || 0) - (a.experienciaXP || 0));

    return NextResponse.json({
      success: true,
      users: uniqueUsers,
      visiones: allVisiones,
      stats: {
        total: uniqueUsers.length,
        participantes: uniqueUsers.filter(u => u.rol === 'PARTICIPANTE').length,
        gameChangers: uniqueUsers.filter(u => u.rol === 'GAMECHANGER').length,
        coordinadores: uniqueUsers.filter(u => u.rol === 'COORDINADOR').length,
        mentores: uniqueUsers.filter(u => u.rol === 'MENTOR').length,
      }
    });

  } catch (error) {
    logger.error('Error en /api/school-admin/users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
