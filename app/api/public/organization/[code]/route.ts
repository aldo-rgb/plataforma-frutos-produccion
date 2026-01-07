import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    console.log('🔍 Searching organization with code:', code);

    // Buscar organización por ID o slug
    const organization = await prisma.organization.findFirst({
      where: {
        OR: [
          { slug: code },
          { id: !isNaN(Number(code)) ? parseInt(code) : 0 }
        ]
      },
      select: {
        id: true,
        name: true,
        logoUrl: true,
        brandColor: true,
        slug: true,
        masterOrganizationId: true
      }
    });

    console.log('🏢 Organization found:', organization);

    if (!organization) {
      console.log('❌ Organization not found');
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Determinar si es una organización master o hija
    let masterOrganization;
    let childOrganizations = [];

    if (organization.masterOrganizationId) {
      // Es una organización hija, buscar la master
      console.log('📍 Es organización HIJA, buscando master ID:', organization.masterOrganizationId);
      
      masterOrganization = await prisma.organization.findUnique({
        where: { id: organization.masterOrganizationId },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          brandColor: true,
          slug: true
        }
      });

      console.log('🏢 Master encontrada:', masterOrganization);

      // Buscar todas las organizaciones hijas de la master
      childOrganizations = await prisma.organization.findMany({
        where: {
          masterOrganizationId: organization.masterOrganizationId
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          brandColor: true,
          slug: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`🏢 Organizaciones hijas encontradas: ${childOrganizations.length}`, childOrganizations);
    } else {
      // Es una organización master
      console.log('👑 Es organización MASTER, buscando sus hijas...');
      masterOrganization = organization;

      // Buscar todas sus organizaciones hijas
      childOrganizations = await prisma.organization.findMany({
        where: {
          masterOrganizationId: organization.id
        },
        select: {
          id: true,
          name: true,
          logoUrl: true,
          brandColor: true,
          slug: true
        },
        orderBy: {
          name: 'asc'
        }
      });

      console.log(`🏢 Organizaciones hijas encontradas: ${childOrganizations.length}`, childOrganizations);

      // Si no hay organizaciones hijas, usar la organización master como única opción
      if (childOrganizations.length === 0) {
        console.log('⚠️ No hay hijas, usando master como única sede');
        childOrganizations = [{
          id: masterOrganization.id,
          name: masterOrganization.name,
          logoUrl: masterOrganization.logoUrl,
          brandColor: masterOrganization.brandColor,
          slug: masterOrganization.slug
        }];
      }
    }

    console.log('✅ Master Organization:', masterOrganization);
    console.log('🏢 Child Organizations:', childOrganizations);

    const response = {
      success: true,
      masterOrganization,
      childOrganizations
    };

    console.log('✅ Sending response:', response);

    return NextResponse.json(response);

  } catch (error) {
    console.error('Error fetching organization data:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener información' },
      { status: 500 }
    );
  }
}
