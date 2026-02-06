import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    
    logger.debug('🔍 Searching organization with code:', code);

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

    logger.debug('🏢 Organization found:', organization);

    if (!organization) {
      logger.debug('❌ Organization not found');
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    // Determinar si tiene una master organization
    let masterOrganization = null;
    let childOrganizations: Array<{
      id: number;
      name: string;
      logoUrl: string | null;
      brandColor: string | null;
      slug: string;
    }> = [];

    if (organization.masterOrganizationId) {
      // Buscar la master organization en la tabla MasterOrganization
      logger.debug('📍 Buscando MasterOrganization ID:', organization.masterOrganizationId);
      
      const masterOrgData = await prisma.masterOrganization.findUnique({
        where: { id: organization.masterOrganizationId },
        select: {
          id: true,
          name: true,
          logoUrl: true
        }
      });

      logger.debug('🏢 Master Organization encontrada:', masterOrgData);

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

      logger.debug(`🏢 Sedes encontradas: ${childOrganizations.length}`, childOrganizations);

      // Agregar slug a la masterOrganization (usa el slug de la primera sede)
      if (masterOrgData) {
        masterOrganization = {
          ...masterOrgData,
          slug: childOrganizations[0]?.slug || organization.slug // Usar slug de primera sede o la actual
        };
      }
    } else {
      // No tiene master organization - retornar solo esta organización
      logger.debug('⚠️ Organización sin master, usando solo esta sede');
      childOrganizations = [{
        id: organization.id,
        name: organization.name,
        logoUrl: organization.logoUrl,
        brandColor: organization.brandColor,
        slug: organization.slug
      }];
    }

    logger.debug('✅ Master Organization:', masterOrganization);
    logger.debug('🏢 Child Organizations:', childOrganizations);

    const response = {
      success: true,
      masterOrganization,
      childOrganizations
    };

    logger.debug('✅ Sending response:', response);

    return NextResponse.json(response);

  } catch (error) {
    logger.error('Error fetching organization data:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener información' },
      { status: 500 }
    );
  }
}
