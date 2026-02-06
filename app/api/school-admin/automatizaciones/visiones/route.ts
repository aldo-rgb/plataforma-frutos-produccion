import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * GET /api/school-admin/automatizaciones/visiones
 * Obtiene todas las visiones de la organización con sus usuarios enrollados
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Obtener usuario y su organización
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true }
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json(
        { success: false, error: 'Solo directores pueden acceder' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organización' },
        { status: 400 }
      );
    }

    // Obtener visiones de la organización
    const visiones = await prisma.vision.findMany({
      where: {
        organizationId: user.organizationId,
        isActive: true
      },
      select: {
        id: true,
        nombre: true,
        startDate: true,
        endDate: true
      },
      orderBy: { createdAt: 'desc' }
    });

    // Para cada visión, obtener los enrollments con usuarios
    const visionesConUsuarios = await Promise.all(
      visiones.map(async (vision) => {
        const enrollments = await prisma.vision_enrollments.findMany({
          where: {
            visionId: vision.id,
            enrollmentStatus: {
              in: ['ENROLLED', 'ACTIVE', 'COMPLETED']
            }
          },
          select: {
            id: true,
            level: true,
            enrollmentStatus: true,
            userId: true
          }
        });

        // Obtener usuarios únicos
        const userIds = [...new Set(enrollments.map(e => e.userId))];
        const usuarios = await prisma.usuario.findMany({
          where: { id: { in: userIds } },
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            imagen: true
          }
        });

        const usuarioMap = new Map(usuarios.map(u => [u.id, u]));

        return {
          id: vision.id,
          nombre: vision.nombre,
          tipo: 'BASIC',
          enrollments: enrollments.map(e => ({
            id: e.id,
            level: e.level,
            status: e.enrollmentStatus,
            usuario: usuarioMap.get(e.userId) || null
          })).filter(e => e.usuario !== null)
        };
      })
    );

    return NextResponse.json({
      success: true,
      visiones: visionesConUsuarios
    });

  } catch (error) {
    logger.error('Error fetching visiones:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
