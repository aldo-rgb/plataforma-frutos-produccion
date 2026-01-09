import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const userId = parseInt(session.user.id);
    const { code } = await req.json();

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código requerido' },
        { status: 400 }
      );
    }

    // Buscar el código de regalo
    const giftCode = await prisma.giftCode.findUnique({
      where: { code: code.toUpperCase() },
      include: {
        organization: true,
      },
    });

    if (!giftCode) {
      return NextResponse.json(
        { success: false, error: 'Código no encontrado' },
        { status: 404 }
      );
    }

    if (giftCode.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Este código ya fue usado o está expirado' },
        { status: 400 }
      );
    }

    if (giftCode.expiresAt && new Date(giftCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este código ha expirado' },
        { status: 400 }
      );
    }

    // Obtener tickets con saldo pendiente del usuario
    const unpaidTickets = await prisma.ticket.findMany({
      where: {
        ownerId: userId,
        organizationId: giftCode.organizationId,
        paymentStatus: {
          in: ['UNPAID', 'PARTIAL'],
        },
      },
      orderBy: [
        { level: 'asc' }, // BASIC primero
        { createdAt: 'asc' },
      ],
    });

    if (unpaidTickets.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No tienes tickets pendientes de pago' },
        { status: 400 }
      );
    }

    // Calcular el valor del código
    let codeValue = giftCode.value ? parseFloat(giftCode.value.toString()) : 0;
    
    // Si no tiene valor explícito, calcularlo basado en precios por defecto
    if (!codeValue) {
      const defaultPrices = await prisma.defaultPrice.findMany({
        where: { organizationId: giftCode.organizationId },
      });

      const priceMap: Record<string, number> = {};
      defaultPrices.forEach((p: any) => {
        priceMap[p.tier] = p.amount;
      });

      if (giftCode.type === 'GOLDEN') {
        codeValue = priceMap['BASIC'] || 3500;
      } else {
        codeValue = (priceMap['BASIC'] || 3500) + 
                    (priceMap['ADVANCED'] || 4500) + 
                    (priceMap['PL'] || 5500);
      }
    }

    let remainingValue = codeValue;
    const updatedTickets: string[] = [];

    // Aplicar el valor del código a los tickets pendientes
    await prisma.$transaction(async (tx) => {
      for (const ticket of unpaidTickets) {
        if (remainingValue <= 0) break;

        const totalCost = ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0;
        const currentPaid = ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0;
        const balance = Math.max(0, totalCost - currentPaid);

        if (balance <= 0) continue;

        const amountToApply = Math.min(remainingValue, balance);
        const newAmountPaid = currentPaid + amountToApply;
        const newPaymentStatus = newAmountPaid >= totalCost ? 'PAID' : 'PARTIAL';

        await tx.ticket.update({
          where: { id: ticket.id },
          data: {
            amountPaid: newAmountPaid,
            paymentStatus: newPaymentStatus,
          },
        });

        // Registrar la transacción
        await tx.ticketTransaction.create({
          data: {
            ticketId: ticket.id,
            gateway: 'GIFT_CODE',
            transactionRef: giftCode.code,
            amount: amountToApply,
            currency: 'MXN',
            status: 'COMPLETED',
            metadata: {
              giftCodeId: giftCode.id,
              giftCodeType: giftCode.type,
            },
          },
        });

        remainingValue -= amountToApply;
        updatedTickets.push(ticket.id);
      }

      // Marcar el código como usado
      await tx.giftCode.update({
        where: { id: giftCode.id },
        data: {
          status: 'USED',
          usedById: userId,
          usedAt: new Date(),
        },
      });
    });

    // Calcular balance restante
    const remainingTickets = await prisma.ticket.findMany({
      where: {
        ownerId: userId,
        paymentStatus: {
          in: ['UNPAID', 'PARTIAL'],
        },
      },
    });

    const remainingBalance = remainingTickets.reduce((sum, t) => {
      const cost = t.costAtPurchase ? parseFloat(t.costAtPurchase.toString()) : 0;
      const paid = t.amountPaid ? parseFloat(t.amountPaid.toString()) : 0;
      return sum + Math.max(0, cost - paid);
    }, 0);

    return NextResponse.json({
      success: true,
      message: 'Código aplicado exitosamente',
      amountApplied: codeValue - remainingValue,
      ticketsUpdated: updatedTickets.length,
      remainingBalance,
    });
  } catch (error) {
    console.error('Error applying gift code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al aplicar código' },
      { status: 500 }
    );
  }
}
