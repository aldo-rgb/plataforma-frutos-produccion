import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'COORDINADOR'];

/**
 * POST /api/school-admin/users/reset-password
 * Restablece la contraseña de un usuario a Quantum123 y marca para cambio obligatorio
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const admin = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!admin || !ALLOWED_ROLES.includes(admin.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para esta acción' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { userId } = body;

    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId es requerido' },
        { status: 400 }
      );
    }

    // Buscar el usuario
    const user = await prisma.usuario.findUnique({
      where: { id: parseInt(userId) },
      select: { 
        id: true, 
        nombre: true, 
        email: true,
        organizationId: true 
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Verificar que el usuario pertenezca a la misma organización (para SCHOOL_ADMIN)
    if (admin.rol === 'SCHOOL_ADMIN' && user.organizationId !== admin.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para modificar este usuario' },
        { status: 403 }
      );
    }

    // Contraseña fija: Quantum123
    const tempPassword = 'Quantum123';

    // Hashear la contraseña
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Actualizar el usuario con contraseña y flag de cambio obligatorio
    await prisma.usuario.update({
      where: { id: user.id },
      data: { 
        password: hashedPassword,
        requirePasswordChange: true,
      },
    });

    console.log(`🔑 Contraseña restablecida para usuario ${user.id} (${user.nombre}) por admin ${admin.id}`);

    return NextResponse.json({
      success: true,
      message: 'Contraseña restablecida a Quantum123. El usuario deberá cambiarla en su próximo inicio de sesión.',
      userName: user.nombre,
    });

  } catch (error: any) {
    console.error('Error resetting password:', error);
    return NextResponse.json(
      { success: false, error: 'Error al restablecer contraseña' },
      { status: 500 }
    );
  }
}
