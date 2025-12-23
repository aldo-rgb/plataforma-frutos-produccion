import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * DELETE /api/student/sesiones/[id]
 * 
 * Permite al estudiante cancelar SOLO sesiones en estado PENDIENTE
 * Reglas de seguridad:
 * 1. Solo el dueño de la sesión puede cancelarla
 * 2. Solo se pueden cancelar sesiones PENDIENTE
 * 3. Sesiones CONFIRMADA o COMPLETADA NO se pueden eliminar
 */
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const sesionId = parseInt(params.id);

    if (isNaN(sesionId)) {
      return NextResponse.json({ error: 'ID de sesión inválido' }, { status: 400 });
    }

    // Buscar la sesión para verificar permisos y estado
    const solicitud = await prisma.solicitudMentoria.findUnique({
      where: { id: sesionId },
      select: {
        id: true,
        clienteId: true,
        estado: true,
        perfilMentorId: true,
        PerfilMentor: {
          select: {
            Usuario: {
              select: {
                nombre: true
              }
            }
          }
        }
      }
    });

    if (!solicitud) {
      return NextResponse.json({ 
        error: 'Sesión no encontrada' 
      }, { status: 404 });
    }

    // 🔒 REGLA 1: Verificar que sea el dueño de la sesión
    if (solicitud.clienteId !== session.user.id) {
      return NextResponse.json({ 
        error: 'No tienes permiso para cancelar esta sesión' 
      }, { status: 403 });
    }

    // 🔒 REGLA 2: Solo se pueden cancelar sesiones PENDIENTE
    if (solicitud.estado !== 'PENDIENTE') {
      const mensajes = {
        'CONFIRMADA': 'Esta sesión ya fue confirmada por el mentor. Contacta a soporte para cancelarla.',
        'COMPLETADA': 'Esta sesión ya fue completada. No se puede cancelar.',
        'RECHAZADA': 'Esta sesión ya fue rechazada.',
        'CANCELADA': 'Esta sesión ya está cancelada.'
      };

      return NextResponse.json({ 
        error: mensajes[solicitud.estado] || 'No se puede cancelar esta sesión'
      }, { status: 400 });
    }

    // ✅ Si pasa todas las validaciones, proceder a eliminar
    await prisma.solicitudMentoria.delete({
      where: { id: sesionId }
    });

    console.log(`✅ Sesión ${sesionId} cancelada por estudiante ${session.user.id}`);

    return NextResponse.json({ 
      success: true, 
      message: 'Solicitud cancelada correctamente' 
    });

  } catch (error) {
    console.error('❌ Error al cancelar sesión:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
