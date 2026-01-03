import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import prisma from '@/lib/prisma';

/**
 * 💳 TICKET 1: Payment Processing & Escrow Creation
 * POST /api/school-admin/visiones/[id]/checkout
 * 
 * Procesa el pago inicial y crea el escrow de la visión
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
        organizationId: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    if (!user.organizationId) {
      return NextResponse.json({ error: 'Sin organización asociada' }, { status: 400 });
    }

    const visionId = parseInt(params.id);
    const body = await request.json();
    const { useWalletBalance, paymentMethod = 'MANUAL' } = body;

    // Validar que la visión existe y pertenece a la organización
    const vision = await prisma.vision.findFirst({
      where: {
        id: visionId,
        organizationId: user.organizationId,
      },
      include: {
        _count: {
          select: {
            enrollments: {
              where: { status: 'ACTIVE' }
            }
          }
        }
      }
    });

    if (!vision) {
      return NextResponse.json({ error: 'Visión no encontrada' }, { status: 404 });
    }

    // Verificar si ya existe un escrow
    const existingEscrow = await prisma.visionEscrow.findUnique({
      where: { visionId }
    });

    if (existingEscrow) {
      return NextResponse.json({ 
        error: 'Esta visión ya tiene un escrow creado' 
      }, { status: 400 });
    }

    // Calcular el costo total
    const totalStudents = vision._count.enrollments;
    const weeksPerCycle = vision.semanas || 16;
    const callsPerWeek = 2; // Fijo para disciplina
    const totalCallsPerStudent = weeksPerCycle * callsPerWeek;

    // Obtener tarifa del mentor (asumiendo que está en PerfilMentor)
    // Por ahora usamos 500 como default, deberías obtenerla del mentor asignado
    const mentorRate = 500;
    const totalCost = totalStudents * totalCallsPerStudent * mentorRate;

    // Obtener wallet si se va a usar
    let wallet = null;
    let walletDeduction = 0;

    if (useWalletBalance) {
      wallet = await prisma.organizationWallet.findUnique({
        where: { organizationId: user.organizationId }
      });

      if (wallet && Number(wallet.balance) > 0) {
        walletDeduction = Math.min(Number(wallet.balance), totalCost);
      }
    }

    const netPayment = totalCost - walletDeduction;

    // TODO: Integración con Stripe
    // const paymentIntent = await stripe.paymentIntents.create({
    //   amount: Math.round(netPayment * 100), // centavos
    //   currency: 'mxn',
    //   metadata: { visionId, organizationId: user.organizationId }
    // });

    // Crear escrow y procesar transacciones
    const result = await prisma.$transaction(async (tx) => {
      // 1. Crear el escrow
      const escrow = await tx.visionEscrow.create({
        data: {
          visionId,
          totalDeposited: totalCost,
          remainingBalance: totalCost,
          status: 'ACTIVE',
        }
      });

      // 2. Si se usó wallet, crear transacción de débito
      if (walletDeduction > 0 && wallet) {
        await tx.walletTransaction.create({
          data: {
            walletId: wallet.id,
            amount: walletDeduction,
            type: 'DEBIT',
            source: 'PAYMENT_CYCLE',
            description: `Pago inicial Visión ${vision.nombre} (ID: ${visionId})`,
            visionId,
          }
        });

        await tx.organizationWallet.update({
          where: { id: wallet.id },
          data: {
            balance: {
              decrement: walletDeduction
            }
          }
        });
      }

      // 3. Actualizar estado de la visión (opcional)
      await tx.vision.update({
        where: { id: visionId },
        data: {
          updatedAt: new Date()
        }
      });

      return escrow;
    });

    // TODO: Enviar email de confirmación
    // await sendPaymentConfirmationEmail(user.email, vision.nombre, totalCost);

    return NextResponse.json({
      success: true,
      escrow: result,
      payment: {
        totalCost,
        walletDeduction,
        netPayment,
        paymentMethod,
      },
      message: 'Escrow creado exitosamente'
    });

  } catch (error) {
    console.error('❌ Error en checkout:', error);
    return NextResponse.json(
      { error: 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}
