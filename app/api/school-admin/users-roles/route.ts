import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

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
      select: { rol: true, organizationId: true }
    });

    if (!currentUser || !['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'].includes(currentUser.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    // Solo SUPER_ADMIN puede ver todos los usuarios, los demás solo ven su organización
    const whereClause = currentUser.rol === 'SUPER_ADMIN' 
      ? {} 
      : { organizationId: currentUser.organizationId };

    // Obtener usuarios de la organización del admin
    const users = await prisma.usuario.findMany({
      where: whereClause,
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        esMentor: true,
        esEntrenador: true,
        esCoordinador: true,
        esLider: true,
        esCoordinadorBasico: true,
        esCoordinadorAvanzado: true,
        esGameChanger: true,
      },
      orderBy: { nombre: 'asc' }
    });

    return NextResponse.json({ success: true, users });
  } catch (error) {
    logger.error('Error al obtener usuarios:', error);
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
      select: { rol: true, organizationId: true }
    });

    if (!currentUser || !['SCHOOL_ADMIN', 'SUPER_ADMIN', 'ADMINISTRADOR'].includes(currentUser.rol)) {
      return NextResponse.json({ success: false, error: 'No tienes permisos' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, esEntrenador, esCoordinador, esLider, esCoordinadorBasico, esCoordinadorAvanzado, esGameChanger } = body;

    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId requerido' }, { status: 400 });
    }

    // Verificar que el usuario pertenece a la organización del admin (excepto SUPER_ADMIN)
    if (currentUser.rol !== 'SUPER_ADMIN') {
      const targetUser = await prisma.usuario.findUnique({
        where: { id: userId },
        select: { organizationId: true }
      });

      if (targetUser?.organizationId !== currentUser.organizationId) {
        return NextResponse.json({ success: false, error: 'Usuario no pertenece a tu organización' }, { status: 403 });
      }
    }

    // Actualizar roles (NO se puede cambiar esMentor desde aquí)
    const updated = await prisma.usuario.update({
      where: { id: userId },
      data: {
        esEntrenador: esEntrenador ?? false,
        esCoordinador: esCoordinador ?? false,
        esLider: esLider ?? false,
        esCoordinadorBasico: esCoordinadorBasico ?? false,
        esCoordinadorAvanzado: esCoordinadorAvanzado ?? false,
        esGameChanger: esGameChanger ?? false,
        updatedAt: new Date(),
      },
      select: {
        id: true,
        nombre: true,
        esEntrenador: true,
        esCoordinador: true,
        esLider: true,
        esCoordinadorBasico: true,
        esCoordinadorAvanzado: true,
        esGameChanger: true,
      }
    });

    return NextResponse.json({ 
      success: true, 
      message: 'Roles actualizados correctamente',
      user: updated 
    });
  } catch (error) {
    logger.error('Error al actualizar roles:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}
