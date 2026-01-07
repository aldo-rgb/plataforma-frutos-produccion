import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/school-admin/coordinadores
 * Obtiene la lista de coordinadores de la organización del director
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        rol: true,
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes una organización asignada' },
        { status: 400 }
      );
    }

    // Obtener coordinadores y trainers de la misma organización
    // Incluir COORDINATOR_BASIC, COORDINATOR_ADVANCED, TRAINER, COORDINADOR, y SCHOOL_ADMIN
    const coordinadores = await prisma.usuario.findMany({
      where: {
        organizationId: user.organizationId,
        rol: {
          in: ['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN']
        }
      },
      select: {
        id: true,
        nombre: true,
        email: true,
        rol: true
      },
      orderBy: {
        nombre: 'asc'
      }
    });

    console.log(`✅ Coordinadores encontrados para organización ${user.organizationId}:`, coordinadores.length);

    return NextResponse.json({
      success: true,
      coordinadores
    });
  } catch (error) {
    console.error('Error obteniendo coordinadores:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener coordinadores' },
      { status: 500 }
    );
  }
}
