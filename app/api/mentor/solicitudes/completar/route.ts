import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/mentor/solicitudes/completar
 * Marca una sesión de mentoría como completada
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || !session.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const { solicitudId } = await request.json();

    if (!solicitudId) {
      return NextResponse.json(
        { error: 'solicitudId es requerido' },
        { status: 400 }
      );
    }

    // Obtener el perfil de mentor
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json(
        { error: 'No tienes un perfil de mentor' },
        { status: 403 }
      );
    }

    // Verificar que la solicitud pertenece al mentor
    const solicitud = await prisma.solicitudMentoria.findFirst({
      where: {
        id: solicitudId,
        perfilMentorId: perfilMentor.id
      }
    });

    if (!solicitud) {
      return NextResponse.json(
        { error: 'Solicitud no encontrada o no te pertenece' },
        { status: 404 }
      );
    }

    if (solicitud.estado !== 'CONFIRMADA') {
      return NextResponse.json(
        { error: 'Solo puedes completar sesiones confirmadas' },
        { status: 400 }
      );
    }

    // Actualizar estado a COMPLETADA e incrementar contador de sesiones
    await prisma.$transaction([
      // 1. Marcar solicitud como completada
      prisma.solicitudMentoria.update({
        where: { id: solicitudId },
        data: { 
          estado: 'COMPLETADA',
          updatedAt: new Date()
        }
      }),
      
      // 2. Incrementar contador de sesiones completadas del mentor
      prisma.perfilMentor.update({
        where: { id: perfilMentor.id },
        data: {
          completedSessionsCount: {
            increment: 1
          }
        }
      })
    ]);

    console.log(`✅ Sesión #${solicitudId} completada por mentor ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Sesión completada. El estudiante puede dejarte una reseña.'
    });

  } catch (error: any) {
    console.error('❌ Error al completar sesión:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al completar sesión',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
