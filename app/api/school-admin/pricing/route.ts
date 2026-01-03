import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const organizationId = searchParams.get('organizationId');

    if (!organizationId) {
      return NextResponse.json(
        { success: false, error: 'organizationId requerido' },
        { status: 400 }
      );
    }

    // Verificar que el usuario tiene acceso a esta organización
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Buscar el SchoolCredit de la organización para obtener el precio unitario
    const schoolCredit = await prisma.schoolCredit.findFirst({
      where: {
        organizationId: parseInt(organizationId),
        planType: 'STANDARD',
        isActive: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    // Si no hay SchoolCredit activo, buscar cualquiera (incluso inactivo) para obtener el precio
    const fallbackCredit = schoolCredit || await prisma.schoolCredit.findFirst({
      where: {
        organizationId: parseInt(organizationId),
        planType: 'STANDARD',
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const basePrice = fallbackCredit?.unitPrice || 150; // Default a 150 MXN si no hay ninguno

    return NextResponse.json({
      success: true,
      basePrice,
      hasActiveCredit: !!schoolCredit,
      creditDetails: fallbackCredit ? {
        id: fallbackCredit.id,
        unitPrice: fallbackCredit.unitPrice,
        totalPurchased: fallbackCredit.totalPurchased,
        isActive: fallbackCredit.isActive,
      } : null,
    });
  } catch (error) {
    console.error('Error al obtener precio base:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al obtener el precio',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
