import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/mentor/disponibilidad/excepciones
 * Obtiene todas las excepciones (vacaciones, bloqueos) del mentor
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    const excepciones = await prisma.excepcionDisponibilidad.findMany({
      where: { 
        perfilMentorId: perfilMentor.id
      },
      orderBy: { fechaInicio: 'desc' }
    });

    return NextResponse.json({ 
      success: true, 
      excepciones 
    });

  } catch (error) {
    console.error('❌ Error al obtener excepciones:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

/**
 * POST /api/mentor/disponibilidad/excepciones
 * Crea una nueva excepción (vacaciones, bloqueo temporal)
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { fechaInicio, fechaFin, motivo, descripcion, cancelarSesiones } = body;

    // Validaciones
    if (!fechaInicio || !fechaFin || !motivo) {
      return NextResponse.json({ 
        error: 'Faltan campos requeridos' 
      }, { status: 400 });
    }

    const inicio = new Date(fechaInicio);
    const fin = new Date(fechaFin);

    if (fin < inicio) {
      return NextResponse.json({ 
        error: 'La fecha de fin debe ser posterior a la fecha de inicio' 
      }, { status: 400 });
    }

    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    // Buscar sesiones confirmadas en ese rango de fechas
    const sesionesAfectadas = await prisma.solicitudMentoria.findMany({
      where: {
        perfilMentorId: perfilMentor.id,
        estado: 'CONFIRMADA',
        fechaSolicitada: {
          gte: inicio,
          lte: fin
        }
      },
      include: {
        Usuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    if (sesionesAfectadas.length > 0 && !cancelarSesiones) {
      return NextResponse.json({ 
        error: `Hay ${sesionesAfectadas.length} sesión(es) confirmada(s) en este periodo`,
        requireConfirmation: true,
        sesionesAfectadas: sesionesAfectadas.map(s => ({
          id: s.id,
          estudiante: s.Usuario.nombre,
          fecha: s.fechaSolicitada
        }))
      }, { status: 409 });
    }

    // Si se confirma la cancelación automática
    if (cancelarSesiones && sesionesAfectadas.length > 0) {
      await prisma.solicitudMentoria.updateMany({
        where: {
          id: { in: sesionesAfectadas.map(s => s.id) }
        },
        data: {
          estado: 'CANCELADA',
          motivoRechazo: `Cancelada automáticamente: ${motivo}`
        }
      });

      console.log(`📧 Notificar a ${sesionesAfectadas.length} estudiantes sobre cancelación`);
      // TODO: Enviar emails de notificación
    }

    // Crear la excepción
    const nuevaExcepcion = await prisma.excepcionDisponibilidad.create({
      data: {
        perfilMentorId: perfilMentor.id,
        fechaInicio: inicio,
        fechaFin: fin,
        motivo,
        descripcion: descripcion || null
      }
    });

    return NextResponse.json({ 
      success: true, 
      excepcion: nuevaExcepcion,
      sesionesAfectadas: sesionesAfectadas.length
    });

  } catch (error) {
    console.error('❌ Error al crear excepción:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}

/**
 * DELETE /api/mentor/disponibilidad/excepciones?id=123
 * Elimina una excepción
 */
export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ 
        error: 'ID requerido' 
      }, { status: 400 });
    }

    const perfilMentor = await prisma.perfilMentor.findUnique({
      where: { usuarioId: session.user.id },
      select: { id: true }
    });

    if (!perfilMentor) {
      return NextResponse.json({ 
        error: 'No tienes un perfil de mentor activo' 
      }, { status: 403 });
    }

    const excepcion = await prisma.excepcionDisponibilidad.findUnique({
      where: { id: parseInt(id) }
    });

    if (!excepcion || excepcion.perfilMentorId !== perfilMentor.id) {
      return NextResponse.json({ 
        error: 'Excepción no encontrada' 
      }, { status: 404 });
    }

    await prisma.excepcionDisponibilidad.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Excepción eliminada correctamente' 
    });

  } catch (error) {
    console.error('❌ Error al eliminar excepción:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor' 
    }, { status: 500 });
  }
}
