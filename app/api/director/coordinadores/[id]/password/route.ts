import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

/**
 * PATCH /api/director/coordinadores/[id]/password
 * Permite al director cambiar la contraseña de un coordinador o mentor
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const directorId = typeof session.user.id === 'string' 
      ? parseInt(session.user.id) 
      : session.user.id;
    const { id } = await params;
    const targetUserId = parseInt(id);

    if (isNaN(targetUserId)) {
      return NextResponse.json({ error: 'ID inválido' }, { status: 400 });
    }

    // Verificar que sea director
    const director = await prisma.usuario.findUnique({
      where: { id: directorId },
      select: { rol: true, organizationId: true }
    });

    if (!director || !['DIRECTOR', 'SCHOOL_ADMIN'].includes(director.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    // Obtener datos del body
    const body = await request.json();
    const { newPassword } = body;

    if (!newPassword || newPassword.length < 6) {
      return NextResponse.json({ 
        error: 'La contraseña debe tener al menos 6 caracteres' 
      }, { status: 400 });
    }

    // Verificar que el usuario objetivo pertenece a la misma organización
    // y tiene rol de coordinador o mentor
    const targetUser = await prisma.usuario.findFirst({
      where: {
        id: targetUserId,
        organizationId: director.organizationId,
        rol: {
          in: ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'MENTOR']
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      }
    });

    if (!targetUser) {
      return NextResponse.json({ 
        error: 'Usuario no encontrado o no tienes permiso para modificarlo' 
      }, { status: 404 });
    }

    // Hashear la nueva contraseña
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    // Actualizar la contraseña
    await prisma.usuario.update({
      where: { id: targetUserId },
      data: {
        password: hashedPassword,
        requirePasswordChange: true, // Forzar cambio en próximo login
        updatedAt: new Date()
      }
    });

    console.log(`✅ Director ${directorId} cambió contraseña de ${targetUser.rol} ${targetUser.nombre} (ID: ${targetUserId})`);

    return NextResponse.json({
      success: true,
      message: `Contraseña actualizada para ${targetUser.nombre}`,
      user: {
        id: targetUser.id,
        nombre: targetUser.nombre,
        rol: targetUser.rol
      }
    });

  } catch (error: any) {
    console.error('❌ Error cambiando contraseña:', error);
    return NextResponse.json(
      { error: 'Error al cambiar contraseña', message: error?.message },
      { status: 500 }
    );
  }
}
