import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener configuración de transferencias
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar rol
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    const org = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        transfersEnabled: true,
        transferDeadlineDays: true,
      },
    });

    return NextResponse.json({
      success: true,
      transfersEnabled: org?.transfersEnabled || false,
      transferDeadlineDays: org?.transferDeadlineDays || 1,
    });
  } catch (error) {
    console.error('Error getting transfers config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración de transferencias
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar rol
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { transfersEnabled, transferDeadlineDays } = body;

    await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        transfersEnabled: transfersEnabled ?? false,
        transferDeadlineDays: transferDeadlineDays ?? 1,
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de transferencias actualizada',
    });
  } catch (error) {
    console.error('Error updating transfers config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
