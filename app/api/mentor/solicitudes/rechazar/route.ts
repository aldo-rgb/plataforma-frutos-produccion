import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * POST /api/mentor/solicitudes/rechazar
 * Rechaza/cancela una solicitud de mentoría
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

    const { solicitudId, motivo } = await request.json();

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

    if (solicitud.estado === 'COMPLETADA') {
      return NextResponse.json(
        { error: 'No puedes rechazar una sesión completada' },
        { status: 400 }
      );
    }

    // Actualizar estado a CANCELADA
    await prisma.solicitudMentoria.update({
      where: { id: solicitudId },
      data: { 
        estado: 'CANCELADA',
        notas: motivo ? `Rechazada por mentor: ${motivo}` : solicitud.notas,
        updatedAt: new Date()
      }
    });

    console.log(`❌ Solicitud #${solicitudId} rechazada por mentor ${session.user.id}`);

    return NextResponse.json({
      success: true,
      message: 'Solicitud rechazada'
    });

  } catch (error: any) {
    console.error('❌ Error al rechazar solicitud:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al rechazar solicitud',
        details: error.message
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
