import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';
import logger from '@/lib/logger';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const { id } = await params;
    const formId = parseInt(id);

    if (isNaN(formId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Solo coordinadores pueden ver el detalle
    const coordinatorRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'ADMIN', 'SCHOOL_ADMIN', 'ADMINISTRADOR', 'TRAINER'];
    if (!coordinatorRoles.includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener el formulario médico con todos los detalles
    const form = await prisma.medicalForm.findUnique({
      where: { id: formId },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            profileImage: true,
            organizationId: true
          }
        },
        Vision: {
          select: {
            id: true,
            nombre: true
          }
        }
      }
    });

    if (!form) {
      return NextResponse.json({ error: 'Formulario no encontrado' }, { status: 404 });
    }

    // Verificar que el formulario pertenece a la misma organización
    if (form.Usuario.organizationId !== user.organizationId) {
      return NextResponse.json({ error: 'No autorizado para ver este formulario' }, { status: 403 });
    }

    return NextResponse.json({ 
      success: true,
      form
    });

  } catch (error) {
    logger.error('Error fetching medical form detail:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
