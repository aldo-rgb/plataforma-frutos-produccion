import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código de referido requerido' },
        { status: 400 }
      );
    }

    // Buscar usuario por código de referido
    const user = await prisma.usuario.findUnique({
      where: {
        referralCode: code.toUpperCase(),
      },
      select: {
        id: true,
        nombre: true,
        referralCode: true,
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Código de referido no válido' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        nombre: user.nombre,
        referralCode: user.referralCode,
      },
    });
  } catch (error) {
    console.error('Error validating referral code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar código de referido' },
      { status: 500 }
    );
  }
}
