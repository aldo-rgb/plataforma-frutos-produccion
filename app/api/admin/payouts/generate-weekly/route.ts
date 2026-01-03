import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * 💰 TICKET 2: Weekly Payout Generation
 * POST /api/admin/payouts/generate-weekly
 * 
 * Genera los pagos semanales para todos los mentores basados en llamadas completadas
 * Debe ejecutarse cada domingo a las 23:59 via cron job
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { rol: true },
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await request.json();
    const { weekNumber, visionId } = body;

    if (!weekNumber) {
      return NextResponse.json({ error: 'weekNumber requerido' }, { status: 400 });
    }

    // Obtener visiones activas
    const visionFilter = visionId ? { id: visionId } : { status: 'ACTIVE' };
    const visionsWithEscrow = await prisma.vision.findMany({
      where: {
        ...visionFilter,
        VisionEscrow: {
          status: 'ACTIVE'
        }
      },
      include: {
        VisionEscrow: true,
        enrollments: {
          where: { status: 'ACTIVE' },
          include: {
            User: {
              select: { assignedMentorId: true }
            }
          }
        }
      }
    });

    const results = [];

    for (const vision of visionsWithEscrow) {
      const escrow = vision.VisionEscrow;

      if (!escrow) continue;

      // Calcular fechas de la semana
      const startDate = new Date(vision.fechaInicio);
      const weekStartDate = new Date(startDate);
      weekStartDate.setDate(startDate.getDate() + (weekNumber - 1) * 7);
      
      const weekEndDate = new Date(weekStartDate);
      weekEndDate.setDate(weekStartDate.getDate() + 7);

      // Obtener llamadas pagables de la semana
      const payableCalls = await prisma.callBooking.findMany({
        where: {
          type: 'DISCIPLINA',
          scheduledAt: {
            gte: weekStartDate,
            lt: weekEndDate
          },
          programEnrollmentId: {
            in: vision.enrollments.map(e => e.id)
          },
          OR: [
            { status: 'COMPLETED' },
            { status: 'MISSED_BY_USER' }
          ]
        },
        include: {
          ProgramEnrollment: {
            include: {
              User: true
            }
          }
        }
      });

      // Agrupar por mentor
      const callsByMentor = new Map<number, typeof payableCalls>();
      
      for (const call of payableCalls) {
        const mentorId = call.mentorId;
        if (!mentorId) continue;

        if (!callsByMentor.has(mentorId)) {
          callsByMentor.set(mentorId, []);
        }
        callsByMentor.get(mentorId)!.push(call);
      }

      // Generar payouts
      for (const [mentorId, calls] of callsByMentor.entries()) {
        // Obtener tarifa del mentor
        const mentorProfile = await prisma.perfilMentor.findFirst({
          where: { usuarioId: mentorId },
          select: { precioDisciplina: true }
        });

        const ratePerCall = mentorProfile?.precioDisciplina || 500;
        const callsCompleted = calls.length;
        const totalAmount = callsCompleted * ratePerCall;

        if (totalAmount === 0) continue;

        // Verificar que no exista payout duplicado
        const existingPayout = await prisma.mentorPayout.findFirst({
          where: {
            escrowId: escrow.id,
            mentorId,
            weekNumber,
          }
        });

        if (existingPayout) {
          console.log(`⚠️ Payout ya existe para mentor ${mentorId}, semana ${weekNumber}`);
          continue;
        }

        // Crear payout
        const payout = await prisma.$transaction(async (tx) => {
          const newPayout = await tx.mentorPayout.create({
            data: {
              escrowId: escrow.id,
              mentorId,
              visionId: vision.id,
              weekNumber,
              callsCompleted,
              ratePerCall,
              totalAmount,
              status: 'GENERATED',
            }
          });

          // Crear registros de PayableCall
          for (const call of calls) {
            await tx.payableCall.create({
              data: {
                payoutId: newPayout.id,
                callBookingId: call.id,
                mentorId,
                studentId: call.ProgramEnrollment.userId,
                visionId: vision.id,
                weekNumber,
                callDate: call.scheduledAt,
                status: call.status,
                rateApplied: ratePerCall,
              }
            });
          }

          // Actualizar escrow
          await tx.visionEscrow.update({
            where: { id: escrow.id },
            data: {
              totalPaid: {
                increment: totalAmount
              },
              remainingBalance: {
                decrement: totalAmount
              }
            }
          });

          return newPayout;
        });

        results.push({
          visionId: vision.id,
          visionNombre: vision.nombre,
          mentorId,
          weekNumber,
          callsCompleted,
          totalAmount,
          payoutId: payout.id,
        });
      }
    }

    // TODO: Enviar emails a mentores notificando pago generado
    // await sendPayoutNotifications(results);

    return NextResponse.json({
      success: true,
      weekNumber,
      payoutsGenerated: results.length,
      details: results,
      message: `${results.length} pagos generados exitosamente`
    });

  } catch (error) {
    console.error('❌ Error generando payouts:', error);
    return NextResponse.json(
      { error: 'Error al generar pagos semanales' },
      { status: 500 }
    );
  }
}

/**
 * 📊 GET: Obtener payouts generados
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { rol: true, id: true },
    });

    if (!user || !['ADMIN', 'SUPERADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status');
    const visionId = searchParams.get('visionId');
    const weekNumber = searchParams.get('weekNumber');

    const payouts = await prisma.mentorPayout.findMany({
      where: {
        ...(status && { status: status as any }),
        ...(visionId && { visionId: parseInt(visionId) }),
        ...(weekNumber && { weekNumber: parseInt(weekNumber) }),
      },
      include: {
        Usuario: {
          select: {
            id: true,
            nombre: true,
            email: true,
          }
        },
        VisionEscrow: {
          include: {
            Vision: {
              select: {
                id: true,
                nombre: true,
              }
            }
          }
        },
        _count: {
          select: {
            PayableCall: true
          }
        }
      },
      orderBy: {
        generatedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      payouts,
      total: payouts.length,
    });

  } catch (error) {
    console.error('❌ Error obteniendo payouts:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos' },
      { status: 500 }
    );
  }
}
