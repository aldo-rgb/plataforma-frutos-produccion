import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/admin/trainer-applications
 * Lista todas las solicitudes de trainer
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Verificar permisos
    const adminUser = await prisma.usuario.findUnique({
      where: { id: Number(session.user.id) }
    });

    if (!adminUser || !['ADMIN', 'DIRECTOR', 'ADMINISTRADOR', 'SCHOOL_ADMIN'].includes(adminUser.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const applications = await prisma.trainerApplication.findMany({
      include: {
        Usuario_TrainerApplication_usuarioIdToUsuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            rol: true,
            organizationId: true,
            Organization: {
              select: {
                id: true,
                name: true
              }
            }
          }
        },
        Usuario_TrainerApplication_reviewedByToUsuario: {
          select: {
            id: true,
            nombre: true
          }
        }
      },
      orderBy: [
        { status: 'asc' }, // PENDING primero
        { createdAt: 'desc' }
      ]
    });

    // Formatear respuesta
    const formattedApplications = applications.map(app => ({
      id: app.id,
      usuarioId: app.usuarioId,
      status: app.status,
      titulo: app.titulo,
      especialidad: app.especialidad,
      especialidadesSecundarias: app.especialidadesSecundarias,
      experienciaAnios: app.experienciaAnios,
      biografiaCorta: app.biografiaCorta,
      biografiaCompleta: app.biografiaCompleta,
      tagline: app.tagline,
      promiseStatement: app.promiseStatement,
      methodologyStyle: app.methodologyStyle,
      idealClientDescription: app.idealClientDescription,
      horarioInicio: app.horarioInicio,
      horarioFin: app.horarioFin,
      diasDisponibles: app.diasDisponibles,
      logros: app.logros,
      expertiseTags: app.expertiseTags,
      videoIntroUrl: app.videoIntroUrl,
      documentosUrls: app.documentosUrls,
      reviewedBy: app.reviewedBy,
      reviewedAt: app.reviewedAt,
      rejectionReason: app.rejectionReason,
      createdAt: app.createdAt,
      updatedAt: app.updatedAt,
      usuario: app.Usuario_TrainerApplication_usuarioIdToUsuario,
      reviewedByUser: app.Usuario_TrainerApplication_reviewedByToUsuario
    }));

    return NextResponse.json({
      success: true,
      applications: formattedApplications
    });

  } catch (error) {
    console.error('Error fetching trainer applications:', error);
    return NextResponse.json(
      { error: 'Error al obtener aplicaciones' },
      { status: 500 }
    );
  }
}
