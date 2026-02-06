import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

// POST - Canjear código de licencia escolar
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, tier: true, subscriptionStatus: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Ya tiene suscripción activa
    if (usuario.subscriptionStatus === 'ACTIVE' || usuario.subscriptionStatus === 'ACTIVE_BY_LICENSE') {
      return NextResponse.json({ 
        error: 'Ya tienes una suscripción activa' 
      }, { status: 400 });
    }

    const { code } = await request.json();

    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    // Buscar licencia
    const license = await prisma.license.findUnique({
      where: { code: code.toUpperCase().trim() }
    });

    // Validaciones
    if (!license) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 404 });
    }

    if (!license.isActive) {
      return NextResponse.json({ error: 'Código desactivado' }, { status: 400 });
    }

    if (license.usedCount >= license.maxUses) {
      return NextResponse.json({ 
        error: 'Código agotado. Contacta a tu coordinador.' 
      }, { status: 400 });
    }

    if (license.expiresAt && license.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Código expirado' }, { status: 400 });
    }

    // ✅ Activar licencia en usuario
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        tier: license.tierAssigned,
        subscriptionStatus: 'ACTIVE_BY_LICENSE',
        licenseCode: license.code,
        organizationId: license.organizationId,
        suscripcion: 'ACTIVO', // Mantener compatibilidad legacy
        ...(license.autoAssignVision && { vision: license.autoAssignVision }),
        puntosCuanticos: {
          increment: 500 // Bono de bienvenida
        }
      }
    });

    // Incrementar contador de usos
    await prisma.license.update({
      where: { code: license.code },
      data: {
        usedCount: {
          increment: 1
        }
      }
    });

    // Actualizar métricas de organización
    if (license.organizationId) {
      await prisma.organization.update({
        where: { id: license.organizationId },
        data: {
          activeLicenses: { increment: 1 },
          totalStudents: { increment: 1 }
        }
      });
    }

    return NextResponse.json({
      success: true,
      message: `¡Licencia activada! Ahora tienes acceso ${license.tierAssigned}${license.Organization ? ` en ${license.Organization.name}` : ''}`,
      tier: license.tierAssigned,
      organization: license.Organization?.name,
      vision: license.autoAssignVision,
      bonusPoints: 500
    });

  } catch (error) {
    logger.error('Error redeeming license:', error);
    return NextResponse.json({ 
      error: 'Error al canjear código' 
    }, { status: 500 });
  }
}
