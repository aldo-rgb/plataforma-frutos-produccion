import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const coordinador = await prisma.usuario.findUnique({
      where: { email: session.user.email }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { usuarioId, titulo, descripcion, fechaLimite } = body;

    if (!usuarioId || !titulo || !descripcion || !fechaLimite) {
      return NextResponse.json(
        { error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Verificar que el usuario pertenece al coordinador
    const usuario = await prisma.usuario.findUnique({
      where: { id: parseInt(usuarioId) }
    });

    if (!usuario) {
      return NextResponse.json(
        { error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const perteneceAlCoordinador = coordinador.organizationId
      ? usuario.organizationId === coordinador.organizationId
      : usuario.coordinadorId === coordinador.id;

    if (!perteneceAlCoordinador) {
      return NextResponse.json(
        { error: 'No tienes permiso para asignar tareas a este usuario' },
        { status: 403 }
      );
    }

    // Crear la tarea extraordinaria
    const tarea = await prisma.tarea.create({
      data: {
        usuarioId: parseInt(usuarioId),
        titulo,
        descripcion,
        fechaLimite: new Date(fechaLimite),
        esExtraordinaria: true,
        requiereEvidencia: true,
        completada: false,
        semana: 0 // Las tareas extraordinarias no pertenecen a una semana específica
      }
    });

    return NextResponse.json({
      success: true,
      tarea: {
        id: tarea.id,
        titulo: tarea.titulo,
        descripcion: tarea.descripcion
      }
    });

  } catch (error: any) {
    console.error('❌ Error asignando tarea extraordinaria:', error);
    return NextResponse.json(
      { 
        error: 'Error al asignar tarea',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
