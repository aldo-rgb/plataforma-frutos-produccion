import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

// GET: Obtener todos los registros de seguimiento de llamadas del nivel BÁSICO
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const resolvedParams = await params;
    const visionId = parseInt(resolvedParams.id);

    // Obtener todos los enrollments de nivel BÁSICO con su tracking info
    const enrollments = await prisma.vision_enrollments.findMany({
      where: {
        visionId: visionId,
        level: 'BASIC',
      },
      include: {
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            telefono: true,
            Organization_Usuario_organizationIdToOrganization: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        Usuario_vision_enrollments_invitedByToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        Usuario_vision_enrollments_coordinatorIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        BasicCallTracking: {
          include: {
            CallInteractionLog: {
              include: {
                Usuario: {
                  select: {
                    id: true,
                    nombre: true,
                  },
                },
              },
              orderBy: {
                createdAt: 'desc',
              },
            },
          },
        },
      },
      orderBy: {
        enrolledAt: 'desc',
      },
    });

    // Formatear la respuesta con toda la información necesaria
    const formattedData = enrollments.map((enrollment) => ({
      id: enrollment.id,
      userId: enrollment.userId,
      visionId: enrollment.visionId,
      enrolledAt: enrollment.enrolledAt,
      enrollmentStatus: enrollment.enrollmentStatus,
      
      // Usuario info
      usuario: {
        id: enrollment.Usuario_vision_enrollments_userIdToUsuario.id,
        nombre: enrollment.Usuario_vision_enrollments_userIdToUsuario.nombre,
        email: enrollment.Usuario_vision_enrollments_userIdToUsuario.email,
        telefono: enrollment.Usuario_vision_enrollments_userIdToUsuario.telefono,
        organizacion: enrollment.Usuario_vision_enrollments_userIdToUsuario.Organization_Usuario_organizationIdToOrganization,
      },
      
      // Ángel de enrolamiento (quien invitó)
      angelEnrolamiento: enrollment.Usuario_vision_enrollments_invitedByToUsuario,
      
      // Coordinador asignado
      coordinador: enrollment.Usuario_vision_enrollments_coordinatorIdToUsuario,
      
      // Call tracking info
      tracking: enrollment.BasicCallTracking ? {
        id: enrollment.BasicCallTracking.id,
        nickname: enrollment.BasicCallTracking.nickname,
        phone: enrollment.BasicCallTracking.phone || enrollment.Usuario_vision_enrollments_userIdToUsuario.telefono,
        preferredCallTimeStart: enrollment.BasicCallTracking.preferredCallTimeStart,
        preferredCallTimeEnd: enrollment.BasicCallTracking.preferredCallTimeEnd,
        attendanceStatus: enrollment.BasicCallTracking.attendanceStatus,
        callAttempts: enrollment.BasicCallTracking.callAttempts,
        lastInteractionAt: enrollment.BasicCallTracking.lastInteractionAt,
        interactions: enrollment.BasicCallTracking.CallInteractionLog,
      } : null,
    }));

    return NextResponse.json(formattedData);
  } catch (error) {
    console.error('Error fetching call tracking data:', error);
    return NextResponse.json(
      { error: 'Error al obtener datos de seguimiento' },
      { status: 500 }
    );
  }
}

// POST: Crear o actualizar tracking de llamadas
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { enrollmentId, trackingData } = body;

    // Verificar si ya existe tracking para este enrollment
    const existingTracking = await prisma.basicCallTracking.findUnique({
      where: { enrollmentId },
    });

    if (existingTracking) {
      // Actualizar tracking existente
      const updated = await prisma.basicCallTracking.update({
        where: { enrollmentId },
        data: {
          ...trackingData,
          updatedAt: new Date(),
        },
      });
      return NextResponse.json(updated);
    } else {
      // Crear nuevo tracking
      const created = await prisma.basicCallTracking.create({
        data: {
          enrollmentId,
          ...trackingData,
        },
      });
      return NextResponse.json(created);
    }
  } catch (error) {
    console.error('Error saving call tracking:', error);
    return NextResponse.json(
      { error: 'Error al guardar seguimiento' },
      { status: 500 }
    );
  }
}
