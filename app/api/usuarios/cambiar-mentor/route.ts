import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/usuarios/cambiar-mentor
 * Cambia el mentor de un usuario y cancela sesiones futuras del programa
 * Solo accesible para ADMIN y COORDINADOR
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario de la base de datos para verificar rol
    const usuarioActual = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!usuarioActual) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Verificar permisos
    if (usuarioActual.rol !== 'ADMINISTRADOR' && usuarioActual.rol !== 'COORDINADOR') {
      return NextResponse.json({ 
        error: 'Acceso denegado. Solo administradores y coordinadores pueden cambiar mentores.' 
      }, { status: 403 });
    }

    const { userId, nuevoMentorId } = await request.json();

    if (!userId || !nuevoMentorId) {
      return NextResponse.json({ 
        error: 'Faltan datos requeridos (userId, nuevoMentorId)' 
      }, { status: 400 });
    }

    // 1. Verificar que el usuario existe
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // 2. Verificar que el nuevo mentor existe y tiene rol MENTOR
    const nuevoMentor = await prisma.usuario.findUnique({
      where: { id: parseInt(nuevoMentorId) }
    });

    if (!nuevoMentor || nuevoMentor.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Mentor no válido' }, { status: 400 });
    }

    // 3. Buscar programas ACTIVOS del usuario
    const programasActivos = await (prisma as any).programEnrollment.findMany({
      where: {
        userId: parseInt(userId),
        status: 'ACTIVE'
      },
      include: {
        CallBookings: {
          select: {
            id: true,
            scheduledAt: true,
            status: true,
            attendanceStatus: true
          }
        }
      }
    });

    let sesionesCompletadas = 0;
    let sesionesCanceladas = 0;
    let programasAfectados = 0;

    // 4. Procesar cada programa activo
    for (const programa of programasActivos) {
      const ahora = new Date();

      // Contar sesiones completadas
      const completadas = programa.CallBookings.filter((call: any) => 
        call.attendanceStatus === 'PRESENT' || call.status === 'COMPLETED'
      );
      sesionesCompletadas += completadas.length;

      // Cancelar sesiones futuras
      const futuras = programa.CallBookings.filter((call: any) => 
        new Date(call.scheduledAt) > ahora &&
        (call.status === 'PENDING' || call.status === 'CONFIRMED')
      );

      if (futuras.length > 0) {
        // Eliminar sesiones futuras
        await prisma.callBooking.deleteMany({
          where: {
            id: { in: futuras.map((c: any) => c.id) }
          }
        });
        sesionesCanceladas += futuras.length;
      }

      // Actualizar el programa con el nuevo mentor
      await (prisma as any).programEnrollment.update({
        where: { id: programa.id },
        data: {
          mentorId: parseInt(nuevoMentorId),
          updatedAt: new Date()
        }
      });

      programasAfectados++;
    }

    // 5. Actualizar el mentor asignado en el usuario
    await prisma.usuario.update({
      where: { id: parseInt(userId) },
      data: { 
        assignedMentorId: parseInt(nuevoMentorId),
        updatedAt: new Date()
      }
    });

    // 6. Crear notificación para el usuario
    try {
      await (prisma as any).notificacion.create({
        data: {
          usuarioId: parseInt(userId),
          tipo: 'CAMBIO_MENTOR',
          titulo: 'Cambio de Mentor - Re-agendar Sesiones',
          mensaje: `Tu ${usuarioActual.rol === 'COORDINADOR' ? 'coordinador' : 'administrador'} ha cambiado a tu mentor a ${nuevoMentor.nombre}. Por favor selecciona tus nuevos horarios para las semanas restantes de tu programa intensivo.`,
          leido: false,
          createdAt: new Date()
        }
      });
    } catch (notifError) {
      console.warn('No se pudo crear notificación (tabla puede no existir):', notifError);
    }

    console.log(`
🔄 CAMBIO DE MENTOR EJECUTADO
Usuario: ${usuario.nombre} (ID: ${usuario.id})
Nuevo Mentor: ${nuevoMentor.nombre} (ID: ${nuevoMentor.id})
Programas afectados: ${programasAfectados}
Sesiones completadas: ${sesionesCompletadas}
Sesiones canceladas: ${sesionesCanceladas}
Sesiones por re-agendar: ${sesionesCanceladas}
    `.trim());

    return NextResponse.json({
      success: true,
      message: 'Mentor cambiado exitosamente',
      detalles: {
        usuarioNombre: usuario.nombre,
        nuevoMentorNombre: nuevoMentor.nombre,
        programasActualizados: programasAfectados,
        sesionesCompletadas,
        sesionesCanceladas,
        requiereReagendar: sesionesCanceladas > 0
      }
    });

  } catch (error) {
    console.error('Error al cambiar mentor:', error);
    return NextResponse.json(
      { error: 'Error interno al procesar el cambio' },
      { status: 500 }
    );
  }
}
