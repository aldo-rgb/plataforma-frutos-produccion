import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { verify } from 'jsonwebtoken';

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, isMagicLink } = await request.json();

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

    let userId: number;
    let userEmail: string;

    // Si es Magic Link, verificar sesión temporal
    if (isMagicLink) {
      const magicSession = request.cookies.get('magic-session')?.value;
      
      if (!magicSession) {
        return NextResponse.json(
          { success: false, error: 'Sesión expirada. Por favor solicita un nuevo link' },
          { status: 401 }
        );
      }

      try {
        const JWT_SECRET = process.env.NEXTAUTH_SECRET || 'fallback-secret';
        const decoded = verify(magicSession, JWT_SECRET) as any;
        userId = decoded.userId;
        userEmail = decoded.email;
      } catch (error) {
        return NextResponse.json(
          { success: false, error: 'Token inválido o expirado' },
          { status: 401 }
        );
      }
    } else {
      // Si no es magic link, usar sesión normal
      const session = await getServerSession(authOptions);
      if (!session?.user?.id) {
        return NextResponse.json({ success: false, error: 'No autenticado' }, { status: 401 });
      }
      userId = session.user.id;
      userEmail = session.user.email;
    }

    // Obtener usuario actual
    const usuario = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { 
        id: true, 
        password: true, 
        requirePasswordChange: true, 
        wizardCompleted: true,
        rol: true 
      }
    });

    if (!usuario || !usuario.password) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Si NO requiere cambio obligatorio y NO es magic link, verificar contraseña actual
    if (!usuario.requirePasswordChange && !isMagicLink) {
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
    const updatedUser = await prisma.usuario.update({
      where: { id: usuario.id },
      data: {
        password: hashedPassword,
        requirePasswordChange: false,
        temporaryPassword: null
      },
      select: {
        email: true,
        wizardCompleted: true,
        rol: true
      }
    });

    console.log(`✅ Contraseña actualizada para usuario: ${updatedUser.email}`);

    // Determinar redirección según rol
    let redirectTo = '/dashboard';
    
    // Solo PARTICIPANTES necesitan wizard
    if (updatedUser.rol === 'PARTICIPANTE' && !updatedUser.wizardCompleted) {
      redirectTo = '/dashboard/carta/wizard-v2';
    }

    // Preparar respuesta con redirect
    const response = NextResponse.json({ 
      success: true, 
      message: 'Contraseña actualizada correctamente',
      email: updatedUser.email,
      redirectTo
    });

    // Limpiar cookie de sesión temporal si existía
    if (isMagicLink) {
      response.cookies.delete('magic-session');
    }

    return response;

  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    return NextResponse.json({ success: false, error: 'Error interno del servidor' }, { status: 500 });
  }
}
