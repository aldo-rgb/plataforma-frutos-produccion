import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// GET - Obtener datos para la landing page de una organización
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  let currentStep = 'init';
  
  try {
    currentStep = 'params';
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug no proporcionado' },
        { status: 400 }
      );
    }

    currentStep = 'find-org';
    // Buscar organización por slug
    const organization = await prisma.organization.findFirst({
      where: { 
        slug: slug,
        status: 'ACTIVE'
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        loginBackgroundUrl: true,
        loginWelcomeMessage: true,
        showPoweredBy: true,
        customLoginEnabled: true,
        address: true,
        contactEmail: true,
        masterOrganizationId: true
      }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    currentStep = 'sibling-orgs';
    // Obtener todas las organizaciones de la misma Master Organization
    let siblingOrganizationIds: number[] = [organization.id];
    
    if (organization.masterOrganizationId) {
      const siblingOrgs = await prisma.organization.findMany({
        where: {
          masterOrganizationId: organization.masterOrganizationId,
          status: 'ACTIVE'
        },
        select: { id: true }
      });
      siblingOrganizationIds = siblingOrgs.map(o => o.id);
    }

    currentStep = 'find-trainings';
    // Obtener próximos entrenamientos vigentes de TODAS las organizaciones hermanas
    const now = new Date();
    const upcomingTrainings = await prisma.vision.findMany({
      where: {
        organizationId: { in: siblingOrganizationIds },
        isActive: true,
        startDate: {
          gte: now
        }
      },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        startDate: true,
        endDate: true,
        advancedStartDate: true,
        advancedEndDate: true,
        plWeekend1StartDate: true,
        plWeekend1EndDate: true,
        enabledLevels: true,
        maxParticipantes: true,
        Organization: {
          select: {
            id: true,
            name: true,
            slug: true
          }
        },
        Ticket: {
          where: {
            status: 'ACTIVE',
            paymentStatus: 'PAID'
          },
          select: {
            id: true
          }
        }
      },
      orderBy: {
        startDate: 'asc'
      },
      take: 6 // Aumentado a 6 para mostrar más entrenamientos de diferentes sedes
    });

    currentStep = 'format-trainings';
    // Formatear entrenamientos con información de niveles y sede
    const formattedTrainings = upcomingTrainings.map(training => {
      const levels = [];
      
      if (training.enabledLevels.includes('BASIC') && training.startDate) {
        levels.push({
          level: 'BASIC',
          name: 'Básico',
          startDate: training.startDate,
          endDate: training.endDate
        });
      }
      
      if (training.enabledLevels.includes('ADVANCED') && training.advancedStartDate) {
        levels.push({
          level: 'ADVANCED',
          name: 'Avanzado',
          startDate: training.advancedStartDate,
          endDate: training.advancedEndDate
        });
      }
      
      if (training.enabledLevels.includes('PL') && training.plWeekend1StartDate) {
        levels.push({
          level: 'PL',
          name: 'Programa de Liderazgo',
          startDate: training.plWeekend1StartDate,
          endDate: training.plWeekend1EndDate
        });
      }

      const ticketCount = training.Ticket.length;

      return {
        id: training.id,
        nombre: training.nombre,
        descripcion: training.descripcion,
        levels,
        spotsAvailable: training.maxParticipantes 
          ? training.maxParticipantes - ticketCount
          : null,
        participantsCount: ticketCount,
        // Información de la sede
        organization: {
          id: training.Organization.id,
          name: training.Organization.name,
          slug: training.Organization.slug
        }
      };
    });

    // Obtener testimonios (si existen)
    // Por ahora usaremos testimonios estáticos, pero aquí se puede agregar lógica para obtenerlos de la BD
    const testimonials = [
      {
        id: 1,
        name: 'María González',
        role: 'Empresaria',
        videoUrl: null,
        quote: 'El programa transformó completamente mi perspectiva de vida y negocios. No es un curso, es un despertar.',
        avatarUrl: null
      },
      {
        id: 2,
        name: 'Carlos Mendoza',
        role: 'Director de Operaciones',
        videoUrl: null,
        quote: 'Después de 15 años en el mundo corporativo, pensé que lo había visto todo. Estaba equivocado.',
        avatarUrl: null
      },
      {
        id: 3,
        name: 'Ana Lucía Ramírez',
        role: 'Coach de Vida',
        videoUrl: null,
        quote: 'Las herramientas que adquirí me permiten impactar a cientos de personas cada mes.',
        avatarUrl: null
      }
    ];

    // Estadísticas de la organización
    const stats = await prisma.ticket.count({
      where: {
        vision: {
          organizationId: organization.id
        },
        status: 'ACTIVE',
        paymentStatus: 'PAID'
      }
    });

    currentStep = 'count-usuarios';
    // Contar toda la comunidad Quantum Matter (usuarios activos)
    const comunidadTotal = await prisma.usuario.count({
      where: {
        isActive: true
      }
    });

    return NextResponse.json({
      success: true,
      organization: {
        ...organization,
        stats: {
          comunidadQuantumMatter: comunidadTotal,
          graduadosMundo: '+1M',
          habitantesMundo: '8.3B',
          añosExperiencia: 25
        }
      },
      upcomingTrainings: formattedTrainings,
      testimonials
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('Error fetching org landing:', { error: errorMessage, step: currentStep });
    return NextResponse.json(
      { success: false, error: `Error al obtener la información (step: ${currentStep})`, details: errorMessage },
      { status: 500 }
    );
  }
}
