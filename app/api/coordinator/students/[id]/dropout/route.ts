import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * 🐷 TICKET 3: Student Dropout Handler
 * POST /api/coordinator/students/[id]/dropout
 * 
 * Procesa la baja de un estudiante y genera reembolso automático
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: {
        id: true,
        rol: true,
        coordinadorId: true,
      },
    });

    if (!user || !['COORDINADOR', 'ADMIN', 'SUPERADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const studentId = parseInt(params.id);
    const body = await request.json();
    const { reason = 'STUDENT_DROPOUT' } = body;

    // Obtener estudiante y su enrollment activo
    const student = await prisma.usuario.findUnique({
      where: { id: studentId },
      include: {
        enrollmentsAsUser: {
          where: { status: 'ACTIVE' },
          include: {
            Vision: {
              include: {
                VisionEscrow: true
              }
            }
          }
        }
      }
    });

    if (!student) {
      return NextResponse.json({ error: 'Estudiante no encontrado' }, { status: 404 });
    }

    const activeEnrollments = student.enrollmentsAsUser;

    if (activeEnrollments.length === 0) {
      return NextResponse.json({ 
        error: 'Estudiante no tiene enrollments activos' 
      }, { status: 400 });
    }

    const results = [];

    // Procesar cada enrollment activo
    for (const enrollment of activeEnrollments) {
      const vision = enrollment.Vision;
      const escrow = vision.VisionEscrow;

      if (!escrow || escrow.status !== 'ACTIVE') {
        continue;
      }

      // Obtener todas las llamadas futuras programadas
      const now = new Date();
      const futureCalls = await prisma.callBooking.findMany({
        where: {
          programEnrollmentId: enrollment.id,
          type: 'DISCIPLINA',
          scheduledAt: {
            gt: now
          },
          status: {
            in: ['PENDING', 'CONFIRMED']
          }
        }
      });

      // Obtener llamadas ya completadas
      const completedCalls = await prisma.callBooking.findMany({
        where: {
          programEnrollmentId: enrollment.id,
          type: 'DISCIPLINA',
          OR: [
            { status: 'COMPLETED' },
            { status: 'MISSED_BY_USER' }
          ]
        }
      });

      // Calcular reembolso
      const totalScheduled = futureCalls.length + completedCalls.length;
      const callsCancelled = futureCalls.length;
      
      // Obtener tarifa del mentor
      const mentorProfile = await prisma.perfilMentor.findFirst({
        where: { usuarioId: enrollment.mentorId || 0 },
        select: { precioDisciplina: true }
      });

      const ratePerCall = mentorProfile?.precioDisciplina || 500;
      const amountRefunded = callsCancelled * ratePerCall;

      if (amountRefunded === 0) {
        continue;
      }

      // Procesar reembolso
      const result = await prisma.$transaction(async (tx) => {
        // 1. Cancelar todas las llamadas futuras
        await tx.callBooking.updateMany({
          where: {
            id: {
              in: futureCalls.map(c => c.id)
            }
          },
          data: {
            status: 'CANCELLED',
            notes: `Cancelado automáticamente por baja de estudiante (${reason})`
          }
        });

        // 2. Marcar enrollment como dropped
        await tx.programEnrollment.update({
          where: { id: enrollment.id },
          data: {
            status: 'DROPPED',
            updatedAt: new Date()
          }
        });

        // 3. Crear registro de reembolso
        const refund = await tx.visionRefund.create({
          data: {
            visionId: vision.id,
            escrowId: escrow.id,
            studentId,
            reason: reason as any,
            callsScheduled: totalScheduled,
            callsCompleted: completedCalls.length,
            callsCancelled,
            amountRefunded,
            droppedAt: now,
          }
        });

        // 4. Obtener o crear wallet de la organización
        let wallet = await tx.organizationWallet.findUnique({
          where: { organizationId: vision.organizationId }
        });

        if (!wallet) {
          wallet = await tx.organizationWallet.create({
            data: {
              organizationId: vision.organizationId,
              balance: 0,
              currency: 'MXN',
            }
          });
        }

        // 5. Crear transacción de crédito en wallet
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: amountRefunded,
            type: 'CREDIT',
            source: 'REFUND_DROPOUT',
            description: `Reembolso por baja de ${student.nombre} - Visión ${vision.nombre}`,
            visionId: vision.id,
            studentId,
          }
        });

        // 6. Actualizar balance de wallet
        await tx.organizationWallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              increment: amountRefunded
            }
          }
        });

        // 7. Actualizar escrow
        await tx.visionEscrow.update({
          where: { id: escrow.id },
          data: {
            remainingBalance: {
              decrement: amountRefunded
            }
          }
        });

        return { refund, wallet };
      });

      results.push({
        visionId: vision.id,
        visionNombre: vision.nombre,
        enrollmentId: enrollment.id,
        callsCancelled,
        amountRefunded,
        refundId: result.refund.id,
        walletNewBalance: Number(result.wallet.balance) + amountRefunded,
      });
    }

    // TODO: Enviar email al director notificando reembolso
    // await sendDropoutNotification(student, results);

    return NextResponse.json({
      success: true,
      studentId,
      studentNombre: student.nombre,
      enrollmentsProcessed: results.length,
      totalRefunded: results.reduce((sum, r) => sum + r.amountRefunded, 0),
      details: results,
      message: 'Baja procesada exitosamente'
    });

  } catch (error) {
    console.error('❌ Error procesando baja:', error);
    return NextResponse.json(
      { error: 'Error al procesar baja de estudiante' },
      { status: 500 }
    );
  }
}
