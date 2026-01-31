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
        const { cause, zone, additionalContext } = data;

        if (!cause) {
          return NextResponse.json({ error: 'Causa requerida' }, { status: 400 });
        }

        const prompt = `Eres un experto en proyectos de servicio comunitario en México. 
Genera 5 ideas de proyectos de impacto social para un grupo de jóvenes emprendedores.

Causa/Interés: ${cause}
${zone ? `Zona/Ciudad: ${zone}` : ''}
${additionalContext ? `Contexto adicional: ${additionalContext}` : ''}

Para cada proyecto incluye:
1. Nombre del proyecto (corto y memorable)
2. Descripción breve (2-3 oraciones)
3. Tipo de actividad (pintar, construir, limpiar, donar, enseñar, etc.)
4. Beneficiarios estimados
5. Presupuesto aproximado en MXN
6. Duración estimada

Responde SOLO con un JSON array con este formato:
[
  {
    "name": "Nombre del Proyecto",
    "description": "Descripción breve",
    "activityType": "Tipo de actividad",
    "beneficiaries": "100 niños",
    "estimatedBudget": 15000,
    "duration": "1 día"
  }
]`;

        const completion = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.8,
          max_tokens: 2000,
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
          origin,
          parentProjectId,
          aiGenerated,
          aiPrompt,
          coverImage,
          proposedDate
        } = data;

        // Validaciones
        if (!name || !description || !locationName || !contactName || !contactPhone) {
          return NextResponse.json(
            { error: 'Campos requeridos: name, description, locationName, contactName, contactPhone' },
            { status: 400 }
          );
        }

        const project = await prisma.tribeCommunityProject.create({
          data: {
            visionId: parseInt(visionId),
            name,
            description,
            category: category || 'OTHER',
            locationName,
            locationAddress,
            locationLat: locationLat ? parseFloat(locationLat) : null,
            locationLng: locationLng ? parseFloat(locationLng) : null,
            googleMapsUrl,
            contactName,
            contactPhone,
            contactEmail,
            contactRole,
            estimatedBudget: estimatedBudget ? parseFloat(estimatedBudget) : null,
            logistics,
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
        const { projectId, ...updateData } = data;

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
