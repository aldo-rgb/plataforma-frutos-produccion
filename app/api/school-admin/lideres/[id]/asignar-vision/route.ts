import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/school-admin/lideres/[id]/asignar-vision
 * Asigna un líder a una visión específica
 */
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea SCHOOL_ADMIN
    const admin = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { 
        rol: true,
        organizationId: true
      }
    });

    if (!admin || admin.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const liderId = parseInt(params.id);
    const body = await request.json();
    const { visionId } = body;

    if (!visionId) {
      return NextResponse.json(
        { error: 'visionId es requerido' },
        { status: 400 }
      );
    }

    // Verificar que el líder pertenezca a la misma organización
    const lider = await prisma.usuario.findUnique({
      where: { id: liderId },
      select: {
        rol: true,
        organizationId: true
      }
    });

    if (!lider || lider.rol !== 'LIDER') {
      return NextResponse.json({ error: 'Líder no encontrado' }, { status: 404 });
    }

    if (lider.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'Este líder no pertenece a tu organización' }, { status: 403 });
    }

    // Verificar que la visión exista y pertenezca a la organización
    const vision = await prisma.vision.findUnique({
      where: { id: visionId },
      select: {
        organizationId: true
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    if (vision.organizationId !== admin.organizationId) {
      return NextResponse.json({ error: 'Esta visión no pertenece a tu organización' }, { status: 403 });
    }

    // Verificar si ya existe la asignación
    const existingAssignment = await prisma.visionMentor.findUnique({
      where: {
        visionId_mentorId: {
          visionId: visionId,
          mentorId: liderId
        }
      }
    });

    if (existingAssignment) {
      return NextResponse.json({ 
        success: true,
        message: 'El líder ya está asignado a esta visión'
      });
    }

    // Crear la asignación del líder a la visión
    await prisma.visionMentor.create({
      data: {
        visionId: visionId,
        mentorId: liderId,
        asignadoPorId: session.user.id
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Líder asignado exitosamente a la visión'
    });

  } catch (error: any) {
    console.error('Error asignando líder a visión:', error);
    return NextResponse.json(
      { error: 'Error al asignar líder', details: error.message },
      { status: 500 }
    );
  }
}
