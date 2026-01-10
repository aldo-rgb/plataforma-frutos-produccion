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
        totalLicenses: true,
        activeLicenses: true,
        licensesAvailable: true,
        Usuario_Usuario_organizationIdToOrganization: {
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
        totalAllocated: true,
      }
    });

    // Contar licencias totales en tabla License
    const totalLicensesInPool = await prisma.license.count({
      where: {
        organizationId: fullUser.organizationId,
        isActive: true,
      }
    });

    // === CÁLCULO CORRECTO DE LICENCIAS CONSUMIDAS ===
    // 1. GAMECHANGER y LIDER: Consumen licencia al ser creados (no requieren check-in)
    const gcLiderCount = await prisma.usuario.count({
      where: {
        organizationId: fullUser.organizationId,
        rol: { in: ['GAMECHANGER', 'LIDER'] },
        isActive: true
      }
    });

    // 2. PARTICIPANTES: Consumen licencia SOLO cuando hacen check-in (registro con gafete)
    const participantesWithCheckIn = await prisma.checkInRecord.count({
      where: {
        organizationId: fullUser.organizationId,
        licenseConsumed: true,
        Usuario: { rol: 'PARTICIPANTE' }
      }
    });

    // Total de licencias consumidas
    const licensesConsumed = gcLiderCount + participantesWithCheckIn;

    // Licencias disponibles = Total en pool - Consumidas
    const availableLicenses = totalLicensesInPool - licensesConsumed;

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

    // Variables para estadísticas
    const totalActivated = activatedLicenses;
    const totalPurchased = schoolCredits._sum.totalPurchased || 0; // Total de llamadas compradas
    const totalAllocated = schoolCredits._sum.totalAllocated || 0; // Llamadas bloqueadas
    const callsAvailable = totalPurchased - totalAllocated; // Llamadas disponibles
    
    // 📊 Licencias disponibles = licencias no asignadas de la organización
    // NO incluir SchoolCredit (llamadas de mentoría) porque son sistemas separados
    const availableCredits = availableLicenses;

    // 4. Calcular distribución de tiers
    const users = organization.Usuario_Usuario_organizationIdToOrganization;
    const tierDistribution = users.reduce((acc: Record<string, number>, user: any) => {
      const tier = user.tier || 'BASIC';
      acc[tier] = (acc[tier] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    // 5. Top 5 estudiantes por XP (incluyendo GAMECHANGER)
    const topStudents = users
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
    const totalMentors = users.filter((u: any) => u.rol === 'MENTOR').length;
    const totalUsers = users.length;
    
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

    // 9. Obtener líderes con perfil pendiente de aprobación
    const pendingLeaderApprovals = await prisma.usuario.count({
      where: {
        organizationId: fullUser.organizationId,
        rol: 'LIDER',
        PerfilMentor: {
          profileApprovalStatus: 'PENDING'
        }
      }
    });

    // 10. Calcular costos totales de mentores en todas las visiones activas
    const visionesActivas = await prisma.vision.findMany({
      where: {
        organizationId: fullUser.organizationId,
        isActive: true,
        startDate: { not: null },
        endDate: { not: null },
      },
      include: {
        VisionMentor: {
          include: {
            Usuario_VisionMentor_mentorIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                rol: true,
                PerfilMentor: {
                  select: {
                    precioDisciplina: true,
                  }
                }
              }
            }
          }
        }
      }
    });

    let costoTotalMentores = 0;
    let totalLlamadasDisciplina = 0;
    let totalMentoresActivos = 0;

    visionesActivas.forEach(vision => {
      if (vision.startDate && vision.endDate) {
        const start = new Date(vision.startDate);
        const end = new Date(vision.endDate);
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        const semanas = Math.floor(diffDays / 7);
        const llamadasDisciplina = semanas * 2;

        vision.VisionMentor.forEach(visionMentor => {
          const usuario = visionMentor.Usuario_VisionMentor_mentorIdToUsuario;
          const esLider = usuario?.rol === 'COORDINADOR' || usuario?.rol === 'SCHOOL_ADMIN';
          
          if (!esLider && usuario?.PerfilMentor?.precioDisciplina) {
            const precioDisciplina = usuario.PerfilMentor.precioDisciplina;
            const costoMentor = llamadasDisciplina * precioDisciplina;
            costoTotalMentores += costoMentor;
            totalLlamadasDisciplina += llamadasDisciplina;
            totalMentoresActivos++;
          }
        });
      }
    });

    return NextResponse.json({
      success: true,
      organization: {
        id: organization.id,
        name: organization.name,
        contactEmail: organization.contactEmail,
        logoUrl: organization.logoUrl,
        brandColor: organization.brandColor,
        totalLicenses: organization.totalLicenses,
        activeLicenses: organization.activeLicenses,
        licensesAvailable: organization.licensesAvailable,
      },
      stats: {
        totalStudents,
        totalMentors,
        totalUsers,
        totalCommunityMembers, // NUEVO: Contador de comunidad total
        availableCredits, // 📜 Licencias disponibles para usuarios
        totalPurchased, // 📞 Total de llamadas compradas (SchoolCredit)
        totalActivated, // 👥 Licencias activadas
        totalAllocated, // 🔒 Llamadas bloqueadas/asignadas a mentores
        callsAvailable, // 💰 Llamadas disponibles = totalPurchased - totalAllocated
      },
      mentorCosts: {
        costoTotalMentores,
        totalLlamadasDisciplina,
        totalMentoresActivos,
        visionesActivas: visionesActivas.length,
      },
      pendingOrders,
      pendingLeaderApprovals,
      completedOrders,
      pendingPayment,
      tierDistribution,
      topStudents,
      users: users,
    });

  } catch (error) {
    console.error('Error en dashboard de SCHOOL_ADMIN:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    );
  }
}
