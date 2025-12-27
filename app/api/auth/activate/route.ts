import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';

/**
 * GET /api/auth/activate?token=xxx
 * Activa cuenta con Magic Link y redirige a cambio de contraseña
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Buscar usuario por token
    const usuario = await prisma.usuario.findUnique({
      where: { magicLinkToken: token },
      select: {
        id: true,
        email: true,
        nombre: true,
        rol: true,
        magicLinkExpiry: true,
        requirePasswordChange: true,
        wizardCompleted: true
      }
    });

    if (!usuario) {
      return NextResponse.redirect(new URL('/login?error=invalid_token', request.url));
    }

    // Verificar que no haya expirado
    if (usuario.magicLinkExpiry && usuario.magicLinkExpiry < new Date()) {
      return NextResponse.redirect(new URL('/login?error=expired_token', request.url));
    }

    // Invalidar el token (solo se puede usar una vez)
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        magicLinkToken: null,
        magicLinkExpiry: null
      }
    });

    // Generar JWT para sesión temporal
    const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';
    const sessionToken = sign(
      {
        userId: usuario.id,
        email: usuario.email,
        rol: usuario.rol,
        requirePasswordChange: usuario.requirePasswordChange,
        tempSession: true // Marcador para sesión temporal
      },
      JWT_SECRET,
      { expiresIn: '1h' } // Solo 1 hora para completar el cambio
    );

    // Crear respuesta con redirect
    const response = NextResponse.redirect(
      new URL('/auth/change-password?magic=true', request.url)
    );

    // Establecer cookie de sesión
    response.cookies.set('magic-session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60, // 1 hora
      path: '/'
    });

    return response;

  } catch (error) {
    console.error('❌ Error activating magic link:', error);
    return NextResponse.redirect(new URL('/login?error=server_error', request.url));
  }
}
