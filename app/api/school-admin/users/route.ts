import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;

    // Verificar que el usuario sea SCHOOL_ADMIN
    if (user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener usuario completo de la BD para tener organizationId actualizado
    const fullUser = await prisma.usuario.findUnique({
      where: { id: user.id },
      select: { id: true, organizationId: true }
    });

    if (!fullUser?.organizationId) {
      return NextResponse.json({ 
        error: 'Usuario no tiene organización asignada'
      }, { status: 400 });
    }

    // 1. Obtener usuarios directos de la organización (Participantes, GameChangers, Coordinadores)
    const orgUsers = await prisma.usuario.findMany({
      where: {
        organizationId: fullUser.organizationId,
        isActive: true,
        rol: { in: ['PARTICIPANTE', 'GAMECHANGER', 'COORDINADOR'] }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tier: true,
        experienciaXP: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        experienciaXP: 'desc'
      }
    });

    // 2. Obtener mentores que están en ciclos activos con usuarios de esta organización
    const activeMentors = await prisma.usuario.findMany({
      where: {
        rol: 'MENTOR',
        isActive: true,
        MentoredUsers: {
          some: {
            organizationId: fullUser.organizationId,
            isActive: true
          }
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true,
        tier: true,
        experienciaXP: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: {
        experienciaXP: 'desc'
      }
    });

    // Combinar ambas listas y eliminar duplicados
    const allUsers = [...orgUsers, ...activeMentors];
    const uniqueUsers = Array.from(
      new Map(allUsers.map(u => [u.id, u])).values()
    );

    // Ordenar por XP
    uniqueUsers.sort((a, b) => (b.experienciaXP || 0) - (a.experienciaXP || 0));

    return NextResponse.json({
      success: true,
      users: uniqueUsers,
      stats: {
        total: uniqueUsers.length,
        participantes: uniqueUsers.filter(u => u.rol === 'PARTICIPANTE').length,
        gameChangers: uniqueUsers.filter(u => u.rol === 'GAMECHANGER').length,
        coordinadores: uniqueUsers.filter(u => u.rol === 'COORDINADOR').length,
        mentores: uniqueUsers.filter(u => u.rol === 'MENTOR').length,
      }
    });

  } catch (error) {
    console.error('Error en /api/school-admin/users:', error);
    return NextResponse.json(
      { error: 'Error al obtener usuarios' },
      { status: 500 }
    );
  }
}
