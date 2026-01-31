import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// GET - Obtener datos del Legacy Forge para el capitán de comunitaria
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

    // También permitir acceso a staff
    const isStaff = await prisma.visionStaff.findFirst({
      where: {
        userId: userId,
        visionId: parseInt(visionId)
      }
    });

    if (!captainAssignment && !isStaff) {
      return NextResponse.json(
        { error: 'Solo el Capitán de Comunitaria puede acceder' }, 
        { status: 403 }
      );
    }

    // Obtener la visión y organización
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: {
        id: true,
        nombre: true,
        organizationId: true,
        Organization: {
          select: {
            id: true,
            name: true
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Obtener proyectos existentes de la visión
    const myProjects = await prisma.tribeCommunityProject.findMany({
      where: { visionId: parseInt(visionId) },
      orderBy: { createdAt: 'desc' }
    });

    // Obtener legados activos de la organización (para continuidad)
    const organizationLegacies = vision.organizationId ? await prisma.tribeCommunityProject.findMany({
      where: {
        vision: {
          organizationId: vision.organizationId
        },
        status: { in: ['COMPLETED', 'IN_PROGRESS'] },
        NOT: { visionId: parseInt(visionId) }
      },
      select: {
        id: true,
        name: true,
        description: true,
        category: true,
        locationName: true,
        status: true,
        coverImage: true,
        vision: {
          select: {
            nombre: true
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 20
    }) : [];

    // Obtener votaciones activas
    const activePolls = await prisma.tribePoll.findMany({
      where: {
        visionId: parseInt(visionId),
        category: 'COMMUNITY',
        status: { in: ['DRAFT', 'ACTIVE'] }
      },
      include: {
        options: {
          include: {
            project: true,
            _count: { select: { votes: true } }
          }
        },
        _count: {
          select: { votes: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Contar miembros de la tribu (para calcular quórum)
    const tribeMembers = await prisma.tribeOath.count({
      where: {
        visionId: parseInt(visionId)
      }
    });

    return NextResponse.json({
      vision: {
        id: vision.id,
        name: vision.nombre,
        organizationId: vision.organizationId,
        organizationName: vision.Organization?.name
      },
      myProjects,
      organizationLegacies,
      activePolls,
      tribeMembers,
      isCaptain: !!captainAssignment,
      isStaff: !!isStaff
    });

  } catch (error) {
    console.error('Error en Legacy Forge GET:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear proyecto, generar ideas con IA, crear votación
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;
    const body = await request.json();
    const { action, visionId, ...data } = body;

    if (!visionId) {
      return NextResponse.json({ error: 'visionId requerido' }, { status: 400 });
    }

    // Verificar permisos
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

    const isStaff = await prisma.visionStaff.findFirst({
      where: {
        userId: userId,
        visionId: parseInt(visionId)
      }
    });

    if (!captainAssignment && !isStaff) {
      return NextResponse.json(
        { error: 'Solo el Capitán de Comunitaria puede realizar esta acción' }, 
        { status: 403 }
      );
    }

    switch (action) {
      case 'generate_ideas': {
        // Generar ideas de proyectos con IA
        const { cause, zone, additionalContext, count = 3, budgetMin, budgetMax, impactLevel } = data;

        if (!cause) {
          return NextResponse.json({ error: 'Causa requerida' }, { status: 400 });
        }

        // Determinar rango de presupuesto
        const minBudget = budgetMin || 10000;
        const maxBudget = budgetMax || 30000;
        const impactDesc = impactLevel === 'big' 
          ? 'proyecto de ALTO IMPACTO que requiere más recursos pero transforma significativamente la comunidad'
          : 'proyecto alcanzable y realizable que marca un primer paso importante';

        const prompt = `Eres un experto en proyectos de servicio comunitario en México. 
Genera exactamente ${count} ideas de proyectos de impacto social para un grupo de jóvenes emprendedores.

Causa/Interés: ${cause}
${zone ? `Zona/Ciudad: ${zone}` : ''}
${additionalContext ? `Contexto adicional: ${additionalContext}` : ''}

IMPORTANTE - NIVEL DE IMPACTO: ${impactLevel === 'big' ? '🚀 GRANDE' : '🌱 INICIAL'}
Presupuesto requerido: Entre $${minBudget.toLocaleString()} y $${maxBudget.toLocaleString()} MXN
Tipo de proyecto: ${impactDesc}

Para cada proyecto incluye:
1. Nombre del proyecto (corto y memorable)
2. Descripción breve (2-3 oraciones explicando el impacto)
3. Tipo de actividad (pintar, construir, limpiar, donar, enseñar, etc.)
4. Beneficiarios estimados
5. Presupuesto aproximado en MXN (DEBE estar entre $${minBudget.toLocaleString()} y $${maxBudget.toLocaleString()} MXN)
6. IMPORTANTE: Desglose detallado del presupuesto (en qué se gastaría exactamente, que sume el total)
7. Duración estimada

${impactLevel === 'big' 
  ? 'Las ideas deben ser ambiciosas, transformadoras, pueden requerir 2-3 días de ejecución y equipos más grandes de 30-50 voluntarios.'
  : 'Las ideas deben ser realistas, alcanzables en 1 día, y con presupuestos que un grupo de 10-20 personas pueda recaudar fácilmente.'}

Responde SOLO con un JSON array con este formato exacto:
[
  {
    "name": "Nombre del Proyecto",
    "description": "Descripción breve del impacto que tendrá",
    "activityType": "Tipo de actividad principal",
    "beneficiaries": "Ej: 50 niños",
    "estimatedBudget": ${Math.round((minBudget + maxBudget) / 2)},
    "budgetBreakdown": [
      { "item": "Material principal", "cost": XXXX },
      { "item": "Herramientas/equipo", "cost": XXXX },
      { "item": "Comida para voluntarios", "cost": XXXX },
      { "item": "Transporte", "cost": XXXX },
      { "item": "Otros materiales", "cost": XXXX }
    ],
    "duration": "${impactLevel === 'big' ? '2-3 días' : '1 día'}"
  }
]`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 3000,
        });

        const responseText = completion.choices[0]?.message?.content || '[]';
        
        // Extraer JSON del response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        let ideas = [];
        
        if (jsonMatch) {
          try {
            ideas = JSON.parse(jsonMatch[0]);
          } catch (e) {
            console.error('Error parsing AI response:', e);
          }
        }

        return NextResponse.json({
          success: true,
          ideas,
          prompt: cause // Para guardar después si se elige una idea
        });
      }

      case 'create_project': {
        // Crear un nuevo proyecto comunitario
        const {
          name,
          description,
          category,
          locationPending,
          locationName,
          locationAddress,
          locationLat,
          locationLng,
          googleMapsUrl,
          contactName,
          contactPhone,
          contactEmail,
          contactRole,
          estimatedBudget,
          logistics,
          logisticsItems, // Nueva: lista de ítems de logística
          origin,
          parentProjectId,
          aiGenerated,
          aiPrompt,
          coverImage,
          proposedDate
        } = data;

        // Validaciones básicas
        if (!name || !description) {
          return NextResponse.json(
            { error: 'Campos requeridos: name, description' },
            { status: 400 }
          );
        }

        // Si no está pendiente la ubicación, se requieren los datos
        // locationPending indica que el lugar se definirá después
        if (!locationPending && locationName && (!contactName || !contactPhone)) {
          return NextResponse.json(
            { error: 'Si hay ubicación, se requieren datos de contacto' },
            { status: 400 }
          );
        }

        const project = await prisma.tribeCommunityProject.create({
          data: {
            visionId: parseInt(visionId),
            name,
            description,
            category: category || 'OTHER',
            locationName: locationName || 'Por definir',
            locationAddress: locationAddress || null,
            locationLat: locationLat ? parseFloat(locationLat) : null,
            locationLng: locationLng ? parseFloat(locationLng) : null,
            googleMapsUrl: googleMapsUrl || null,
            contactName: contactName || 'Por definir',
            contactPhone: contactPhone || 'Por definir',
            contactEmail: contactEmail || null,
            contactRole: contactRole || null,
            estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
            logistics: logistics || null,
            origin: origin || 'NEW',
            parentProjectId: parentProjectId ? parseInt(parentProjectId) : null,
            aiGenerated: aiGenerated || false,
            aiPrompt,
            coverImage,
            proposedDate: proposedDate ? new Date(proposedDate) : null,
            status: 'DRAFT',
            createdById: userId
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Proyecto creado exitosamente',
          project
        });
      }

      case 'update_project': {
        const { projectId, logisticsItems, locationPending, ...updateData } = data;

        if (!projectId) {
          return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });
        }

        // Verificar que el proyecto existe y pertenece a la visión
        const existingProject = await prisma.tribeCommunityProject.findFirst({
          where: {
            id: parseInt(projectId),
            visionId: parseInt(visionId)
          }
        });

        if (!existingProject) {
          return NextResponse.json({ error: 'Proyecto no encontrado' }, { status: 404 });
        }

        const project = await prisma.tribeCommunityProject.update({
          where: { id: parseInt(projectId) },
          data: {
            ...updateData,
            estimatedBudget: updateData.estimatedBudget ? parseFloat(updateData.estimatedBudget) : undefined,
            proposedDate: updateData.proposedDate ? new Date(updateData.proposedDate) : undefined
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Proyecto actualizado',
          project
        });
      }

      case 'create_poll': {
        // Crear una votación para elegir proyecto comunitario
        const { title, description: pollDescription, projectIds, endDate } = data;

        if (!title || !projectIds || projectIds.length < 2) {
          return NextResponse.json(
            { error: 'Se requieren al menos 2 proyectos para crear una votación' },
            { status: 400 }
          );
        }

        // Verificar que los proyectos existen
        const projects = await prisma.tribeCommunityProject.findMany({
          where: {
            id: { in: projectIds.map((id: string | number) => parseInt(String(id))) },
            visionId: parseInt(visionId)
          }
        });

        if (projects.length !== projectIds.length) {
          return NextResponse.json(
            { error: 'Algunos proyectos no fueron encontrados' },
            { status: 400 }
          );
        }

        // Crear la votación con sus opciones
        const poll = await prisma.tribePoll.create({
          data: {
            visionId: parseInt(visionId),
            title,
            description: pollDescription,
            category: 'COMMUNITY',
            status: 'DRAFT',
            endDate: endDate ? new Date(endDate) : null,
            createdById: userId,
            options: {
              create: projects.map((project: { id: number; name: string; description: string | null; coverImage: string | null }, index: number) => ({
                title: project.name,
                description: project.description,
                imageUrl: project.coverImage,
                projectId: project.id,
                displayOrder: index
              }))
            }
          },
          include: {
            options: {
              include: {
                project: true
              }
            }
          }
        });

        // Actualizar estado de los proyectos a PROPOSED
        await prisma.tribeCommunityProject.updateMany({
          where: { id: { in: projectIds.map((id: string | number) => parseInt(String(id))) } },
          data: { status: 'PROPOSED' }
        });

        return NextResponse.json({
          success: true,
          message: 'Votación creada exitosamente',
          poll
        });
      }

      case 'publish_poll': {
        // Publicar/activar una votación
        const { pollId } = data;

        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        const poll = await prisma.tribePoll.update({
          where: { id: parseInt(pollId) },
          data: {
            status: 'ACTIVE',
            startDate: new Date()
          }
        });

        // Actualizar proyectos a estado VOTING
        const options = await prisma.tribePollOption.findMany({
          where: { pollId: parseInt(pollId) },
          select: { projectId: true }
        });

        const projectIds = options.filter((o: { projectId: number | null }) => o.projectId).map((o: { projectId: number | null }) => o.projectId!);
        
        await prisma.tribeCommunityProject.updateMany({
          where: { id: { in: projectIds } },
          data: { status: 'VOTING' }
        });

        // TODO: Enviar notificación a toda la tribu

        return NextResponse.json({
          success: true,
          message: 'Votación publicada. ¡La tribu ya puede votar!',
          poll
        });
      }

      case 'close_poll': {
        // Cerrar votación y determinar ganador
        const { pollId } = data;

        if (!pollId) {
          return NextResponse.json({ error: 'pollId requerido' }, { status: 400 });
        }

        // Obtener votación con votos
        const poll = await prisma.tribePoll.findUnique({
          where: { id: parseInt(pollId) },
          include: {
            options: {
              include: {
                votes: true,
                project: true
              }
            }
          }
        });

        if (!poll) {
          return NextResponse.json({ error: 'Votación no encontrada' }, { status: 404 });
        }

        // Calcular votos por opción
        interface PollOption {
          id: number;
          projectId: number | null;
          title: string;
          project: { name: string } | null;
          votes: { weight: number }[];
        }
        
        interface PollResult {
          optionId: number;
          projectId: number | null;
          projectName: string;
          totalVotes: number;
        }
        
        const results: PollResult[] = poll.options.map((option: PollOption) => ({
          optionId: option.id,
          projectId: option.projectId,
          projectName: option.project?.name || option.title,
          totalVotes: option.votes.reduce((sum: number, vote: { weight: number }) => sum + vote.weight, 0)
        })).sort((a: PollResult, b: PollResult) => b.totalVotes - a.totalVotes);

        // Determinar ganador
        const winner = results[0];
        const issTie = results.length > 1 && results[0].totalVotes === results[1].totalVotes;

        // Si hay empate, el voto del capitán/staff vale doble
        // (esto ya se maneja con el campo weight al votar)

        // Cerrar la votación
        await prisma.tribePoll.update({
          where: { id: parseInt(pollId) },
          data: {
            status: 'CLOSED',
            closedAt: new Date(),
            closedById: userId
          }
        });

        // Actualizar proyecto ganador a APPROVED
        if (winner.projectId) {
          await prisma.tribeCommunityProject.update({
            where: { id: winner.projectId },
            data: { status: 'APPROVED' }
          });

          // Los demás proyectos quedan como PROPOSED (no ganaron)
          const loserProjectIds = results
            .filter((r: PollResult) => r.projectId && r.projectId !== winner.projectId)
            .map((r: PollResult) => r.projectId!);

          if (loserProjectIds.length > 0) {
            await prisma.tribeCommunityProject.updateMany({
              where: { id: { in: loserProjectIds } },
              data: { status: 'DRAFT' } // Vuelven a borrador
            });
          }
        }

        return NextResponse.json({
          success: true,
          message: issTie 
            ? `Votación cerrada. Hubo empate, el voto del líder definió: ${winner.projectName}` 
            : `Votación cerrada. Ganador: ${winner.projectName}`,
          results,
          winner,
          isTie: issTie
        });
      }

      // ============ LOGÍSTICA ============
      // TODO: Descomentar después de correr `npx prisma generate` con el nuevo schema
      /*
      case 'add_logistics_item': {
        const { projectId, name, quantity, category: itemCategory, estimatedCost, notes } = data;

        if (!projectId || !name) {
          return NextResponse.json({ error: 'projectId y name son requeridos' }, { status: 400 });
        }

        const item = await prisma.projectLogisticsItem.create({
          data: {
            projectId: parseInt(projectId),
            name,
            quantity: quantity || 1,
            category: itemCategory || 'OTHER',
            estimatedCost: estimatedCost ? parseFloat(estimatedCost) : null,
            notes: notes || null,
            status: 'PENDING'
          }
        });

        return NextResponse.json({
          success: true,
          message: 'Ítem de logística agregado',
          item
        });
      }

      case 'assign_logistics_item': {
        const { itemId, unassign } = data;

        if (!itemId) {
          return NextResponse.json({ error: 'itemId requerido' }, { status: 400 });
        }

        // Verificar que el ítem existe
        const item = await prisma.projectLogisticsItem.findUnique({
          where: { id: parseInt(itemId) },
          include: { project: true }
        });

        if (!item) {
          return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
        }

        // Verificar que el proyecto pertenece a la visión
        if (item.project.visionId !== parseInt(visionId)) {
          return NextResponse.json({ error: 'No tienes acceso a este proyecto' }, { status: 403 });
        }

        if (unassign) {
          // Solo puede desasignarse si es el mismo usuario o si es capitán
          if (item.assignedToId !== userId && !isCaptain) {
            return NextResponse.json({ error: 'No puedes desasignar este ítem' }, { status: 403 });
          }

          await prisma.projectLogisticsItem.update({
            where: { id: parseInt(itemId) },
            data: {
              assignedToId: null,
              assignedAt: null,
              status: 'PENDING'
            }
          });

          return NextResponse.json({
            success: true,
            message: 'Te has desasignado del ítem'
          });
        } else {
          // Asignarse al ítem
          if (item.assignedToId && item.assignedToId !== userId) {
            return NextResponse.json({ error: 'Este ítem ya está asignado a otra persona' }, { status: 400 });
          }

          await prisma.projectLogisticsItem.update({
            where: { id: parseInt(itemId) },
            data: {
              assignedToId: userId,
              assignedAt: new Date(),
              status: 'ASSIGNED'
            }
          });

          return NextResponse.json({
            success: true,
            message: '¡Te has asignado a este ítem!'
          });
        }
      }

      case 'update_logistics_status': {
        const { itemId, status: newStatus } = data;

        if (!itemId || !newStatus) {
          return NextResponse.json({ error: 'itemId y status requeridos' }, { status: 400 });
        }

        const validStatuses = ['PENDING', 'ASSIGNED', 'ACQUIRED', 'DELIVERED'];
        if (!validStatuses.includes(newStatus)) {
          return NextResponse.json({ error: 'Status inválido' }, { status: 400 });
        }

        const item = await prisma.projectLogisticsItem.findUnique({
          where: { id: parseInt(itemId) },
          include: { project: true }
        });

        if (!item) {
          return NextResponse.json({ error: 'Ítem no encontrado' }, { status: 404 });
        }

        // Solo el asignado o un capitán pueden actualizar el status
        if (item.assignedToId !== userId && !isCaptain) {
          return NextResponse.json({ error: 'No puedes actualizar este ítem' }, { status: 403 });
        }

        await prisma.projectLogisticsItem.update({
          where: { id: parseInt(itemId) },
          data: { status: newStatus }
        });

        return NextResponse.json({
          success: true,
          message: 'Status actualizado'
        });
      }

      case 'get_project_logistics': {
        const { projectId } = data;

        if (!projectId) {
          return NextResponse.json({ error: 'projectId requerido' }, { status: 400 });
        }

        const items = await prisma.projectLogisticsItem.findMany({
          where: { projectId: parseInt(projectId) },
          include: {
            assignedTo: {
              select: { id: true, nombre: true, profileImage: true }
            }
          },
          orderBy: [
            { status: 'asc' },
            { category: 'asc' },
            { name: 'asc' }
          ]
        });

        return NextResponse.json({
          success: true,
          items
        });
      }
      */

      default:
        return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });
    }

  } catch (error) {
    console.error('Error en Legacy Forge POST:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
