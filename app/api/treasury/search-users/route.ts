import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/treasury/search-users
 * Busca usuarios en TODAS las organizaciones de la master organization
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
          select: { 
            id: true,
            masterOrganizationId: true 
          }
        }
      }
    });

    if (!currentUser?.organizationId) {
      return NextResponse.json({ error: 'Usuario sin organización' }, { status: 400 });
    }

    const userOrg = currentUser.Organization_Usuario_organizationIdToOrganization;
    
    // Determinar el masterOrgId: si la org tiene masterOrganizationId, usarlo
    // Si no, la organización ES la master (usar su propio ID)
    const masterOrgId = userOrg?.masterOrganizationId || userOrg?.id;

    if (!masterOrgId) {
      return NextResponse.json({ error: 'Sin master organization' }, { status: 400 });
    }

    // Primero obtener TODAS las organizaciones que pertenecen a esta master org
    const allOrgsInMaster = await prisma.organization.findMany({
      where: {
        OR: [
          { id: masterOrgId }, // La master org misma
          { masterOrganizationId: masterOrgId } // Todas las sub-organizaciones
        ]
      },
      select: { id: true, name: true }
    });

    const allOrgIds = allOrgsInMaster.map(o => o.id);
    const orgMap = new Map(allOrgsInMaster.map(o => [o.id, o.name]));

    console.log(`[search-users] Master org: ${masterOrgId}, Orgs encontradas: ${allOrgIds.length}`, allOrgIds);

    // Buscar usuarios en TODAS estas organizaciones
    const users = await prisma.usuario.findMany({
      where: {
        organizationId: { in: allOrgIds },
        OR: [
          { nombre: { contains: query, mode: 'insensitive' } },
          { email: { contains: query, mode: 'insensitive' } },
          { telefono: { contains: query } }
        ],
        // Excluir super admins
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
        { isGraduated: 'desc' }, // GCs primero
        { nombre: 'asc' }
      ],
      take: 30 // Aumentar límite
    });

    console.log(`[search-users] Usuarios encontrados para "${query}": ${users.length}`);

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
