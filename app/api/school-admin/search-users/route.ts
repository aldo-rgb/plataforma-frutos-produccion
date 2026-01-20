import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar permisos
    const allowedRoles = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];
    if (!allowedRoles.includes(session.user.rol as string)) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q')?.trim();
    const visionId = searchParams.get('visionId');

    if (!query || query.length < 2) {
      return NextResponse.json(
        { success: false, error: 'La búsqueda debe tener al menos 2 caracteres' },
        { status: 400 }
      );
    }

    // Obtener organización del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    // Obtener la organización del usuario para saber su master
    const userOrg = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { id: true, masterOrganizationId: true },
    });

    // Determinar el masterOrganizationId (puede ser la misma org si es master)
    const masterId = userOrg?.masterOrganizationId || user.organizationId;

    // Obtener todas las organizaciones que pertenecen al mismo master
    const relatedOrgs = await prisma.organization.findMany({
      where: {
        OR: [
          { id: masterId }, // La organización master
          { masterOrganizationId: masterId }, // Organizaciones hijas del master
        ],
      },
      select: { id: true },
    });

    const relatedOrgIds = relatedOrgs.map(org => org.id);
    console.log('🔍 Buscando en organizaciones:', relatedOrgIds);

    // Obtener IDs de usuarios que ya son Game Changers en esta visión
    let existingGCIds: number[] = [];
    if (visionId) {
      const existingGCs = await prisma.visionGameChanger.findMany({
        where: { visionId: parseInt(visionId) },
        select: { gameChangerId: true },
      });
      existingGCIds = existingGCs.map(gc => gc.gameChangerId);
    }

    // Buscar usuarios por nombre, email o teléfono
    const users = await prisma.usuario.findMany({
      where: {
        // Búsqueda por nombre, email o teléfono
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { telefono: { contains: query } },
        ],
        // Buscar en todas las organizaciones del mismo master o usuarios sin organización
        organizationId: {
          in: [...relatedOrgIds, null].filter(Boolean) as number[],
        },
        // Excluir usuarios que ya son Game Changers en esta visión
        ...(existingGCIds.length > 0 ? { id: { notIn: existingGCIds } } : {}),
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        tier: true,
      },
      take: 10,
      orderBy: { nombre: 'asc' },
    });

    return NextResponse.json({
      success: true,
      users,
      count: users.length,
    });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar usuarios' },
      { status: 500 }
    );
  }
}
