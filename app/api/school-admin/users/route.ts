import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;

    // Verificar que el usuario sea SCHOOL_ADMIN
    if (user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener usuario completo de la BD para tener organizationId actualizado
    const fullUser = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true }
    });

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
        tickets_TicketOwner: {
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
        tickets_TicketOwner: {
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

    // Combinar ambas listas y eliminar duplicados
    const allUsers = [...orgUsers, ...activeMentors];
    const uniqueUsersMap = new Map(allUsers.map(u => [u.id, u]));
    const uniqueUsers = Array.from(uniqueUsersMap.values()).map(u => {
      // Determinar el estado de pago general del usuario
      const tickets = (u as any).tickets_TicketOwner || [];
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
      };
    });

    // Ordenar por XP
    uniqueUsers.sort((a, b) => (b.experienciaXP || 0) - (a.experienciaXP || 0));

    return NextResponse.json({
      success: true,
      users: uniqueUsers,
      stats: {
        total: uniqueUsers.length,
        participantes: uniqueUsers.filter(u => u.rol === 'PARTICIPANTE').length,
        gameChangers: uniqueUsers.filter(u => u.rol === 'GAMECHANGER').length,
        coordinadores: uniqueUsers.filter(u => u.rol === 'COORDINADOR').length,
        mentores: uniqueUsers.filter(u => u.rol === 'MENTOR').length,
      }
    });

  } catch (error) {
    console.error('Error en /api/school-admin/users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
