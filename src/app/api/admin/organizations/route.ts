import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

const prisma = new PrismaClient();

/**
 * 📋 API: Listar Todas las Organizaciones
 * GET /api/admin/organizations
 */
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea admin
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(session.user.id) },
      select: { rol: true }
    });

    if (!user || !['ADMIN', 'COORDINADOR'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const organizations = await prisma.organization.findMany({
      select: {
        id: true,
        name: true,
        slug: true,
        status: true,
        standardLicensePrice: true,
        premiumLicensePrice: true,
        visionCycleDuration: true,
        totalLicenses: true,
        activeLicenses: true,
        totalStudents: true,
        createdAt: true
      },
      orderBy: { name: 'asc' }
    });

    return NextResponse.json({
      success: true,
      organizations
    });

  } catch (error: any) {
    console.error('❌ Error listando organizaciones:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
