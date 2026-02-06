import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/coordinador/actualizar-pago
 * Actualiza el estado de pago de un participante en vision_enrollments
 * 
 * Body:
 *  - enrollmentId: ID del enrollment
 *  - paymentStatus: 'PAID' | 'PARTIAL' | 'PENDING' | 'UNPAID' | 'GIFT'
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener usuario y verificar permisos
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        organizationId: true,
        rol: true
      }
    });

    // Verificar rol de coordinador o superior
    const allowedRoles = ['COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'SCHOOL_ADMIN', 'TRAINER', 'ADMINISTRADOR'];
    if (!user || !allowedRoles.includes(user.rol || '')) {
      return NextResponse.json({ success: false, error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await request.json();
    const { enrollmentId, paymentStatus } = body;

    if (!enrollmentId || !paymentStatus) {
      return NextResponse.json({ 
        success: false, 
        error: 'enrollmentId y paymentStatus son requeridos' 
      }, { status: 400 });
    }

    // Validar paymentStatus permitidos
    const validStatuses = ['PAID', 'PAID_FULL', 'FULL', 'PARTIAL', 'PENDING', 'UNPAID', 'GIFT', 'SCHOLARSHIP'];
    if (!validStatuses.includes(paymentStatus)) {
      return NextResponse.json({ 
        success: false, 
        error: `paymentStatus inválido. Permitidos: ${validStatuses.join(', ')}` 
      }, { status: 400 });
    }

    // Verificar que el enrollment existe y pertenece a la organización del coordinador
    const enrollment = await prisma.vision_enrollments.findUnique({
      where: { id: enrollmentId },
      include: {
        Vision: {
          select: { organizationId: true }
        }
      }
    });

    if (!enrollment) {
      return NextResponse.json({ success: false, error: 'Enrollment no encontrado' }, { status: 404 });
    }

    // Verificar que pertenece a la misma organización (excepto para ADMINISTRADOR)
    if (user.rol !== 'ADMINISTRADOR' && enrollment.Vision?.organizationId !== user.organizationId) {
      return NextResponse.json({ 
        success: false, 
        error: 'No tienes permiso para modificar este enrollment' 
      }, { status: 403 });
    }

    // Actualizar el paymentStatus
    const updated = await prisma.vision_enrollments.update({
      where: { id: enrollmentId },
      data: { 
        paymentStatus: paymentStatus,
        updatedAt: new Date()
      },
      select: {
        id: true,
        paymentStatus: true,
        enrollmentStatus: true,
        Usuario_vision_enrollments_userIdToUsuario: {
          select: {
            nombre: true,
            email: true
          }
        }
      }
    });

    logger.debug(`✅ [actualizar-pago] Enrollment ${enrollmentId} actualizado a paymentStatus=${paymentStatus} por ${session.user.email}`);

    return NextResponse.json({
      success: true,
      message: `Pago actualizado a ${paymentStatus}`,
      enrollment: {
        id: updated.id,
        paymentStatus: updated.paymentStatus,
        enrollmentStatus: updated.enrollmentStatus,
        usuario: updated.Usuario_vision_enrollments_userIdToUsuario?.nombre
      }
    });

  } catch (error) {
    logger.error('❌ Error actualizando pago:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar el pago' },
      { status: 500 }
    );
  }
}
