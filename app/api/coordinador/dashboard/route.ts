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

    // Roles válidos de coordinador
    const coordinadorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER'];
    const tieneRolCoordinador = coordinadorRoles.includes(user.rol);
    const tieneFlagCoordinador = user.esCoordinador || user.esCoordinadorBasico || user.esCoordinadorAvanzado || user.esEntrenador;
    
    // Verificar que el usuario sea COORDINADOR o tenga flag de coordinador
    if (!tieneRolCoordinador && !tieneFlagCoordinador) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener usuario completo de la BD para tener organizationId actualizado
    const fullUser = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true, nombre: true, email: true }
    });

    if (!fullUser?.organizationId) {
      return NextResponse.json({ 
        error: 'Usuario no tiene organización asignada',
        user: fullUser
      }, { status: 400 });
    }

    // 1. Obtener información de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: fullUser.organizationId },
      select: {
        id: true,
        name: true,
        contactEmail: true,
        logoUrl: true,
        brandColor: true,
        Users: {
          where: {
            isActive: true,
            rol: { in: ['PARTICIPANTE', 'MENTOR', 'COORDINADOR', 'GAMECHANGER'] }
          },
          select: {
            id: true,
            nombre: true,
            email: true,
            tier: true,
            experienciaXP: true,
            rol: true,
            isActive: true,
            createdAt: true,
          }
        }
      }
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organización no encontrada' }, { status: 404 });
    }

    // 2. Obtener órdenes de licencias pendientes (incluyendo las que están en revisión)
    const pendingOrders = await prisma.licenseOrder.findMany({
      where: {
        organizationId: fullUser.organizationId,
        status: {
          in: ['PENDING', 'PROCESSING']
        }
      },
      select: {
        id: true,
        quantity: true,
        tier: true,
        amount: true,
        paymentMethod: true,
        createdAt: true,
        status: true,
        paymentUrl: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    // 3. Calcular créditos disponibles
    const schoolCredits = await prisma.schoolCredit.aggregate({
      where: {
        organizationId: fullUser.organizationId,
        isActive: true,
      },
      _sum: {
        totalPurchased: true,
      }
    });

    // Contar solo las licencias ACTIVADAS (con activatedAt no nulo)
    const activatedLicenses = await prisma.licenseAssignment.count({
      where: {
        Organization: {
          id: fullUser.organizationId
        },
        isActive: true,
        activatedAt: {
          not: null
        }
      }
    });

    const totalPurchased = schoolCredits._sum.totalPurchased || 0;
    const totalActivated = activatedLicenses;
    const availableCredits = totalPurchased - totalActivated;

    // 4. Calcular distribución de tiers
    const tierDistribution = organization.Users.reduce((acc: Record<string, number>, user: any) => {
      const tier = user.tier || 'BASIC';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 5. Top 5 estudiantes por XP (incluyendo GAMECHANGER)
    const topStudents = organization.Users
      .filter((u: any) => u.rol === 'PARTICIPANTE' || u.rol === 'GAMECHANGER')
      .sort((a: any, b: any) => (b.experienciaXP || 0) - (a.experienciaXP || 0))
      .slice(0, 5)
      .map((u: any) => ({
        id: u.id,
        nombre: u.nombre,
        experienciaXP: u.experienciaXP || 0,
        tier: u.tier || 'BASIC'
      }));

    // 6. Estadísticas generales
    const totalStudents = totalActivated; // Número de licencias activadas
    const totalMentors = organization.Users.filter((u: any) => u.rol === 'MENTOR').length;
    const totalUsers = organization.Users.length;
    
    // 6.1 Contador de COMUNIDAD: Todos los usuarios que han mencionado esta organización (incluyendo individuales)
    const totalCommunityMembers = await prisma.usuario.count({
      where: {
        OR: [
          { organizationId: fullUser.organizationId }, // Usuarios oficiales con licencia
          { communityOrganizationId: fullUser.organizationId } // Usuarios individuales que mencionaron la org
        ]
      }
    });

    // 7. Verificar si hay pagos pendientes
    const pendingPayment = pendingOrders.length > 0;

    // 8. Obtener historial de órdenes completadas (últimas 5)
    const completedOrders = await prisma.licenseOrder.findMany({
      where: {
        organizationId: fullUser.organizationId,
        status: 'COMPLETED'
      },
      select: {
        id: true,
        quantity: true,
        tier: true,
        amount: true,
        paidAt: true,
      },
      orderBy: {
        paidAt: 'desc'
      },
      take: 5
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        contactEmail: organization.contactEmail,
        logoUrl: organization.logoUrl,
        brandColor: organization.brandColor,
      },
      stats: {
        totalStudents,
        totalMentors,
        totalUsers,
        totalCommunityMembers, // NUEVO: Contador de comunidad total
        availableCredits,
        totalPurchased,
        totalActivated,
      },
      pendingOrders,
      completedOrders,
      pendingPayment,
      tierDistribution,
      topStudents,
      users: organization.Users,
    });

  } catch (error) {
    logger.error('Error en dashboard de COORDINADOR:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    );
  }
}
