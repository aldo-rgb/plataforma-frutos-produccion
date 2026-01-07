import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/mentor-applications/[id]/approve
 * Aprueba una aplicación de mentor y crea el perfil
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

    if (!adminUser || !['ADMIN', 'DIRECTOR', 'ADMINISTRADOR'].includes(adminUser.rol)) {
      return NextResponse.json(
        { error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const resolvedParams = await params;
    const applicationId = parseInt(resolvedParams.id);

    // Obtener la aplicación
    const application = await prisma.mentorApplication.findUnique({
      where: { id: applicationId },
      include: {
        Usuario_MentorApplication_usuarioIdToUsuario: true
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

    // Calcular fechas de membresía
    const membershipStartDate = new Date();
    const membershipExpiryDate = new Date();
    membershipExpiryDate.setFullYear(membershipExpiryDate.getFullYear() + 1);

    // Usar especialidad personalizada si seleccionó "Otros"
    const especialidadFinal = application.especialidad === 'Otros' 
      ? (application as any).especialidadOtra || application.especialidad
      : application.especialidad;

    // Transacción para crear perfil y actualizar usuario
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear perfil de mentor con configuración mínima
      // Solo biografiaCompleta se prellena, el resto el mentor lo configura en su perfil
      const perfilMentor = await tx.perfilMentor.create({
        data: {
          usuarioId: application.usuarioId,
          titulo: application.titulo,
          especialidad: especialidadFinal,
          especialidadesSecundarias: application.especialidadesSecundarias || [],
          // Solo prellenar biografiaCompleta que viene de la solicitud
          biografiaCompleta: application.biografiaCompleta,
          // Campos que el mentor debe configurar por primera vez
          biografia: '',
          biografiaCorta: '',
          experienciaAnios: application.experienciaAnios,
          logros: [],
          expertiseTags: [],
          videoIntroUrl: application.videoIntroUrl,
          // Nivel y comisiones por defecto (JUNIOR)
          nivel: 'JUNIOR',
          comisionMentor: 70,
          comisionPlataforma: 30,
          // Disponibilidad - el mentor debe configurarla
          horarioInicio: null,
          horarioFin: null,
          diasDisponibles: [1, 2, 3, 4, 5], // Días por defecto
          disponible: false, // No disponible hasta que complete su perfil
          acceptingNewClients: false,
          // Campos de membresía
          membershipActive: true,
          membershipStartDate,
          membershipExpiryDate,
          membershipApprovedAt: new Date(),
          membershipApprovedBy: adminUser.id,
          autoRenewalEnabled: true
        }
      });

      // 2. Actualizar usuario - cambiar rol a MENTOR
      await tx.usuario.update({
        where: { id: application.usuarioId },
        data: {
          rol: 'MENTOR'
        }
      });

      // 3. Actualizar aplicación
      await tx.mentorApplication.update({
        where: { id: applicationId },
        data: {
          status: 'APPROVED',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          updatedAt: new Date()
        }
      });

      // 4. Crear registro de membresía
      await tx.mentorMembershipRenewal.create({
        data: {
          mentorId: perfilMentor.id,
          renewalDate: membershipStartDate,
          expiryDate: membershipExpiryDate,
          amount: application.amountPaid || 999,
          stripePaymentIntentId: application.paymentIntentId,
          status: 'ACTIVE',
          autoRenewed: false
        }
      });

      return { perfilMentor, application };
    });

    // TODO: Enviar email de bienvenida

    return NextResponse.json({
      success: true,
      message: 'Aplicación aprobada exitosamente',
      mentor: result.perfilMentor,
      membershipExpiryDate
    });

  } catch (error) {
    console.error('Error approving application:', error);
    
    // Proporcionar mensaje de error más descriptivo
    let errorMessage = 'Error al aprobar aplicación';
    if (error instanceof Error) {
      errorMessage += ': ' + error.message;
    }
    
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
