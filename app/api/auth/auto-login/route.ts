import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sign } from 'jsonwebtoken';
import { randomBytes } from 'crypto';

export const dynamic = 'force-dynamic';

// Generar token de auto-login para un usuario
export async function POST(req: NextRequest) {
  try {
    const { userId, email } = await req.json();

    // Buscar usuario por ID o email
    const user = await prisma.usuario.findFirst({
      where: userId ? { id: userId } : { email },
      select: { id: true, email: true, nombre: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Generar token único
    const token = randomBytes(32).toString('hex');
    
    // Expira en 24 horas
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

    // Guardar token en la base de datos
    await prisma.autoLoginToken.create({
      data: {
        token,
        userId: user.id,
        expiresAt
      }
    });

    // URL de auto-login
    const autoLoginUrl = `${process.env.NEXTAUTH_URL || 'https://www.quantummatter.app'}/auto-login?token=${token}`;

    return NextResponse.json({
      success: true,
      token,
      url: autoLoginUrl,
      expiresAt
    });

  } catch (error) {
    console.error('Error creating auto-login token:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}

// Validar y usar token de auto-login
export async function GET(req: NextRequest) {
  try {
    const token = req.nextUrl.searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Token requerido' }, { status: 400 });
    }

    // Buscar token válido
    const autoLoginToken = await prisma.autoLoginToken.findUnique({
      where: { token },
      include: {
        Usuario: {
          select: {
            id: true,
            email: true,
            nombre: true,
            rol: true,
            requirePasswordChange: true,
            profileCompleted: true,
            apodo: true
          }
        }
      }
    });

    if (!autoLoginToken) {
      return NextResponse.json({ error: 'Token inválido' }, { status: 404 });
    }

    // Verificar si ya fue usado
    if (autoLoginToken.usedAt) {
      return NextResponse.json({ error: 'Token ya utilizado' }, { status: 400 });
    }

    // Verificar si expiró
    if (autoLoginToken.expiresAt < new Date()) {
      return NextResponse.json({ error: 'Token expirado' }, { status: 400 });
    }

    // Marcar como usado
    await prisma.autoLoginToken.update({
      where: { id: autoLoginToken.id },
      data: { usedAt: new Date() }
    });

    // Crear JWT para la sesión
    const jwtToken = sign(
      {
        id: autoLoginToken.Usuario.id,
        email: autoLoginToken.Usuario.email,
        name: autoLoginToken.Usuario.nombre,
        role: autoLoginToken.Usuario.rol
      },
      process.env.NEXTAUTH_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    return NextResponse.json({
      success: true,
      user: autoLoginToken.Usuario,
      jwt: jwtToken,
      requirePasswordChange: autoLoginToken.Usuario.requirePasswordChange,
      profileCompleted: autoLoginToken.Usuario.profileCompleted,
      hasApodo: !!autoLoginToken.Usuario.apodo
    });

  } catch (error) {
    console.error('Error validating auto-login token:', error);
    return NextResponse.json({ error: 'Error interno' }, { status: 500 });
  }
}
