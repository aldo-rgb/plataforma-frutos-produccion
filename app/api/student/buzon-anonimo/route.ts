import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * 🛡️ API: Buzón Anónimo para Reportes Confidenciales
 * 
 * Permite a los estudiantes reportar problemas graves de forma anónima
 * Los mensajes se envían directamente al administrador sin que el mentor lo vea
 */

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { bookingId, mensaje, tipo = 'QUEJA_ANONIMA' } = body;

    // Validación de campos
    if (!bookingId || !mensaje || mensaje.trim().length < 20) {
      return NextResponse.json(
        { error: 'Por favor describe el problema con al menos 20 caracteres' },
        { status: 400 }
      );
    }

    // Verificar que la sesión existe y pertenece al usuario
    const sesion = await prisma.solicitudMentoria.findFirst({
      where: {
        id: bookingId,
        clienteId: session.user.id
      },
      include: {
        PerfilMentor: {
          include: {
            Usuario: {
              select: {
                nombre: true,
                email: true
              }
            }
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

    if (!sesion) {
      return NextResponse.json(
        { error: 'Sesión no encontrada' },
        { status: 404 }
      );
    }

    // Guardar el reporte en la base de datos
    await prisma.reporteAnonimo.create({
      data: {
        solicitudMentoriaId: bookingId,
        estudianteId: session.user.id,
        mentorId: sesion.PerfilMentor.usuarioId, // ID del usuario mentor, no del perfil
        mensaje: mensaje.trim(),
        tipo,
        estado: 'PENDIENTE'
      }
    });

    // También lo guardamos en logs para respaldo
    logger.debug(`
      ⚠️ =============================================
      🛡️ REPORTE ANÓNIMO RECIBIDO
      ⚠️ =============================================
      
      📅 Fecha: ${new Date().toISOString()}
      👤 Estudiante: ${sesion.Usuario.nombre} (${sesion.Usuario.email})
      🎓 Mentor: ${sesion.PerfilMentor.Usuario.nombre} (${sesion.PerfilMentor.Usuario.email})
      📝 Sesión ID: ${bookingId}
      🏷️ Tipo: ${tipo}
      
      💬 Mensaje:
      ${mensaje.trim()}
      
      ⚠️ =============================================
    `);

    return NextResponse.json({
      success: true,
      message: 'Reporte enviado de forma confidencial al administrador'
    });

  } catch (error) {
    logger.error('❌ Error al procesar reporte anónimo:', error);
    return NextResponse.json(
      { error: 'Error al enviar el reporte' },
      { status: 500 }
    );
  }
}

// GET - Obtener reportes (solo para ADMIN)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que el usuario es ADMIN o ADMINISTRADOR
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true }
    });

    if (!usuario || !['ADMIN', 'ADMINISTRADOR'].includes(usuario.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver reportes' },
        { status: 403 }
      );
    }

    // Obtener reportes desde la base de datos
    const reportes = await prisma.reporteAnonimo.findMany({
      orderBy: {
        createdAt: 'desc'
      },
      include: {
        solicitudMentoria: {
          select: {
            fechaSolicitada: true,
            horaSolicitada: true
          }
        },
        estudiante: {
          select: {
            nombre: true,
            email: true
          }
        },
        mentor: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    // Formatear los datos para el frontend
    const reportesFormateados = reportes.map(reporte => ({
      id: reporte.id,
      bookingId: reporte.solicitudMentoriaId,
      mensaje: reporte.mensaje,
      createdAt: reporte.createdAt.toISOString(),
      nombreMentor: reporte.mentor.nombre,
      nombreParticipante: reporte.estudiante.nombre,
      fechaSesion: reporte.solicitudMentoria.fechaSolicitada 
        ? `${new Date(reporte.solicitudMentoria.fechaSolicitada).toLocaleDateString('es-MX')} ${reporte.solicitudMentoria.horaSolicitada}`
        : 'No especificada'
    }));

    return NextResponse.json(reportesFormateados);

  } catch (error) {
    logger.error('❌ Error al obtener reportes:', error);
    return NextResponse.json(
      { error: 'Error al cargar reportes' },
      { status: 500 }
    );
  }
}
