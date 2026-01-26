import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener configuración de branding de la organización del school admin
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que es SCHOOL_ADMIN
    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener usuario con su organización
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    // Obtener la organización con los campos de branding
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        loginBackgroundUrl: true,
        loginWelcomeMessage: true,
        showPoweredBy: true,
        customLoginEnabled: true,
        whatsappInviteImageUrl: true
      }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization
    });

  } catch (error) {
    console.error('Error fetching branding:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}

// PUT - Actualizar configuración de branding
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que es SCHOOL_ADMIN
    if (session.user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    // Obtener usuario con su organización
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true }
    });

    if (!user?.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      logoUrl,
      brandColor,
      loginBackgroundUrl,
      loginWelcomeMessage,
      showPoweredBy,
      customLoginEnabled,
      whatsappInviteImageUrl
    } = body;

    // Actualizar la organización
    const updatedOrg = await prisma.organization.update({
      where: { id: user.organizationId },
      data: {
        logoUrl: logoUrl || null,
        brandColor: brandColor || null,
        loginBackgroundUrl: loginBackgroundUrl || null,
        loginWelcomeMessage: loginWelcomeMessage || 'Bienvenido al Portal de Entrenamiento',
        showPoweredBy: showPoweredBy ?? true,
        customLoginEnabled: customLoginEnabled ?? false,
        whatsappInviteImageUrl: whatsappInviteImageUrl || null
      },
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        brandColor: true,
        loginBackgroundUrl: true,
        loginWelcomeMessage: true,
        showPoweredBy: true,
        customLoginEnabled: true,
        whatsappInviteImageUrl: true
      }
    });

    return NextResponse.json({
      success: true,
      organization: updatedOrg,
      message: 'Configuración actualizada correctamente'
    });

  } catch (error) {
    console.error('Error updating branding:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar la configuración' },
      { status: 500 }
    );
  }
}
