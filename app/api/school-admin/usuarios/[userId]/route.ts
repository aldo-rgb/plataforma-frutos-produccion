import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario logueado
    const usuarioActual = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        id: true,
        rol: true,
        organizationId: true
      }
    });

    if (!usuarioActual) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Validar que sea SCHOOL_ADMIN o COORDINADOR
    if (!['SCHOOL_ADMIN', 'COORDINADOR'].includes(usuarioActual.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const params = await context.params;
    const userId = parseInt(params.userId);

    // Obtener el usuario objetivo
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tier: true,
        licenseCode: true,
        assignedMentorId: true,
        organizationId: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Validar que el usuario pertenezca a la misma organización
    if (usuarioActual.rol === 'SCHOOL_ADMIN' && usuario.organizationId !== usuarioActual.organizationId) {
      return NextResponse.json({ error: 'No autorizado para ver este usuario' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      usuario
    });

  } catch (error) {
    console.error('Error fetching usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuario' },
      { status: 500 }
    );
  }
}
