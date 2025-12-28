import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

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
        Organization: {
          select: {
            id: true,
            name: true,
            logoUrl: true,
            brandColor: true
          }
        },
        ParticipanteEnVisiones: {
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
    const tieneVision = usuario.ParticipanteEnVisiones.length > 0;
    const organization = usuario.Organization;
    const esMiembroInstitucional = tieneVision && organization;

    // Si es miembro institucional, la escuela pagó su plan (mínimo STANDARD)
    let plan = usuario.tier || 'FREE';
    let activo = false;

    if (esMiembroInstitucional) {
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
      // Siempre retornar organización si existe (para mostrar membresía institucional)
      organization: organization ? {
        id: organization.id,
        name: organization.name,
        logo: organization.logoUrl,
        brandColor: organization.brandColor
      } : null
    });

  } catch (error) {
    console.error('Error obteniendo plan actual:', error);
    return NextResponse.json(
      { error: 'Error al obtener plan' },
      { status: 500 }
    );
  }
}
