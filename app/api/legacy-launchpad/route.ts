import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Helper para generar slug único
function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Quitar acentos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  
  const randomSuffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${randomSuffix}`;
}

// POST - Lanzar un proyecto (crear campaña pública)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();

    const {
      action,
      visionId,
      communityProjectId, // ID del proyecto de la Fragua
      title,
      description,
      story,
      goalAmount,
      budgetBreakdown,
      beneficiaries,
      beneficiariesCount,
      duration,
      activity,
      category,
      coverImageBase64, // Imagen generada con logo
      coverImageUrl, // O URL directa
    } = body;

    if (action === 'launch') {
      // Verificar que el usuario sea capitán de la visión
      const captainAssignment = await prisma.tribeCaptainAssignment.findFirst({
        where: {
          captaincy: {
            visionId: parseInt(visionId),
            isActive: true,
          },
          userId,
          status: 'ACCEPTED',
        },
      });

      if (!captainAssignment) {
        return NextResponse.json({ 
          error: 'Solo los capitanes pueden lanzar proyectos' 
        }, { status: 403 });
      }

      // Obtener la visión con su organización
      const vision = await prisma.vision.findUnique({
        where: { id: parseInt(visionId) },
        include: { Organization: true },
      });

      if (!vision || !vision.organizationId) {
        return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
      }

      // Generar slug único
      const slug = generateSlug(title);

      // Para la imagen, usar URL directa o la que venga
      let finalCoverImage = coverImageUrl || '';
      if (coverImageBase64 && coverImageBase64.startsWith('data:image')) {
        // Si es base64, guardarla directamente (o puedes subirla a tu propio storage)
        // Por ahora, usamos la URL si viene
        finalCoverImage = coverImageUrl || coverImageBase64;
      }

      // Buscar o crear proyecto base de la organización
      let legacyProject = await prisma.legacyProject.findFirst({
        where: {
          organizationId: vision.organizationId,
          category: category || 'OTHER',
          status: 'ACTIVE',
        },
      });

      if (!legacyProject) {
        // Crear proyecto base para la organización
        legacyProject = await prisma.legacyProject.create({
          data: {
            title: `Proyectos ${categoryLabels[category] || 'Comunitarios'} - ${vision.Organization?.name || 'Comunidad'}`,
            slug: `org-${vision.organizationId}-${category?.toLowerCase() || 'general'}-${Date.now()}`,
            description: `Proyectos de impacto social de ${vision.Organization?.name || 'la comunidad'}`,
            goalAmount: 0,
            organizationId: vision.organizationId,
            status: 'ACTIVE',
            isPublic: true,
            category: category || 'OTHER',
          },
        });
      }

      // Crear la campaña pública
      const campaign = await prisma.legacyCampaign.create({
        data: {
          projectId: legacyProject.id,
          visionId: parseInt(visionId),
          captainId: userId,
          title,
          slug,
          description,
          story,
          coverImage: finalCoverImage,
          logoImage: vision.tribeLogoUrl || null,
          goalAmount: parseFloat(goalAmount) || 0,
          status: 'ACTIVE',
          isPublic: true,
          startDate: new Date(),
        },
      });

      // Agregar al capitán como miembro de la campaña
      await prisma.legacyCampaignMember.create({
        data: {
          campaignId: campaign.id,
          userId,
          role: 'CAPTAIN',
        },
      });

      // Guardar metadata extendida en expenses como gastos planeados
      if (budgetBreakdown && budgetBreakdown.length > 0) {
        // Crear gastos con status REQUESTED que actuará como planeado
        for (const item of budgetBreakdown) {
          await prisma.legacyExpense.create({
            data: {
              campaignId: campaign.id,
              requestedById: userId,
              concept: item.item,
              description: `Presupuesto estimado: ${item.item}`,
              amount: parseFloat(item.amount) || 0,
              status: 'REQUESTED', // Usar REQUESTED como "planeado"
            },
          });
        }
      }

      // Si viene de un proyecto de la Fragua, actualizar su estado
      if (communityProjectId) {
        await prisma.$executeRaw`
          UPDATE "CommunityProject" 
          SET status = 'LAUNCHED', "launchedCampaignId" = ${campaign.id}
          WHERE id = ${communityProjectId}
        `.catch(() => {
          // Ignorar si la tabla no existe
        });
      }

      // 🎯 CREAR CUOTAS SOLO PARA PARTICIPANTES EN NIVEL PL (Liderato en curso)
      // con asistencia en el primer fin de semana de Liderato
      const plEnrollments = await prisma.vision_enrollments.findMany({
        where: {
          visionId: parseInt(visionId),
          enrollmentStatus: 'ENROLLED',
          level: 'PL', // Solo nivel PL (Liderato)
          attendanceStatus: 'ATTENDED', // Solo con asistencia confirmada
        },
        include: {
          Usuario_vision_enrollments_userIdToUsuario: {
            select: { id: true, nombre: true, email: true },
          },
        },
      });

      // Crear lista de participantes PL
      const participants = plEnrollments
        .filter(e => e.Usuario_vision_enrollments_userIdToUsuario)
        .map(e => ({
          id: e.Usuario_vision_enrollments_userIdToUsuario!.id,
          nombre: e.Usuario_vision_enrollments_userIdToUsuario!.nombre,
          email: e.Usuario_vision_enrollments_userIdToUsuario!.email,
        }));

      const participantCount = participants.length;
      const totalBudget = parseFloat(goalAmount) || 0;
      let quotaPerParticipant = 0;

      // Si hay participantes PL, crear cuotas
      if (participantCount > 0 && totalBudget > 0) {
        quotaPerParticipant = Math.ceil(totalBudget / participantCount);

        // Buscar cuenta bancaria de la visión
        const bankAccount = await prisma.tribeBankAccount.findFirst({
          where: { visionId: parseInt(visionId), isActive: true },
        });

        // Crear cuota para cada participante PL
        const incomePromises = participants.map((user) => {
          return prisma.tribeIncome.create({
            data: {
              visionId: parseInt(visionId),
              bankAccountId: bankAccount?.id || null,
              category: 'LEGACY_FORGE',
              concept: `Cuota proyecto: ${title}`,
              amount: quotaPerParticipant,
              payerUserId: user.id,
              payerName: user.nombre,
              payerEmail: user.email,
              status: 'PENDING',
              proofNotes: JSON.stringify({
                campaignId: campaign.id,
                campaignSlug: campaign.slug,
                totalBudget,
                participantCount,
                quotaPerParticipant,
              }),
            },
          });
        });

        await Promise.all(incomePromises);
      }

      return NextResponse.json({
        success: true,
        message: '¡Proyecto lanzado exitosamente!',
        campaign: {
          id: campaign.id,
          slug: campaign.slug,
          publicUrl: `/legado/${campaign.slug}`,
        },
        quotas: participantCount > 0 ? {
          totalBudget,
          participantCount,
          quotaPerParticipant,
          message: `Se crearon ${participantCount} cuotas de $${quotaPerParticipant.toLocaleString()} cada una`,
        } : null,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error) {
    console.error('Error in legacy-launchpad API:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

// GET - Obtener campañas del usuario o de la visión
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    const campaigns = await prisma.legacyCampaign.findMany({
      where: {
        visionId: parseInt(visionId),
      },
      include: {
        captain: {
          select: { id: true, nombre: true, imagen: true },
        },
        _count: {
          select: { donations: true, members: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json({
      success: true,
      campaigns,
    });

  } catch (error) {
    console.error('Error fetching campaigns:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

const categoryLabels: Record<string, string> = {
  CHILDREN: 'Niños',
  ELDERLY: 'Adultos Mayores',
  ANIMALS: 'Animales',
  ECOLOGICAL: 'Ecológicos',
  EDUCATION: 'Educación',
  HEALTH: 'Salud',
  HOUSING: 'Vivienda',
  FOOD: 'Alimentación',
  OTHER: 'Comunitarios',
};
