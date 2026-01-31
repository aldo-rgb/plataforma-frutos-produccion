import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Obtener un mentor específico - Admin Only
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.rol !== 'ADMINISTRADOR' && session.user.rol !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const mentorId = parseInt(id);

    const mentor = await prisma.perfilMentor.findUnique({
      where: { id: mentorId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true,
            jobTitle: true,
            isActive: true,
          },
        },
        ServicioMentoria: {
          orderBy: { precioTotal: 'asc' },
        },
      },
    });

    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor no encontrado' },
        { status: 404 }
      );
    }

    const precioBase = mentor.ServicioMentoria[0]?.precioTotal || mentor.precioBase || 0;

    const mentorFormateado = {
      id: mentor.id,
      usuarioId: mentor.usuarioId,
      usuario: mentor.Usuario,
      nivel: mentor.nivel,
      titulo: mentor.titulo,
      especialidad: mentor.especialidad,
      especialidadesSecundarias: mentor.especialidadesSecundarias,
      biografiaCorta: mentor.biografiaCorta,
      biografiaCompleta: mentor.biografiaCompleta,
      biografia: mentor.biografia,
      logros: mentor.logros,
      experienciaAnios: mentor.experienciaAnios,
      totalSesiones: mentor.totalSesiones,
      calificacionPromedio: mentor.calificacionPromedio,
      totalResenas: mentor.totalResenas,
      disponible: mentor.disponible,
      destacado: mentor.destacado,
      comisionMentor: mentor.comisionMentor,
      comisionPlataforma: mentor.comisionPlataforma,
      servicios: mentor.ServicioMentoria,
      precioBase: precioBase,
      sede: mentor.sede,
      vision: mentor.vision,
      createdAt: mentor.createdAt,
    };

    console.log(`📋 [ADMIN] Mentor ${mentor.id} consultado: ${mentor.Usuario.nombre}`);

    return NextResponse.json({
      success: true,
      mentor: mentorFormateado,
    });
  } catch (error: any) {
    console.error('❌ Error al obtener mentor:', error);
    return NextResponse.json(
      { error: 'Error al obtener mentor', details: error.message },
      { status: 500 }
    );
  }
}

// PUT - Actualizar mentor - Admin Only
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.rol !== 'ADMINISTRADOR' && session.user.rol !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'No autorizado. Solo administradores pueden realizar esta acción.' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const mentorId = parseInt(id);
    const body = await req.json();

    const {
      nivel,
      titulo,
      especialidad,
      especialidadesSecundarias,
      biografiaCorta,
      biografiaCompleta,
      logros,
      experienciaAnios,
      totalSesiones,
      comisionMentor,
      comisionPlataforma,
      disponible,
      destacado,
      isActive, // Nuevo campo para activar/desactivar usuario
    } = body;

    // Verificar que el mentor existe
    const mentorExistente = await prisma.perfilMentor.findUnique({
      where: { id: mentorId },
      include: {
        Usuario: { select: { nombre: true, isActive: true } }
      }
    });

    if (!mentorExistente) {
      return NextResponse.json(
        { error: 'Mentor no encontrado' },
        { status: 404 }
      );
    }

    // Preparar datos a actualizar
    const dataToUpdate: any = {};
    let actualizarUsuario = false;
    let nuevoEstadoUsuario: boolean | undefined;

    // Si se está actualizando el estado de activación del usuario
    if (typeof isActive === 'boolean') {
      actualizarUsuario = true;
      nuevoEstadoUsuario = isActive;
    }

    if (typeof disponible === 'boolean') {
      dataToUpdate.disponible = disponible;
    }

    if (typeof destacado === 'boolean') {
      dataToUpdate.destacado = destacado;
    }

    // Actualizar mentor si hay cambios en PerfilMentor
    let mentorActualizado;
    if (Object.keys(dataToUpdate).length > 0) {
      mentorActualizado = await prisma.perfilMentor.update({
        where: { id: mentorId },
        data: dataToUpdate,
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
              isActive: true,
            },
          },
        },
      });
    } else {
      // Si no hay cambios en PerfilMentor, solo obtener los datos
      mentorActualizado = await prisma.perfilMentor.findUnique({
        where: { id: mentorId },
        include: {
          Usuario: {
            select: {
              id: true,
              nombre: true,
              email: true,
              imagen: true,
              isActive: true,
            },
          },
        },
      });
    }

    // Actualizar estado del usuario si es necesario
    if (actualizarUsuario && nuevoEstadoUsuario !== undefined) {
      await prisma.usuario.update({
        where: { id: mentorActualizado!.usuarioId },
        data: { 
          isActive: nuevoEstadoUsuario,
          // Cuando se activa un mentor, también marcarlo como esMentor = true
          ...(nuevoEstadoUsuario ? { esMentor: true } : {})
        }
      });
      console.log(`✅ [ADMIN] Usuario ${mentorActualizado!.usuarioId} ${nuevoEstadoUsuario ? 'activado como mentor' : 'desactivado'} por ${session.user.nombre}`);
    }

    console.log(
      `✅ [ADMIN] Mentor ${mentorId} actualizado por ${session.user.nombre}:`,
      dataToUpdate
    );

    return NextResponse.json({
      success: true,
      mensaje: 'Mentor actualizado exitosamente',
      mentor: mentorActualizado,
    });
  } catch (error: any) {
    console.error('❌ Error al actualizar mentor:', error);
    return NextResponse.json(
      { error: 'Error al actualizar mentor', details: error.message },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar mentor - Admin Only
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session || (session.user.rol !== 'ADMINISTRADOR' && session.user.rol !== 'ADMIN')) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    const { id } = await params;
    const mentorId = parseInt(id);

    // Verificar que el mentor existe
    const mentor = await prisma.perfilMentor.findUnique({
      where: { id: mentorId },
      include: {
        Usuario: { select: { nombre: true } },
      },
    });
  
    if (!mentor) {
      return NextResponse.json(
        { error: 'Mentor no encontrado' },
        { status: 404 }
      );
    }

    // Eliminar mentor
    await prisma.perfilMentor.delete({
      where: { id: mentorId },
    });

    console.log(`🗑️ [ADMIN] Mentor ${mentorId} (${mentor.Usuario.nombre}) eliminado por ${session.user.nombre}`);

    return NextResponse.json({
      success: true,
      mensaje: 'Mentor eliminado exitosamente',
    });
  } catch (error: any) {
    console.error('❌ Error al eliminar mentor:', error);
    return NextResponse.json(
      { error: 'Error al eliminar mentor', details: error.message },
      { status: 500 }
    );
  }
}
