import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener información del negocio del usuario
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, message: 'No autenticado' }, { status: 401 });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, message: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar QuantumWebsite del usuario
    const website = await prisma.quantumWebsite.findUnique({
      where: { userId: usuario.id },
      select: {
        id: true,
        slug: true,
        businessName: true,
        logoUrl: true,
        isPublished: true,
        viewCount: true,
      }
    });

    // Buscar BusinessProfile del usuario
    const profile = await prisma.businessProfile.findUnique({
      where: { userId: usuario.id },
      select: {
        id: true,
        headline: true,
        description: true,
        logoUrl: true,
        galleryImages: true,
        avgRating: true,
        totalReviews: true,
        status: true,
        city: true,
        state: true,
        whatsappPhone: true,
        website: true,
        isVerified: true,
        isPLGraduate: true,
        BusinessCategory: {
          select: {
            id: true,
            name: true,
            icon: true,
          }
        }
      }
    });

    return NextResponse.json({
      success: true,
      data: {
        hasWebsite: !!website,
        website: website || undefined,
        hasProfile: !!profile,
        profile: profile || undefined,
      }
    });

  } catch (error) {
    console.error('Error fetching business info:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
