import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * 🔒 API para verificar el estado de bloqueo del participante
 * 
 * Reglas:
 * - Si tiene 3+ llamadas perdidas: BLOQUEADO (escala de grises, notificación)
 * - Si tiene tarea extraordinaria aprobada: Se restaura 1 vida extra
 * - Si pierde llamada con vida extra activa: BLOQUEADO DEFINITIVO hasta fin de visión
 */

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const usuarioId = parseInt(session.user.id);

    // Obtener información del participante
    const participante = await prisma.usuario.findUnique({
      where: { id: usuarioId },
      select: {
        id: true,
        nombre: true,
        missedCallsCount: true,
        organizationId: true,
        coordinadorId: true,
        Usuario_Usuario_coordinadorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true
          }
        }
      }
    });

    if (!participante) {
      return NextResponse.json(
        { error: 'Participante no encontrado' },
        { status: 404 }
      );
    }

    // Verificar si tiene tarea extraordinaria aprobada (vida extra otorgada)
    const tareaAprobada = await prisma.taskSubmission.findFirst({
      where: {
        usuarioId,
        status: 'APPROVED',
        AdminTask: {
          type: 'EXTRAORDINARY'
        }
      },
      orderBy: {
        reviewedAt: 'desc'
      }
    });

    // Verificar si tiene tarea extraordinaria pendiente
    const tareaPendiente = await prisma.taskSubmission.findFirst({
      where: {
        usuarioId,
        status: 'PENDING',
        AdminTask: {
          type: 'EXTRAORDINARY'
        }
      },
      include: {
        AdminTask: {
          select: {
            id: true,
            titulo: true,
            descripcion: true,
            fechaLimite: true
          }
        }
      },
      orderBy: {
        submittedAt: 'desc'
      }
    });

    const llamadasPerdidas = participante.missedCallsCount || 0;
    const vidaExtraUsada = tareaAprobada !== null;
    
    // Determinar estado de bloqueo
    let estado: 'ACTIVO' | 'BLOQUEADO' | 'BLOQUEADO_DEFINITIVO' = 'ACTIVO';
    let mensaje = '';
    let mostrarContactoCoordinador = false;

    if (llamadasPerdidas >= 3 && !vidaExtraUsada) {
      // Primera vez que pierde 3 llamadas
      estado = 'BLOQUEADO';
      mensaje = `Has perdido ${llamadasPerdidas} llamadas. Tu cuenta está temporalmente bloqueada.`;
      mostrarContactoCoordinador = true;
    } else if (llamadasPerdidas >= 4 && vidaExtraUsada) {
      // Ya usó su vida extra y volvió a perder una llamada
      estado = 'BLOQUEADO_DEFINITIVO';
      mensaje = `Has perdido ${llamadasPerdidas} llamadas después de usar tu vida extra. Tu cuenta permanecerá bloqueada hasta el fin de tu visión.`;
      mostrarContactoCoordinador = true;
    } else if (llamadasPerdidas >= 3 && vidaExtraUsada) {
      // Tiene vida extra activa, todavía puede continuar
      estado = 'ACTIVO';
      mensaje = 'Tienes una vida extra activa. ¡No pierdas más llamadas!';
    }

    // Información del coordinador
    const coordinador = participante.Usuario_Usuario_coordinadorIdToUsuario;

    return NextResponse.json({
      success: true,
      estado,
      llamadasPerdidas,
      vidaExtraUsada,
      mensaje,
      mostrarContactoCoordinador,
      coordinador: coordinador ? {
        nombre: coordinador.nombre,
        email: coordinador.email,
        telefono: coordinador.telefono || 'No disponible'
      } : null,
      tareaPendiente: tareaPendiente ? {
        id: tareaPendiente.id,
        titulo: tareaPendiente.AdminTask.titulo,
        descripcion: tareaPendiente.AdminTask.descripcion,
        fechaLimite: tareaPendiente.AdminTask.fechaLimite,
        evidenciaUrl: tareaPendiente.evidenciaUrl,
        status: tareaPendiente.status
      } : null
    });

  } catch (error: any) {
    console.error('❌ Error obteniendo estado de bloqueo:', error);
    return NextResponse.json(
      { 
        error: 'Error al obtener estado',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
