// 🚨 API Revocación de Licencias - Botón de Pánico
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

const prisma = new PrismaClient();

// POST: Revocar licencia (desactiva código y devuelve créditos)
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string; licenseId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { id, licenseId } = await params;
    const orgId = parseInt(id);
    const licId = parseInt(licenseId);

    // Verificar permisos
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    const isAuthorized =
      user?.rol === 'SUPER_ADMIN' ||
      (user?.rol === 'SCHOOL_ADMIN' && user.organizationId === orgId);

    if (!isAuthorized) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener la licencia
    const license = await prisma.license.findUnique({
      where: { id: licId },
    });

    if (!license) {
      return NextResponse.json({ error: 'Licencia no encontrada' }, { status: 404 });
    }

    if (license.organizationId !== orgId) {
      return NextResponse.json({ error: 'Licencia no pertenece a esta organización' }, { status: 403 });
    }

    if (license.isRevoked) {
      return NextResponse.json({ error: 'La licencia ya está revocada' }, { status: 400 });
    }

    // Revocar la licencia
    const revokedLicense = await prisma.license.update({
      where: { id: licId },
      data: {
        isRevoked: true,
        revokedAt: new Date(),
        revokedBy: user.id,
        isActive: false,
      },
    });

    // 💳 DEVOLVER CRÉDITOS: Restar de totalAllocated el capacity de la licencia
    const capacity = license.isMasterCode ? license.maxUses : 1;

    // Buscar créditos del mismo tipo de plan
    const credits = await prisma.schoolCredit.findMany({
      where: {
        organizationId: orgId,
        planType: license.tierAssigned,
        isActive: true,
      },
      orderBy: [{ createdAt: 'desc' }], // Devolver a los más recientes primero
    });

    let remainingToReturn = capacity;
    const creditUpdates = [];

    for (const credit of credits) {
      if (remainingToReturn <= 0) break;

      const toReturn = Math.min(credit.totalAllocated, remainingToReturn);

      if (toReturn > 0) {
        creditUpdates.push(
          prisma.schoolCredit.update({
            where: { id: credit.id },
            data: {
              totalAllocated: credit.totalAllocated - toReturn,
            },
          })
        );

        remainingToReturn -= toReturn;
      }
    }

    await prisma.$transaction(creditUpdates);

    // Actualizar contadores de la organización
    await prisma.organization.update({
      where: { id: orgId },
      data: {
        activeLicenses: { decrement: 1 },
      },
    });

    return NextResponse.json({
      message: '✅ Licencia revocada y créditos devueltos exitosamente',
      license: {
        id: revokedLicense.id,
        code: revokedLicense.code,
        isRevoked: revokedLicense.isRevoked,
        revokedAt: revokedLicense.revokedAt,
      },
      creditsReturned: capacity,
    });
  } catch (error) {
    console.error('Error revoking license:', error);
    return NextResponse.json({ error: 'Error al revocar licencia' }, { status: 500 });
  }
}
