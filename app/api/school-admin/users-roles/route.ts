import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET - Obtener usuarios con sus roles adicionales
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea SCHOOL_ADMIN o SUPER_ADMIN
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true, schoolId: true }
    });

    if (!currentUser || !['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'].includes(currentUser.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    // Obtener usuarios de la escuela del admin
    const users = await prisma.usuario.findMany({
      where: currentUser.schoolId ? { schoolId: currentUser.schoolId } : {},
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        esMentor: true,
        esEntrenador: true,
        esCoordinador: true,
        esLider: true,
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

// PUT - Actualizar roles adicionales de un usuario
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que sea SCHOOL_ADMIN o SUPER_ADMIN
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { rol: true, schoolId: true }
    });

    if (!currentUser || !['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'].includes(currentUser.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, esEntrenador, esCoordinador, esLider } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId requerido' }, { status: 400 });
    }

    // Verificar que el usuario pertenece a la escuela del admin
    const targetUser = await prisma.usuario.findUnique({
      where: { id: userId },
      select: { schoolId: true }
    });

    if (currentUser.schoolId && targetUser?.schoolId !== currentUser.schoolId) {
      return NextResponse.json({ success: false, error: 'Usuario no pertenece a tu escuela' }, { status: 403 });
    }

    // Actualizar roles (NO se puede cambiar esMentor desde aquí)
    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        esEntrenador: esEntrenador ?? false,
        esCoordinador: esCoordinador ?? false,
        esLider: esLider ?? false,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        esEntrenador: true,
        esCoordinador: true,
        esLider: true,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Roles actualizados correctamente',
      user: updated 
    });
  } catch (error) {
    console.error('Error al actualizar roles:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}
