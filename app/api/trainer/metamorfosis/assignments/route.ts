import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

// POST - Crear una nueva asignación de metamorfosis
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const userRol = session.user.rol;

    if (!['TRAINER', 'ADMINISTRADOR'].includes(userRol || '')) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      participantId, 
      visionId, 
      productId, 
      baseId, 
      transformId, 
      songId,
      cunaSongId, 
      includeBase = true,
      customNote 
    } = body;

    // Validaciones
    if (!participantId) {
      return NextResponse.json({ error: 'El participante es requerido' }, { status: 400 });
    }
    if (!transformId) {
      return NextResponse.json({ error: 'La transformación es requerida' }, { status: 400 });
    }
    if (!songId) {
      return NextResponse.json({ error: 'La canción es requerida' }, { status: 400 });
    }

    // Obtener los nombres para construir la frase
    const transform = await prisma.metamorfosisTransform.findUnique({
      where: { id: transformId }
    });
    
    const song = await prisma.metamorfosisSong.findUnique({
      where: { id: songId }
    });

    // Obtener canción de cuna si existe
    let cunaSong = null;
    if (cunaSongId) {
      cunaSong = await prisma.metamorfosisCunaSong.findUnique({
        where: { id: cunaSongId }
      });
    }

    let constructedPhrase = '';
    
    if (includeBase && baseId) {
      const base = await prisma.metamorfosisBase.findUnique({
        where: { id: baseId }
      });
      constructedPhrase = `${base?.name || 'Base'} → ${transform?.name || 'Transformación'} | 🎵 ${song?.title || 'Canción'}`;
    } else {
      constructedPhrase = `${transform?.name || 'Transformación'} | 🎵 ${song?.title || 'Canción'}`;
    }
    
    // Agregar canción de cuna a la frase si existe
    if (cunaSong) {
      constructedPhrase += ` | 🌙 ${cunaSong.title}`;
    }

    const assignment = await prisma.metamorfosisAssignment.create({
      data: {
        participantId,
        assignedById: userId,
        visionId: visionId || null,
        productId: productId || null,
        baseId: includeBase ? baseId : null,
        transformId,
        songId,
        cunaSongId: cunaSongId || null,
        includeBase,
        customNote: customNote?.trim() || null,
        constructedPhrase,
        status: 'SENT'
      },
      include: {
        Base: true,
        Transform: true,
        Song: true,
        CunaSong: true,
        Participant: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      }
    });

    // Crear notificación para el participante
    await prisma.notification.create({
      data: {
        userId: participantId,
        type: 'METAMORFOSIS_ASSIGNMENT',
        title: '⚡ ¡Nuevo Salto Cuántico Asignado!',
        message: `Tu entrenador te asignó la transformación "${transform?.name}". ¡Revísalo en tus tareas y prepárate para tu Salto Cuántico!`,
        relatedId: assignment.id
      }
    });

    // Crear AdminTask de tipo METAMORFOSIS_REVIEW (200 puntos)
    const adminTask = await prisma.adminTask.create({
      data: {
        titulo: `⚡ Salto Cuántico: ${transform?.name}`,
        descripcion: `Tu entrenador te asignó la transformación "${transform?.name}" con la canción "${song?.title}"${cunaSong ? ` y canción de cuna "${cunaSong.title}"` : ''}. Revisa los detalles y completa esta tarea.${customNote ? `\n\nNota del entrenador: ${customNote}` : ''}`,
        type: 'METAMORFOSIS_REVIEW',
        pointsReward: 200,
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

    console.log(`✅ Metamorfosis ${transform?.name} asignada a participante ${participantId} con tarea (200 pts) y notificación`);

    return NextResponse.json(assignment);
  } catch (error) {
    console.error('Error al crear asignación:', error);
    return NextResponse.json({ error: 'Error al crear asignación' }, { status: 500 });
  }
}

// GET - Obtener asignaciones del trainer
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const { searchParams } = new URL(request.url);
    const visionId = searchParams.get('visionId');
    const productId = searchParams.get('productId');

    const whereClause: Record<string, unknown> = {
      assignedById: userId
    };

    if (visionId) {
      whereClause.visionId = parseInt(visionId);
    }
    if (productId) {
      whereClause.productId = parseInt(productId);
    }

    const assignments = await prisma.metamorfosisAssignment.findMany({
      where: whereClause,
      include: {
        Base: true,
        Transform: true,
        Song: true,
        CunaSong: true,
        Participant: {
          select: {
            id: true,
            nombre: true,
            imagen: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(assignments);
  } catch (error) {
    console.error('Error al obtener asignaciones:', error);
    return NextResponse.json({ error: 'Error al obtener asignaciones' }, { status: 500 });
  }
}
