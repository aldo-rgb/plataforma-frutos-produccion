import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * PATCH /api/mentor/acciones/[id]/toggle-evidence
 * Toggle del flag requiereEvidencia para una acción
 */
export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true }
    });

    if (!usuario || usuario.rol !== 'MENTOR') {
      return NextResponse.json(
        { error: 'Solo los mentores pueden configurar evidencias' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const accionId = parseInt(resolvedParams.id);
    if (isNaN(accionId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    const { requiereEvidencia } = await req.json();

    // Actualizar la acción
    const accion = await prisma.accion.update({
      where: { id: accionId },
      data: {
        requiereEvidencia: requiereEvidencia
      },
      select: {
        id: true,
        texto: true,
        requiereEvidencia: true
      }
    });

    console.log(`✅ Evidencia ${requiereEvidencia ? 'requerida' : 'opcional'} para acción ${accionId}`);

    return NextResponse.json({ 
      success: true, 
      accion,
      message: requiereEvidencia 
        ? 'Evidencia fotográfica requerida' 
        : 'Acción basada en Honor Code'
    });

  } catch (error: any) {
    console.error('❌ Error toggle evidence:', error);
    return NextResponse.json(
      { error: 'Error al actualizar configuración de evidencia', details: error.message },
      { status: 500 }
    );
  }
}
