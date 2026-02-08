import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import { rateLimit, RateLimitPresets } from '@/lib/rate-limit';


export async function GET(request: NextRequest) {
  try {
    // Rate limiting para APIs públicas
    const { response } = rateLimit(request, RateLimitPresets.public);
    if (response) {
      logger.warn('Rate limit exceeded on public/search-referrals');
      return response;
    }

    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get('query');
    const orgId = searchParams.get('orgId');

    if (!query || query.trim().length < 2) {
      return NextResponse.json({ users: [] });
    }

    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID required' }, { status: 400 });
    }

    // Obtener la organización seleccionada
    const organization = await prisma.organization.findUnique({
      where: { id: parseInt(orgId) },
      select: {
        masterOrganizationId: true,
        id: true,
      },
    });

    if (!organization) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Determinar el ID de la master organization
    const masterOrgId = organization.masterOrganizationId || organization.id;

    // Obtener todas las organizaciones relacionadas (master + hijas)
    const relatedOrgIds = await prisma.organization.findMany({
      where: {
        OR: [
          { id: masterOrgId },
          { masterOrganizationId: masterOrgId },
        ],
      },
      select: { id: true },
    });

    const orgIds = relatedOrgIds.map(org => org.id);

    // Buscar usuarios en todas las organizaciones relacionadas
    const users = await prisma.usuario.findMany({
      where: {
        AND: [
          {
            nombre: {
              contains: query.trim(),
              mode: 'insensitive',
            },
          },
          {
            organizationId: {
              in: orgIds,
            },
          },
        ],
      },
      select: {
        id: true,
        nombre: true,
        referralCode: true,
      },
      take: 10,
      orderBy: {
        nombre: 'asc',
      },
    });

    return NextResponse.json({ users });
  } catch (error) {
    logger.error('Error searching referrals:', error);
    return NextResponse.json(
      { error: 'Error al buscar referidos' },
      { status: 500 }
    );
  }
}
