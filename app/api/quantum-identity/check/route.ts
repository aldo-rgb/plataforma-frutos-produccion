import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/quantum-identity/check
 * Verifica si el usuario necesita crear su identidad cuántica
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { requiresIdentity: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: {
        profileImage: true,
        nombre: true,
        nivelActual: true,
        rangoActual: true
      }
    });

    if (!usuario) {
      return NextResponse.json(
        { requiresIdentity: false },
        {
          headers: {
            'Cache-Control': 'no-store, no-cache, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        }
      );
    }

    // Solo verificar que NO tenga foto de perfil
    // Los usuarios pueden crear su avatar sin necesidad de tener una carta
    const hasProfileImage = !!usuario.profileImage;

    const requiresIdentity = !hasProfileImage;

    console.log('🔍 Quantum Identity Check:', {
      userId: usuario.nombre,
      hasProfileImage,
      requiresIdentity,
      profileImageUrl: usuario.profileImage
    });

    return NextResponse.json(
      {
        requiresIdentity,
        userInfo: requiresIdentity ? {
          nombre: usuario.nombre,
          nivel: usuario.nivelActual,
          rango: usuario.rangoActual
        } : null
      },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );

  } catch (error) {
    console.error('Error checking quantum identity:', error);
    return NextResponse.json(
      { requiresIdentity: false },
      {
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      }
    );
  }
}
