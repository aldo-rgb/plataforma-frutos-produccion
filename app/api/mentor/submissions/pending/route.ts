import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/submissions/pending
 * Obtiene todas las submissions pendientes de revisión de los mentorados del mentor
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const mentorId = session.user.id;

    // Verificar que el usuario sea mentor
    const mentor = await prisma.usuario.findUnique({
      where: { id: mentorId }
    });

    if (!mentor || mentor.rol !== 'MENTOR') {
      return NextResponse.json(
        { error: 'Solo los mentores pueden acceder a esta función' },
        { status: 403 }
      );
    }

    // Obtener todos los mentorados del mentor
    const mentorados = await prisma.usuario.findMany({
      where: {
        assignedMentorId: mentorId,
        isActive: true
      },
      select: {
        id: true
      }
    });

    const mentoradosIds = mentorados.map(m => m.id);

    if (mentoradosIds.length === 0) {
      return NextResponse.json([]);
    }

    // Obtener todas las submissions pendientes de esos mentorados
    const submissions = await prisma.taskSubmission.findMany({
      where: {
        usuarioId: {
          in: mentoradosIds
        },
        status: 'SUBMITTED' // Solo las que están esperando revisión
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        },
        AdminTask: {
          select: {
            id: true,
            type: true,
            titulo: true,
            descripcion: true,
            pointsReward: true,
            fechaLimite: true,
            fechaEvento: true
          }
        }
      },
      orderBy: {
        submittedAt: 'asc' // Las más antiguas primero
      }
    });

    console.log(`✅ Mentor ${mentorId} consultó ${submissions.length} submissions pendientes`);

    return NextResponse.json(submissions);

  } catch (error: any) {
    console.error('❌ Error obteniendo submissions pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener submissions', details: error.message },
      { status: 500 }
    );
  }
}
