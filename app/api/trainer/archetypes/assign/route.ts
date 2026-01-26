import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// GET - Obtener asignaciones del trainer
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const productId = searchParams.get('productId');
    const status = searchParams.get('status');

    // Construir filtro
    const whereClause: any = {
      assignedById: userId
    };

    if (visionId) whereClause.visionId = parseInt(visionId);
    if (productId) whereClause.productId = parseInt(productId);
    if (status) whereClause.status = status;

    const assignments = await prisma.archetypeAssignment.findMany({
      where: whereClause,
      include: {
        Archetype: {
          select: {
            id: true,
            name: true,
            category: true,
            maneraSerTag: true,
            maneraSerLabel: true,
            imageUrl: true
          }
        },
        Participant: {
          select: {
            id: true,
            nombre: true,
            email: true,
            profileImage: true
          }
        },
        Vision: {
          select: { id: true, nombre: true }
        },
        Product: {
          select: { id: true, name: true, levelType: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Estadísticas
    const stats = {
      total: assignments.length,
      sent: assignments.filter(a => a.status === 'SENT').length,
      viewed: assignments.filter(a => a.status === 'VIEWED').length,
      accepted: assignments.filter(a => a.status === 'ACCEPTED').length,
      transformed: assignments.filter(a => a.status === 'TRANSFORMED').length
    };

    return NextResponse.json({ assignments, stats });

  } catch (error) {
    console.error('Error fetching assignments:', error);
    return NextResponse.json({ error: 'Error al obtener asignaciones' }, { status: 500 });
  }
}

// POST - Asignar arquetipo a uno o más participantes
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = parseInt(session.user.id);
    const body = await request.json();

    const { 
      archetypeId, 
      participantIds, // Array de IDs
      visionId, 
      productId, 
      customNote 
    } = body;

    // Validaciones
    if (!archetypeId || !participantIds || !Array.isArray(participantIds) || participantIds.length === 0) {
      return NextResponse.json({ 
        error: 'Se requiere archetypeId y al menos un participantId' 
      }, { status: 400 });
    }

    // Verificar que el arquetipo existe
    const archetype = await prisma.archetype.findUnique({
      where: { id: archetypeId }
    });

    if (!archetype || !archetype.isActive) {
      return NextResponse.json({ error: 'Arquetipo no encontrado o inactivo' }, { status: 404 });
    }

    // Verificar que el usuario puede asignar (trainer del producto o con acceso al arquetipo)
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { rol: true, organizationId: true }
    });

    if (!user || !['TRAINER', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado para asignar arquetipos' }, { status: 403 });
    }

    // Crear asignaciones para cada participante
    const assignments = await Promise.all(
      participantIds.map(async (participantId: number) => {
        // Verificar si ya existe una asignación de este arquetipo para este participante en este contexto
        const existing = await prisma.archetypeAssignment.findFirst({
          where: {
            archetypeId,
            participantId,
            ...(visionId && { visionId }),
            ...(productId && { productId })
          }
        });

        if (existing) {
          return { participantId, skipped: true, reason: 'Ya tiene este arquetipo asignado' };
        }

        const assignment = await prisma.archetypeAssignment.create({
          data: {
            archetypeId,
            participantId,
            assignedById: userId,
            visionId: visionId || null,
            productId: productId || null,
            customNote,
            status: 'SENT'
          },
          include: {
            Archetype: {
              select: { name: true, maneraSerLabel: true }
            },
            Participant: {
              select: { id: true, nombre: true }
            }
          }
        });

        // Crear notificación para el participante
        await prisma.notification.create({
          data: {
            userId: participantId,
            type: 'ARCHETYPE_ASSIGNMENT',
            title: '🎭 ¡Nuevo Personaje Asignado!',
            message: `Tu entrenador te asignó el personaje "${archetype.name}" - ${archetype.maneraSerLabel || 'Manera de Ser'}. ¡Revísalo en tus tareas!`,
            relatedId: assignment.id
          }
        });

        // Crear AdminTask de tipo ARCHETYPE_REVIEW
        const adminTask = await prisma.adminTask.create({
          data: {
            titulo: `🎭 Revisar Personaje: ${archetype.name}`,
            descripcion: `Tu entrenador te asignó el personaje "${archetype.name}" (${archetype.maneraSerLabel}). Revisa los detalles de tu personaje y completa esta tarea.${customNote ? `\n\nNota del entrenador: ${customNote}` : ''}`,
            type: 'ARCHETYPE_REVIEW',
            pointsReward: 100,
            requiereEvidencia: false,
            targetType: 'USER',
            targetId: participantId,
            isActive: true,
            createdBy: userId,
            updatedAt: new Date(),
            fechaLimite: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 días para completar
          }
        });

        // Crear TaskSubmission para que aparezca en el dashboard
        await prisma.taskSubmission.create({
          data: {
            adminTaskId: adminTask.id,
            usuarioId: participantId,
            status: 'PENDING'
          }
        });

        console.log(`✅ Arquetipo ${archetype.name} asignado a participante ${participantId} con tarea y notificación`);

        return { participantId, assignment, success: true };
      })
    );

    const successful = assignments.filter(a => a.success);
    const skipped = assignments.filter(a => a.skipped);

    return NextResponse.json({ 
      message: `${successful.length} asignaciones creadas${skipped.length > 0 ? `, ${skipped.length} omitidas` : ''}`,
      assignments: successful.map(a => a.assignment),
      skipped
    }, { status: 201 });

  } catch (error) {
    console.error('Error creating assignment:', error);
    return NextResponse.json({ error: 'Error al crear asignación' }, { status: 500 });
  }
}

// PUT - Cambiar el arquetipo de una asignación existente
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const userId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id;
    const body = await request.json();

    const { assignmentId, newArchetypeId, customNote } = body;

    if (!assignmentId || !newArchetypeId) {
      return NextResponse.json({ 
        error: 'Se requiere assignmentId y newArchetypeId' 
      }, { status: 400 });
    }

    // Verificar que la asignación existe y pertenece a este trainer
    const existingAssignment = await prisma.archetypeAssignment.findUnique({
      where: { id: assignmentId },
      include: {
        Participant: { select: { id: true, nombre: true } },
        Archetype: { select: { name: true } }
      }
    });

    if (!existingAssignment) {
      return NextResponse.json({ error: 'Asignación no encontrada' }, { status: 404 });
    }

    if (existingAssignment.assignedById !== userId) {
      return NextResponse.json({ error: 'No autorizado para modificar esta asignación' }, { status: 403 });
    }

    // Verificar que el nuevo arquetipo existe
    const newArchetype = await prisma.archetype.findUnique({
      where: { id: newArchetypeId }
    });

    if (!newArchetype || !newArchetype.isActive) {
      return NextResponse.json({ error: 'Nuevo arquetipo no encontrado o inactivo' }, { status: 404 });
    }

    // Actualizar la asignación con el nuevo arquetipo
    const updatedAssignment = await prisma.archetypeAssignment.update({
      where: { id: assignmentId },
      data: {
        archetypeId: newArchetypeId,
        customNote: customNote || existingAssignment.customNote,
        status: 'SENT', // Reiniciar el status
        viewedAt: null,
        acceptedAt: null,
        transformedAt: null,
        updatedAt: new Date()
      },
      include: {
        Archetype: {
          select: { name: true, maneraSerLabel: true, imageUrl: true }
        },
        Participant: {
          select: { id: true, nombre: true }
        }
      }
    });

    // Crear notificación de cambio
    await prisma.notification.create({
      data: {
        userId: existingAssignment.participantId,
        type: 'ARCHETYPE_ASSIGNMENT',
        title: '🎭 Personaje Actualizado',
        message: `Tu entrenador cambió tu personaje de "${existingAssignment.Archetype.name}" a "${newArchetype.name}" - ${newArchetype.maneraSerLabel}. ¡Revísalo en tus tareas!`,
        relatedId: assignmentId
      }
    });

    console.log(`✅ Arquetipo cambiado de ${existingAssignment.Archetype.name} a ${newArchetype.name} para participante ${existingAssignment.participantId}`);

    return NextResponse.json({ 
      message: 'Personaje actualizado exitosamente',
      assignment: updatedAssignment
    });

  } catch (error) {
    console.error('Error updating assignment:', error);
    return NextResponse.json({ error: 'Error al actualizar asignación' }, { status: 500 });
  }
}
