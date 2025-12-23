import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { emitToUser } from '@/lib/socket';

// PUT: Rechazar evidencia con comentario
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const evidenciaId = parseInt(params.id);

    if (isNaN(evidenciaId)) {
      return NextResponse.json({ error: 'ID de evidencia inválido' }, { status: 400 });
    }

    const body = await request.json();
    const { comentario } = body;

    if (!comentario || !comentario.trim()) {
      return NextResponse.json({ 
        error: 'Debes proporcionar un comentario de rechazo' 
      }, { status: 400 });
    }

    const mentor = await prisma.usuario.findUnique({
      where: { email: session.user.email },
    });

    if (!mentor) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (mentor.rol !== 'LIDER' && mentor.rol !== 'ADMINISTRADOR' && mentor.rol !== 'GAMECHANGER') {
      return NextResponse.json({ error: 'No tienes permisos de mentor' }, { status: 403 });
    }

    // Verificar que la evidencia existe
    const evidencia = await prisma.evidenciaAccion.findUnique({
      where: { id: evidenciaId },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        },
        Accion: true
      }
    });

    if (!evidencia) {
      return NextResponse.json({ error: 'Evidencia no encontrada' }, { status: 404 });
    }

    if (evidencia.estado !== 'PENDIENTE') {
      return NextResponse.json({ 
        error: `La evidencia ya fue revisada (Estado: ${evidencia.estado})` 
      }, { status: 400 });
    }

    // Actualizar evidencia y marcar acción como incompleta
    const [evidenciaRechazada, accionActualizada] = await prisma.$transaction([
      prisma.evidenciaAccion.update({
        where: { id: evidenciaId },
        data: {
          estado: 'RECHAZADA',
          comentarioMentor: comentario,
          revisadoPorId: mentor.id,
          fechaRevision: new Date()
        }
      }),
      prisma.accion.update({
        where: { id: evidencia.accionId },
        data: {
          completada: false,
          lastCompletedDate: null
        }
      })
    ]);

    console.log(`🔴 Evidencia ${evidenciaId} RECHAZADA por ${mentor.nombre}`);
    console.log(`   Usuario: ${evidencia.Usuario.nombre}`);
    console.log(`   Comentario: "${comentario}"`);

    // Enviar notificación en tiempo real
    try {
      emitToUser(evidencia.usuarioId.toString(), 'evidencia_rechazada', {
        evidenciaId: evidencia.id,
        mensaje: 'Tu evidencia necesita mejoras',
        comentario: comentario,
        mentorNombre: mentor.nombre,
        accionTexto: evidencia.Accion?.texto || 'Acción'
      });
    } catch (socketError) {
      console.error('Error al enviar notificación Socket.IO:', socketError);
    }

    return NextResponse.json({ 
      success: true,
      message: `Evidencia rechazada. Se ha notificado a ${evidencia.Usuario.nombre}.`
    }, { status: 200 });

  } catch (error) {
    console.error('❌ Error al rechazar evidencia:', error);
    return NextResponse.json({ error: 'Error al rechazar evidencia' }, { status: 500 });
  }
}
