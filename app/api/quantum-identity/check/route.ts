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
      return NextResponse.json({ requiresIdentity: false });
    }

    const usuario = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      include: {
        CartaFrutos: {
          where: { estado: 'APROBADA' },
          select: { id: true },
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!usuario) {
      return NextResponse.json({ requiresIdentity: false });
    }

    // Verificar condiciones:
    // 1. Tiene carta autorizada
    // 2. NO tiene foto de perfil
    const hasCartaAutorizada = usuario.CartaFrutos.length > 0;
    const hasProfileImage = !!usuario.profileImage;

    const requiresIdentity = hasCartaAutorizada && !hasProfileImage;

    return NextResponse.json({
      requiresIdentity,
      userInfo: requiresIdentity ? {
        nombre: usuario.nombre,
        nivel: usuario.nivelActual,
        rango: usuario.rangoActual
      } : null
    });

  } catch (error) {
    console.error('Error checking quantum identity:', error);
    return NextResponse.json({ requiresIdentity: false });
  }
}
