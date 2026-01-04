import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/mentor-applications
 * Lista todas las aplicaciones de mentor pendientes de revisión
 */
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar que sea admin, director o administrador
    const user = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) }
    });

    if (!user || !['ADMIN', 'DIRECTOR', 'ADMINISTRADOR'].includes(user.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos para ver aplicaciones' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || 'PENDING';

    const applications = await prisma.mentorApplication.findMany({
      where: {
        status: status as any
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            createdAt: true
          }
        },
        ReviewedByUser: {
          select: {
            id: true,
            nombre: true,
            email: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      applications
    });

  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Error al obtener aplicaciones' },
      { status: 500 }
    );
  }
}
