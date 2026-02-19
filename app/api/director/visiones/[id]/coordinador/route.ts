import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// PATCH - Actualizar coordinador de una visión
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const directorId = parseInt(session.user.id);
    const visionId = parseInt(resolvedParams.id);
    const body = await request.json();

    const { coordinadorId } = body;

    if (!coordinadorId) {
      return NextResponse.json(
        { error: 'coordinadorId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Verificar que la visión pertenezca a su organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { organizationId: true }
    });

    if (!vision || vision.organizationId !== director.organizationId) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que el coordinador pertenezca a su organización
    const coordinador = await prisma.usuario.findUnique({
      where: { id: parseInt(coordinadorId) },
      select: { rol: true, organizationId: true }
    });

    if (!coordinador || coordinador.rol !== 'COORDINADOR' || coordinador.organizationId !== director.organizationId) {
      return NextResponse.json(
        { error: 'Coordinador no válido' },
        { status: 400 }
      );
    }

    // Actualizar la visión
    const updatedVision = await prisma.vision.update({
      where: { id: visionId },
      data: {
        coordinadorId: parseInt(coordinadorId)
      },
      include: {
        Coordinador: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      vision: updatedVision,
      message: 'Coordinador asignado exitosamente'
    });

  } catch (error: any) {
    logger.error('❌ Error asignando coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al asignar coordinador',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// DELETE - Eliminar coordinador de una visión
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const directorId = parseInt(session.user.id);
    const visionId = parseInt(resolvedParams.id);

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Verificar que la visión pertenezca a su organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: { organizationId: true }
    });

    if (!vision || vision.organizationId !== director.organizationId) {
      return NextResponse.json(
        { error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Remover coordinador (asignar null)
    await prisma.vision.update({
      where: { id: visionId },
      data: {
        coordinadorId: null
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Coordinador removido de la visión'
    });

  } catch (error: any) {
    logger.error('❌ Error removiendo coordinador:', error);
    return NextResponse.json(
      { 
        error: 'Error al remover coordinador',
        message: error?.message || 'Error desconocido'
      },
      { status: 500 }
    );
  }
}
