import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET /api/org/by-domain?domain=impactocuantico.net
// Retorna la organización que tiene ese dominio personalizado
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const domain = searchParams.get('domain');

    if (!domain) {
      return NextResponse.json({ error: 'Domain parameter required' }, { status: 400 });
    }

    // Limpiar el dominio (quitar www, puerto, etc.)
    const cleanDomain = domain
      .replace(/^www\./, '')
      .replace(/:\d+$/, '')
      .toLowerCase();

    const organization = await prisma.organization.findFirst({
      where: {
        customDomain: cleanDomain,
        status: 'ACTIVE',
        customLoginEnabled: true
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        loginBackgroundUrl: true,
        loginWelcomeMessage: true,
        showPoweredBy: true
      }
    });

    if (!organization) {
      return NextResponse.json({ found: false }, { status: 200 });
    }

    return NextResponse.json({
      found: true,
      organization
    });

  } catch (error) {
    console.error('Error fetching organization by domain:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
