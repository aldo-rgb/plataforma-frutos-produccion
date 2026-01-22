import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener branding público de una organización por slug
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { success: false, error: 'Slug no proporcionado' },
        { status: 400 }
      );
    }

    // Buscar organización por slug
    const organization = await prisma.organization.findFirst({
      where: { 
        slug: slug,
        customLoginEnabled: true // Solo retornar si tiene login personalizado habilitado
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
        customLoginEnabled: true
      }
    });

    if (!organization) {
      return NextResponse.json(
        { success: false, error: 'Organización no encontrada o login personalizado no habilitado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      organization
    });

  } catch (error) {
    console.error('Error fetching org branding:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener la configuración' },
      { status: 500 }
    );
  }
}
