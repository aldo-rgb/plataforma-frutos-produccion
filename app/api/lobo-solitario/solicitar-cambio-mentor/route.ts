import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * POST /api/lobo-solitario/solicitar-cambio-mentor
 * Permite al usuario solicitar cambio de mentor si tiene 2+ faltas
 * Cancela sesiones pendientes y permite reagendar con nuevo mentor
 */
export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar paquete activo
    const packageCredits = await prisma.packageSessionCredits.findFirst({
      where: {
        MentorPackageOrder: {
          usuarioId: session.user.id,
          status: 'COMPLETED'
        },
        remainingSessions: {
          gt: 0
        },
        isActive: true,
        OR: [
          { expiresAt: null },
          { expiresAt: { gt: new Date() } }
        ]
      },
      include: {
        MentorPackageOrder: {
          select: {
            id: true,
            mentorId: true,
            createdAt: true
          }
        }
      }
    });

    if (!packageCredits) {
      return NextResponse.json({ 
        error: 'No tienes un paquete de Lobo Solitario activo' 
      }, { status: 404 });
    }

    const mentorId = packageCredits.MentorPackageOrder.mentorId;

    // Verificar faltas del mentor en este ciclo
    const mentorAbsences = await prisma.mentorAbsenceReport.count({
      where: {
        studentId: session.user.id,
        mentorId: mentorId,
        status: {
          in: ['CONFIRMED', 'PENDING']
        },
        reportedAt: {
          gte: packageCredits.MentorPackageOrder.createdAt
        }
      }
    });

    // Validar que tenga al menos 2 faltas
    if (mentorAbsences < 2) {
      return NextResponse.json({ 
        error: `El mentor debe tener al menos 2 faltas para solicitar cambio. Actualmente tiene ${mentorAbsences}.`,
        faltasActuales: mentorAbsences,
        faltasRequeridas: 2
      }, { status: 400 });
    }

    // Usar transacción para garantizar consistencia
    const result = await prisma.$transaction(async (tx) => {
      // 1. Cancelar todas las sesiones PENDIENTES con el mentor actual
      const canceledSessions = await tx.callBooking.updateMany({
        where: {
          studentId: session.user.id,
          mentorId: mentorId,
          status: {
            in: ['PENDING', 'CONFIRMED']
          },
          scheduledAt: {
            gte: new Date() // Solo futuras
          },
          programEnrollmentId: null // Solo Lobo Solitario
        },
        data: {
          status: 'CANCELLED',
          notes: 'Sesión cancelada debido a cambio de mentor por faltas repetidas'
        }
      });

      // 2. Limpiar el assignedMentorId del usuario (opcional, para forzar selección)
      await tx.usuario.update({
        where: { id: session.user.id },
        data: {
          assignedMentorId: null
        }
      });

      return {
        canceledSessions: canceledSessions.count
      };
    });

    logger.debug('✅ Cambio de mentor iniciado:', {
      userId: session.user.id,
      oldMentorId: mentorId,
      canceledSessions: result.canceledSessions,
      mentorAbsences
    });

    return NextResponse.json({
      success: true,
      message: 'Cambio de mentor aprobado. Ahora puedes seleccionar un nuevo mentor.',
      canceledSessions: result.canceledSessions,
      mentorAbsences,
      nextStep: 'Seleccionar nuevo mentor y reagendar sesiones'
    });

  } catch (error) {
    logger.error('❌ Error solicitando cambio de mentor:', error);
    return NextResponse.json({ 
      error: 'Error al procesar cambio de mentor' 
    }, { status: 500 });
  }
}
