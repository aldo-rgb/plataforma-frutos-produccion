import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
    }

    const { currentPassword, newPassword } = await request.json();

    if (!newPassword) {
      return NextResponse.json({ success: false, error: 'Nueva contraseña es requerida' }, { status: 400 });
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ success: false, error: 'La contraseña debe tener al menos 8 caracteres' }, { status: 400 });
    }

    // Validar fortaleza de contraseña
    const hasUpperCase = /[A-Z]/.test(newPassword);
    const hasLowerCase = /[a-z]/.test(newPassword);
    const hasNumber = /\d/.test(newPassword);

    if (!hasUpperCase || !hasLowerCase || !hasNumber) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe contener mayúsculas, minúsculas y números' },
        { status: 400 }
      );
    }

    // Obtener usuario actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { id: true, password: true, requirePasswordChange: true }
    });

    if (!usuario || !usuario.password) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si NO requiere cambio obligatorio, verificar contraseña actual
    if (!usuario.requirePasswordChange) {
      if (!currentPassword) {
        return NextResponse.json({ success: false, error: 'Contraseña actual es requerida' }, { status: 400 });
      }

      const isValid = await bcrypt.compare(currentPassword, usuario.password);
      if (!isValid) {
        return NextResponse.json({ success: false, error: 'Contraseña actual incorrecta' }, { status: 401 });
      }
    }

    // Hashear nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Actualizar contraseña y quitar flag de cambio obligatorio
    await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: hashedPassword,
        requirePasswordChange: false
      }
    });

    return NextResponse.json({ success: true, message: 'Contraseña actualizada correctamente' });

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
