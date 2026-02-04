import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener tareas extraordinarias
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const usuarioId = searchParams.get('usuarioId');

    let whereClause: any = {
      type: 'EXTRAORDINARY'
    };

    if (usuarioId) {
      whereClause.targetId = parseInt(usuarioId);
      whereClause.targetType = 'USER';
    }

    const tareas = await prisma.adminTask.findMany({
      where: whereClause,
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true
          }
        },
        TaskSubmission: {
          orderBy: {
            submittedAt: 'desc'
          },
          take: 1,
          include: {
            Usuario_TaskSubmission_usuarioIdToUsuario: {
              select: {
                id: true,
                nombre: true,
                email: true
              }
            },
            Usuario_TaskSubmission_reviewedByToUsuario: {
              select: {
                nombre: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      tareas
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo tareas extraordinarias:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener tareas',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// POST - Crear tarea extraordinaria
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const coordinadorId = parseInt(session.user.id);
    const body = await request.json();

    const { usuarioId, titulo, descripcion, puntos } = body;

    if (!usuarioId || !titulo || !descripcion) {
      return NextResponse.json(
        { error: 'Faltan campos requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el coordinador tenga acceso a este usuario
    const usuario = await prisma.usuario.findUnique({
      where: { id: coordinadorId },
      select: { rol: true, organizationId: true }
    });

    if (!usuario || !['COORDINADOR', 'DIRECTOR', 'SCHOOL_ADMIN'].includes(usuario.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Crear la tarea
    const tarea = await prisma.adminTask.create({
      data: {
        type: 'EXTRAORDINARY',
        titulo,
        descripcion,
        pointsReward: puntos || 1,
        targetType: 'USER',
        targetId: parseInt(usuarioId),
        requiereEvidencia: true,
        isActive: true,
        createdBy: coordinadorId
      }
    });

    // Crear notificación para el usuario
    await prisma.notification.create({
      data: {
        userId: parseInt(usuarioId),
        type: 'TASK_SUBMISSION',
        title: 'Nueva tarea extraordinaria asignada',
        message: `Se te ha asignado la tarea: ${titulo}. Complétala para recuperar tu vida extra.`,
        isRead: false
      }
    });

    return NextResponse.json({
      success: true,
      tarea,
      message: 'Tarea extraordinaria creada exitosamente'
    });

  } catch (error: any) {
    console.error('❌ Error creando tarea extraordinaria:', error);
    return NextResponse.json(
      { 
        error: 'Error al crear tarea',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
