// 💳 API para Coordinadores - Consultar balance de créditos disponibles
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import logger from '@/lib/logger';


// GET: Coordinador consulta créditos disponibles de su escuela
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que el usuario tiene organizationId asignado
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        organizationId: true,
        rol: true,
      },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { error: 'Usuario sin organización asignada' },
        { status: 403 }
      );
    }

    // Solo SCHOOL_ADMIN y SUPER_ADMIN pueden ver créditos
    if (user.rol !== 'SCHOOL_ADMIN' && user.rol !== 'SUPER_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener todos los créditos activos de la escuela
    const credits = await prisma.schoolCredit.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true,
      },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            standardLicensePrice: true,
            premiumLicensePrice: true,
          },
        },
      },
      orderBy: [
        { expirationDate: 'asc' }, // Los que vencen primero
        { createdAt: 'asc' },
      ],
    });

    // Calcular balance por tipo de plan
    const balance = {
      STANDARD: {
        totalPurchased: 0,
        totalAllocated: 0,
        available: 0,
        credits: [] as any[],
      },
      PREMIUM: {
        totalPurchased: 0,
        totalAllocated: 0,
        available: 0,
        credits: [] as any[],
      },
    };

    credits.forEach((credit) => {
      const available = credit.totalPurchased - credit.totalAllocated;
      const planKey = credit.planType as 'STANDARD' | 'PREMIUM';

      balance[planKey].totalPurchased += credit.totalPurchased;
      balance[planKey].totalAllocated += credit.totalAllocated;
      balance[planKey].available += available;

      balance[planKey].credits.push({
        id: credit.id,
        totalPurchased: credit.totalPurchased,
        totalAllocated: credit.totalAllocated,
        available,
        unitPrice: credit.unitPrice,
        expirationDate: credit.expirationDate,
        notes: credit.notes,
        createdAt: credit.createdAt,
        isExpired: credit.expirationDate ? new Date(credit.expirationDate) < new Date() : false,
      });
    });

    return NextResponse.json({
      organizationId: user.organizationId,
      organizationName: credits[0]?.Organization.name || 'N/A',
      balance,
      summary: {
        standardAvailable: balance.STANDARD.available,
        premiumAvailable: balance.PREMIUM.available,
        standardPrice: credits[0]?.Organization.standardLicensePrice || 600,
        premiumPrice: credits[0]?.Organization.premiumLicensePrice || 1250,
      },
    });
  } catch (error) {
    logger.error('Error fetching school balance:', error);
    return NextResponse.json({ error: 'Error al obtener balance de créditos' }, { status: 500 });
  }
}
