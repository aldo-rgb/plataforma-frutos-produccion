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

    // Determinar si tiene una master organization
    let masterOrganization = null;
    let childOrganizations = [];

    if (organization.masterOrganizationId) {
      // Buscar la master organization en la tabla MasterOrganization
      console.log('📍 Buscando MasterOrganization ID:', organization.masterOrganizationId);
      
      masterOrganization = await prisma.masterOrganization.findUnique({
        where: { id: organization.masterOrganizationId },
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      });

      console.log('🏢 Master Organization encontrada:', masterOrganization);

      // Buscar todas las organizaciones que pertenecen a esta master
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

      console.log(`🏢 Sedes encontradas: ${childOrganizations.length}`, childOrganizations);
    } else {
      // No tiene master organization - retornar solo esta organización
      console.log('⚠️ Organización sin master, usando solo esta sede');
      childOrganizations = [{
        id: organization.id,
        name: organization.name,
        logoUrl: organization.logoUrl,
        brandColor: organization.brandColor,
        slug: organization.slug
      }];
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
