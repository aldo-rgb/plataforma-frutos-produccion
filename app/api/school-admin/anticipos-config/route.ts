import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener configuración de anticipos
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar que sea SCHOOL_ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para acceder a esta sección' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    // Obtener configuración de anticipos de la organización
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      anticiposEnabled: (organization as any).anticiposEnabled || false,
      anticipoAmount: (organization as any).anticipoAmount ? Number((organization as any).anticipoAmount) : null,
      anticipoDeadlineHours: (organization as any).anticipoDeadlineHours || 13,
    });
  } catch (error) {
    console.error('Error fetching anticipos config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración de anticipos
export async function PUT(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = typeof session.user.id === 'string' ? parseInt(session.user.id) : session.user.id;

    // Verificar que sea SCHOOL_ADMIN
    const user = await prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para realizar esta acción' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No perteneces a ninguna organización' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { anticiposEnabled, anticipoAmount } = body;

    // Validar datos
    if (typeof anticiposEnabled !== 'boolean') {
      return NextResponse.json(
        { success: false, error: 'anticiposEnabled debe ser un booleano' },
        { status: 400 }
      );
    }

    if (anticiposEnabled && (typeof anticipoAmount !== 'number' || anticipoAmount < 100)) {
      return NextResponse.json(
        { success: false, error: 'El monto del anticipo debe ser al menos $100' },
        { status: 400 }
      );
    }

    // Actualizar configuración en la organización
    const updatedOrganization = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        anticiposEnabled,
        anticipoAmount: anticiposEnabled ? anticipoAmount : null,
      } as any,
    });

    return NextResponse.json({
      success: true,
      message: 'Configuración de anticipos actualizada',
      anticiposEnabled: (updatedOrganization as any).anticiposEnabled,
      anticipoAmount: (updatedOrganization as any).anticipoAmount ? Number((updatedOrganization as any).anticipoAmount) : null,
    });
  } catch (error) {
    console.error('Error updating anticipos config:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la configuración' },
      { status: 500 }
    );
  }
}
