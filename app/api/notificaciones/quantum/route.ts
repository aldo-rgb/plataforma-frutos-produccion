import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/notificaciones/quantum
 * Obtiene la notificación de intervención Quantum más reciente no leída
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // TODO: Implementar tabla de notificaciones en el schema
    // Por ahora retornamos null para evitar errores
    return NextResponse.json({ notificacion: null });

    /*
    // Buscar notificación Quantum no leída más reciente
    const notificacion = await prisma.notificacion.findFirst({
      where: {
        usuarioId: usuario.id,
        tipo: 'QUANTUM_INTERVENTION',
        leida: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!notificacion) {
      return NextResponse.json({ notificacion: null });
    }

    // Parsear metadata
    const metadata = notificacion.metadata 
      ? JSON.parse(notificacion.metadata as string)
    // TODO: Implementar tabla de notificaciones en el schema
    // Por ahora retornamos null para evitar errores
    return NextResponse.json({ notificacion: null });

    /*
    // Buscar notificación Quantum no leída más reciente
    const notificacion = await prisma.notificacion.findFirst({
      where: {
        usuarioId: usuario.id,
        tipo: 'QUANTUM_INTERVENTION',
        leida: false
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    if (!notificacion) {
      return NextResponse.json({ notificacion: null });
    }

    // Parsear metadata
    const metadata = notificacion.metadata 
      ? JSON.parse(notificacion.metadata as string)
      : {};

    return NextResponse.json({
      notificacion: {
        id: notificacion.id,
        tipo: notificacion.tipo,
        titulo: notificacion.titulo,
        mensaje: notificacion.mensaje,
        metadata,
        createdAt: notificacion.createdAt
      }
    });
    */

  } catch (error: any) {
    logger.error('Error obteniendo notificación:', error);
    return NextResponse.json(
      { error: 'Error al obtener notificación', details: error.message },
      { status: 500 }
    );
  }
}
