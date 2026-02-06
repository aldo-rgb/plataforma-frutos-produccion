import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/admin/trainer-applications/[id]/approve
 * Aprueba una aplicación de trainer y crea el perfil
 * 
 * Lógica de roles:
 * - Si el usuario es SCHOOL_ADMIN: mantiene SCHOOL_ADMIN y activa esEntrenador
 * - Si el usuario ya existe con otro rol protegido: mantiene rol y activa esEntrenador
 * - Si el usuario tiene rol normal: cambia a TRAINER y activa esEntrenador
 */
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
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

    const resolvedParams = await params;
    const applicationId = parseInt(resolvedParams.id);

    // Obtener la aplicación
    const application = await prisma.trainerApplication.findUnique({
      where: { id: applicationId },
      include: {
        Usuario_TrainerApplication_usuarioIdToUsuario: true
      }
    });

    if (!application) {
      return NextResponse.json(
        { error: 'Aplicación no encontrada' },
        { status: 404 }
      );
    }

    if (application.status !== 'PENDING') {
      return NextResponse.json(
        { error: 'La aplicación ya fue procesada' },
        { status: 400 }
      );
    }

    // Usar especialidad personalizada si seleccionó "Otros"
    const especialidadFinal = application.especialidad === 'Otros'
      ? (application as any).especialidadOtra || application.especialidad
      : application.especialidad;

    // Transacción para crear perfil y actualizar usuario
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear perfil de trainer
      const perfilTrainer = await tx.perfilTrainer.create({
        data: {
          usuarioId: application.usuarioId,
          titulo: application.titulo,
          especialidad: especialidadFinal,
          especialidadesSecundarias: application.especialidadesSecundarias || [],
          biografiaCompleta: application.biografiaCompleta,
          biografia: '',
          biografiaCorta: '',
          experienciaAnios: application.experienciaAnios,
          logros: [],
          expertiseTags: [],
          videoIntroUrl: application.videoIntroUrl,
          nivel: 'JUNIOR',
          horarioInicio: null,
          horarioFin: null,
          diasDisponibles: [1, 2, 3, 4, 5],
          disponible: false, // No disponible hasta que complete su perfil
          acceptingNewClients: false,
          profileApprovalStatus: 'DRAFT' // Debe completar su perfil
        }
      });

      // 2. Actualizar usuario
      // Roles protegidos que NO deben cambiar a TRAINER
      const usuarioActual = application.Usuario_TrainerApplication_usuarioIdToUsuario;
      const rolesProtegidos = ['SCHOOL_ADMIN', 'ADMINISTRADOR', 'ADMIN', 'DIRECTOR'];
      
      if (rolesProtegidos.includes(usuarioActual.rol)) {
        // Mantener rol actual, solo activar flag esEntrenador
        await tx.usuario.update({
          where: { id: application.usuarioId },
          data: {
            esEntrenador: true
          }
        });
        logger.debug(`✅ Usuario ${usuarioActual.nombre} mantiene rol ${usuarioActual.rol}, activado esEntrenador`);
      } else {
        // Cambiar rol a TRAINER y activar flag
        await tx.usuario.update({
          where: { id: application.usuarioId },
          data: {
            rol: 'TRAINER',
            esEntrenador: true
          }
        });
        logger.debug(`✅ Usuario ${usuarioActual.nombre} cambió a rol TRAINER`);
      }

      // 3. Actualizar aplicación
      await tx.trainerApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          updatedAt: new Date()
        }
      });

      return { perfilTrainer, application };
    });

    // TODO: Enviar email de bienvenida

    return NextResponse.json({
      success: true,
      message: 'Aplicación de trainer aprobada exitosamente',
      trainer: result.perfilTrainer
    });

  } catch (error) {
    logger.error('Error approving trainer application:', error);
    
    let errorMessage = 'Error al aprobar aplicación de trainer';
    if (error instanceof Error) {
      errorMessage += ': ' + error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
