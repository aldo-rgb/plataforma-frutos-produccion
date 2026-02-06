import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/mentor/solicitudes/cancelar
 * 
 * Permite al mentor cancelar sesiones CONFIRMADAS
 * Reglas de seguridad:
 * 1. Solo el mentor dueño puede cancelar
 * 2. Solo se pueden cancelar sesiones CONFIRMADA
 * 3. Sesiones COMPLETADA NO se pueden cancelar
 * 4. Sesiones PENDIENTE se rechazan con otro endpoint
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { solicitudId, motivo } = body;

    if (!solicitudId) {
      return NextResponse.json({ error: 'ID de solicitud requerido' }, { status: 400 });
    }

    // Obtener perfil de mentor del usuario actual
    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    // Buscar la solicitud para verificar permisos y estado
    const solicitud = await prisma.solicitudMentoria.findUnique({
      where: { id: parseInt(solicitudId) },
      select: {
        id: true,
        perfilMentorId: true,
        estado: true,
        clienteId: true,
        ServicioMentoria: {
          select: {
            nombre: true
          }
        },
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (!solicitud) {
      return NextResponse.json({ 
        error: 'Sesión no encontrada' 
      }, { status: 404 });
    }

    // 🔒 REGLA 1: Verificar que sea el mentor dueño
    if (solicitud.perfilMentorId !== perfilMentor.id) {
      return NextResponse.json({ 
        error: 'No tienes permiso para cancelar esta sesión' 
      }, { status: 403 });
    }

    // 🔒 REGLA 2: Solo se pueden cancelar sesiones CONFIRMADA
    if (solicitud.estado !== 'CONFIRMADA') {
      const mensajes = {
        'PENDIENTE': 'Esta sesión aún está pendiente. Usa la opción de "Rechazar" en su lugar.',
        'COMPLETADA': 'Esta sesión ya fue completada. No se puede cancelar.',
        'CANCELADA': 'Esta sesión ya está cancelada.',
        'RECHAZADA': 'Esta sesión ya fue rechazada.'
      };

      return NextResponse.json({ 
        error: mensajes[solicitud.estado] || 'No se puede cancelar esta sesión'
      }, { status: 400 });
    }

    // ✅ Si pasa todas las validaciones, proceder a cancelar
    await prisma.solicitudMentoria.update({
      where: { id: parseInt(solicitudId) },
      data: { 
        estado: 'CANCELADA',
        motivoRechazo: motivo || 'Cancelada por el mentor'
      }
    });

    logger.debug(`✅ Sesión ${solicitudId} cancelada por mentor ${session.user.id}`);
    logger.debug(`📧 Notificar a estudiante ${solicitud.Usuario.email}: Sesión cancelada`);

    // TODO: Enviar notificación al estudiante
    // await enviarEmailCancelacion({
    //   to: solicitud.Usuario.email,
    //   estudianteNombre: solicitud.Usuario.nombre,
    //   servicioNombre: solicitud.ServicioMentoria.nombre,
    //   motivo: motivo || 'El mentor no pudo mantener la sesión'
    // });

    return NextResponse.json({ 
      success: true, 
      message: 'Sesión cancelada correctamente' 
    });

  } catch (error) {
    logger.error('❌ Error al cancelar sesión:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
