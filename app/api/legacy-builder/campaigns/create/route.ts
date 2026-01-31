import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

// POST - Crear una nueva campaña de Legacy Builder
// Solo puede ser creada por el Capitán de Comunitaria Grupal (COMMUNITY_SERVICE)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    
    const { 
      title, 
      description, 
      story,
      goalAmount, 
      visionId,
      projectId, // Opcional - si no se proporciona, se busca o crea uno
      coverImage,
      videoUrl
    } = body;

    // Validaciones básicas
    if (!title || !goalAmount || !visionId) {
      return NextResponse.json(
        { error: 'Se requieren: title, goalAmount, visionId' }, 
        { status: 400 }
      );
    }

    // Verificar que el usuario es el Capitán de Comunitaria Grupal de la visión
    const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: visionId,
          roleType: 'COMMUNITY_SERVICE'
        }
      },
      include: {
        captaincy: true
      }
    });

    if (!captainAssignment) {
      return NextResponse.json(
        { error: 'Solo el Capitán de Comunitaria Grupal puede crear campañas' }, 
        { status: 403 }
      );
    }

    // Obtener la visión y organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      include: {
        Organization: true
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    if (!vision.organizationId) {
      return NextResponse.json({ error: 'Visión sin organización asignada' }, { status: 400 });
    }

    // Verificar si ya existe una campaña para esta visión
    const existingCampaign = await prisma.legacyCampaign.findFirst({
      where: {
        visionId: visionId,
        status: { notIn: ['CANCELLED'] }
      }
    });

    if (existingCampaign) {
      return NextResponse.json(
        { error: 'Ya existe una campaña activa para esta visión' }, 
        { status: 400 }
      );
    }

    const organizationId = vision.organizationId;
    const orgName = vision.Organization?.name || 'Organización';

    // Buscar o crear un proyecto para la organización
    let project;
    if (projectId) {
      project = await prisma.legacyProject.findFirst({
        where: {
          id: projectId,
          organizationId: organizationId
        }
      });
      if (!project) {
        return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
      }
    } else {
      // Buscar un proyecto activo existente de la organización o crear uno
      project = await prisma.legacyProject.findFirst({
        where: {
          organizationId: organizationId,
          status: { in: ['DRAFT', 'ACTIVE'] }
        }
      });

      if (!project) {
        // Crear un proyecto base para la organización
        const orgSlug = generateSlug(`${orgName}-legacy`);
        let uniqueSlug = orgSlug;
        let slugCounter = 1;
        
        while (await prisma.legacyProject.findUnique({ where: { slug: uniqueSlug } })) {
          uniqueSlug = `${orgSlug}-${slugCounter}`;
          slugCounter++;
        }

        project = await prisma.legacyProject.create({
          data: {
            title: `Proyecto Comunitario ${orgName}`,
            slug: uniqueSlug,
            description: `Proyecto de impacto comunitario de ${orgName}`,
            goalAmount: 500000, // Meta base del proyecto global
            organizationId: organizationId,
            status: 'ACTIVE',
            isPublic: true,
            category: 'Comunitario'
          }
        });
      }
    }

    // Generar slug único para la campaña
    const baseSlug = generateSlug(`${vision.nombre}-${title}`);
    let campaignSlug = baseSlug;
    let slugCounter = 1;
    
    while (await prisma.legacyCampaign.findUnique({ where: { slug: campaignSlug } })) {
      campaignSlug = `${baseSlug}-${slugCounter}`;
      slugCounter++;
    }

    // Crear la campaña
    const campaign = await prisma.legacyCampaign.create({
      data: {
        projectId: project.id,
        visionId: visionId,
        captainId: userId,
        title: title,
        slug: campaignSlug,
        description: description || '',
        story: story || '',
        coverImage: coverImage || null,
        videoUrl: videoUrl || null,
        goalAmount: parseFloat(goalAmount),
        status: 'DRAFT', // Empieza como borrador para revisión
        isPublic: false
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true
          }
        },
        vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    // Agregar al capitán como miembro de la campaña
    await prisma.legacyCampaignMember.create({
      data: {
        campaignId: campaign.id,
        userId: userId,
        role: 'CAPTAIN',
        referralUrl: `${process.env.NEXT_PUBLIC_APP_URL}/legado/${campaign.slug}`
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Campaña creada exitosamente',
      campaign: {
        id: campaign.id,
        title: campaign.title,
        slug: campaign.slug,
        status: campaign.status,
        goalAmount: campaign.goalAmount,
        project: campaign.project,
        vision: campaign.vision
      }
    });

  } catch (error) {
    console.error('Error creating legacy campaign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// GET - Obtener campaña existente del capitán de comunitaria
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar que el usuario es el Capitán de Comunitaria Grupal
    const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
      where: {
        userId: userId,
        status: 'ACCEPTED',
        captaincy: {
          visionId: parseInt(visionId),
          roleType: 'COMMUNITY_SERVICE'
        }
      }
    });

    if (!captainAssignment) {
      return NextResponse.json(
        { error: 'No autorizado - no eres capitán de comunitaria' }, 
        { status: 403 }
      );
    }

    // Buscar campaña existente
    const campaign = await prisma.legacyCampaign.findFirst({
      where: {
        visionId: parseInt(visionId),
        captainId: userId,
        status: { notIn: ['CANCELLED'] }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            slug: true,
            goalAmount: true,
            raisedAmount: true
          }
        },
        _count: {
          select: {
            donations: true,
            members: true,
            expenses: true
          }
        }
      }
    });

    // Buscar proyectos disponibles para la organización del usuario
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { organizationId: true }
    });

    const availableProjects = user?.organizationId ? await prisma.legacyProject.findMany({
      where: {
        organizationId: user.organizationId,
        status: { in: ['DRAFT', 'ACTIVE'] }
      },
      select: {
        id: true,
        title: true,
        goalAmount: true,
        raisedAmount: true,
        category: true
      }
    }) : [];

    return NextResponse.json({
      campaign: campaign || null,
      availableProjects,
      hasCampaign: !!campaign
    });

  } catch (error) {
    console.error('Error fetching captain campaign:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
