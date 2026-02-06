import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/user/current-plan
 * Obtiene el plan/membresía actual del usuario
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        tier: true,
        subscriptionStatus: true,
        subscriptionEndDate: true,
        subscriptionPlan: true,
        planActual: true,
        organizationId: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandColor: true
          }
        },
        VisionParticipante_VisionParticipante_participanteIdToUsuario: {
          where: {
            Vision: {
              isActive: true
            }
          },
          select: {
            Vision: {
              select: {
                id: true,
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Determinar si tiene visión activa (membresía institucional)
    const tieneVision = usuario.VisionParticipante_VisionParticipante_participanteIdToUsuario.length > 0;
    const organization = usuario.Organization_Usuario_organizationIdToOrganization;
    
    // Verificar si tiene enrollment con pago (BASIC o ADVANCED pagado)
    // Los usuarios de PL (liderato) no tienen membresía pagada por la escuela
    const paidEnrollment = await prisma.vision_enrollments.findFirst({
      where: {
        userId: usuario.id,
        paymentStatus: 'PAID',
        level: {
          in: ['BASIC', 'ADVANCED']
        }
      }
    });
    
    // Solo es miembro institucional si tiene visión + organización + enrollment pagado de BASIC/ADVANCED
    const esMiembroInstitucional = tieneVision && organization && paidEnrollment;

    // Verificar si tiene paquete de Lobo Solitario activo
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: usuario.id,
          status: 'COMPLETED'
        },
        remainingSessions: {
          gt: 0
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        MentorPackageOrder: {
          select: {
            paymentData: true,
            paidAt: true
          }
        }
      }
    });

    // Si es miembro institucional, la escuela pagó su plan (mínimo STANDARD)
    let plan = usuario.tier || 'FREE';
    let activo = false;
    let loboSolitario = false;
    let loboSolitarioInfo = null;

    if (packageCredits) {
      // Usuario con Lobo Solitario activo
      const paymentData = packageCredits.MentorPackageOrder.paymentData as any;
      const planType = paymentData?.plan || 'STANDARD';
      const frecuencia = paymentData?.frecuencia || 'ANUAL';
      
      plan = planType;
      activo = true;
      loboSolitario = true;
      loboSolitarioInfo = {
        totalSessions: packageCredits.totalSessions,
        remainingSessions: packageCredits.remainingSessions,
        usedSessions: packageCredits.usedSessions,
        expiresAt: packageCredits.expiresAt,
        planType: planType,
        frecuencia: frecuencia,
        paidAt: packageCredits.MentorPackageOrder.paidAt
      };
      
      logger.debug('✅ Usuario tiene Lobo Solitario activo:', { plan, loboSolitarioInfo });
    } else if (esMiembroInstitucional) {
      // Usuario de escuela: tiene plan STANDARD (GOLD) pagado por la institución
      // Las licencias escolares siempre son STANDARD, no importa el tier del usuario
      plan = 'GOLD'; // GOLD = STANDARD para licencias escolares
      activo = true;
    } else if (usuario.subscriptionStatus === 'ACTIVE' || usuario.subscriptionStatus === 'active') {
      // Usuario con suscripción personal
      activo = true;
      
      // Verificar si no ha expirado
      if (usuario.subscriptionEndDate) {
        const ahora = new Date();
        const fechaExpiracion = new Date(usuario.subscriptionEndDate);
        if (ahora > fechaExpiracion) {
          plan = 'FREE';
          activo = false;
        }
      }
    }

    // Mapear los tiers a nombres de plan
    const planNombre = plan === 'GOLD' ? 'STANDARD' : plan === 'NEON' ? 'PREMIUM' : plan;

    // isPaidBySchool es true cuando tiene organización y plan activo
    const isPaidBySchool = esMiembroInstitucional && activo;

    return NextResponse.json({
      plan: planNombre,
      activo,
      status: usuario.subscriptionStatus,
      endDate: usuario.subscriptionEndDate,
      subscriptionPlan: usuario.subscriptionPlan,
      paidBySchool: isPaidBySchool,
      loboSolitario,
      loboSolitarioInfo,
      // Siempre retornar organización si existe (para mostrar membresía institucional)
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        logo: organization.logoUrl,
        brandColor: organization.brandColor
      } : null
    });

  } catch (error) {
    logger.error('Error obteniendo plan actual:', error);
    return NextResponse.json(
      { error: 'Error al obtener plan' },
      { status: 500 }
    );
  }
}
