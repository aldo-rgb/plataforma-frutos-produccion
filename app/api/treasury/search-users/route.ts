import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/treasury/search-users
 * Busca usuarios en toda la master organización para asignar como "quien invita"
 * Se usa en Tesorería Express para referir nuevos participantes
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('q') || '';

    if (query.length < 2) {
      return NextResponse.json({ users: [] });
    }

    // Obtener el usuario actual con su organización
    const currentUser = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) },
      select: { 
        organizationId: true,
        rol: true,
        Organization_Usuario_organizationIdToOrganization: {
          select: { masterOrganizationId: true }
        }
      }
    });

    if (!currentUser?.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 400 });
    }

    const masterOrgId = currentUser.Organization_Usuario_organizationIdToOrganization?.masterOrganizationId;

    if (!masterOrgId) {
      return NextResponse.json({ error: 'Sin master organization' }, { status: 400 });
    }

    // Buscar usuarios en todas las organizaciones de la master org
    // Incluyendo GCs, coordinadores, y participantes que puedan invitar
    const users = await prisma.usuario.findMany({
      where: {
        Organization_Usuario_organizationIdToOrganization: {
          masterOrganizationId: masterOrgId
        },
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { telefono: { contains: query } }
        ],
        // Solo usuarios activos o pendientes
        NOT: {
          rol: 'SUPER_ADMIN'
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        telefono: true,
        rol: true,
        referralCode: true,
        isGraduated: true,
        organizationId: true
      },
      orderBy: [
        // Priorizar GCs y coordinadores (más probable que inviten)
        { rol: 'asc' }
      ],
      take: 20 // Limitar resultados
    });

    // Obtener nombres de organizaciones para los usuarios encontrados
    const orgIds = [...new Set(users.map(u => u.organizationId).filter(Boolean))];
    const orgs = await prisma.organization.findMany({
      where: { id: { in: orgIds as number[] } },
      select: { id: true, name: true }
    });
    const orgMap = new Map(orgs.map(o => [o.id, o.name]));

    // Formatear respuesta
    const formattedUsers = users.map(u => ({
      id: u.id,
      nombre: u.nombre,
      email: u.email,
      telefono: u.telefono,
      rol: u.rol,
      referralCode: u.referralCode,
      isGraduated: u.isGraduated,
      organizationName: u.organizationId ? orgMap.get(u.organizationId) : null
    }));

    return NextResponse.json({ users: formattedUsers });

  } catch (error) {
    console.error('Error searching users:', error);
    return NextResponse.json(
      { error: 'Error al buscar usuarios' },
      { status: 500 }
    );
  }
}
