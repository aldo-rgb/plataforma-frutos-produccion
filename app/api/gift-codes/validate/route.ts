import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

// POST - Validar código de regalo o código de pago (público, usado en checkout)
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code, organizationId } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código requerido' },
        { status: 400 }
      );
    }

    const codeUpper = code.toUpperCase().trim();

    // Si el código empieza con CASH-, es un PaymentCode (código de cobro)
    if (codeUpper.startsWith('CASH-')) {
      return await validatePaymentCode(codeUpper, organizationId);
    }

    // Si no, buscar en GiftCodes
    const giftCode = await prisma.giftCode.findUnique({
      where: { code: codeUpper },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
        vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
          },
        },
      },
    });

    if (!giftCode) {
      return NextResponse.json(
        { success: false, error: 'Código inválido o no existe' },
        { status: 404 }
      );
    }

    // Verificar que pertenece a la organización (si se especificó)
    if (organizationId && giftCode.organizationId !== parseInt(organizationId)) {
      return NextResponse.json(
        { success: false, error: 'Este código no es válido para esta organización' },
        { status: 400 }
      );
    }

    // Verificar estado
    if (giftCode.status === 'USED') {
      return NextResponse.json(
        { success: false, error: 'Este código ya ha sido utilizado' },
        { status: 400 }
      );
    }

    if (giftCode.status === 'CANCELLED') {
      return NextResponse.json(
        { success: false, error: 'Este código ha sido cancelado' },
        { status: 400 }
      );
    }

    if (giftCode.status === 'EXPIRED') {
      return NextResponse.json(
        { success: false, error: 'Este código ha expirado' },
        { status: 400 }
      );
    }

    // Verificar expiración
    if (giftCode.expiresAt && new Date() > giftCode.expiresAt) {
      // Marcar como expirado
      await prisma.giftCode.update({
        where: { id: giftCode.id },
        data: { status: 'EXPIRED' },
      });

      return NextResponse.json(
        { success: false, error: 'Este código ha expirado' },
        { status: 400 }
      );
    }

    // Código válido
    // Generar descripción según el tipo
    let description = '';
    let ticketsIncluded: string[] = [];
    
    if (giftCode.type === 'GOLDEN') {
      description = '🎫 GOLDEN TICKET - 1 entrada gratuita a Entrenamiento Básico';
      ticketsIncluded = ['BASIC'];
    } else if (giftCode.type === 'GOLDEN_DISCOUNT') {
      const discountPct = giftCode.discountPercentage || 50;
      description = `🎫 GOLDEN TICKET ${discountPct}% OFF - Entrenamiento Básico con ${discountPct}% de descuento`;
      ticketsIncluded = ['BASIC'];
    } else {
      description = '💎 PLATINUM TICKET - Visión Completa (Básico + Avanzado + PL)';
      ticketsIncluded = ['BASIC', 'ADVANCED', 'PL'];
    }

    return NextResponse.json({
      success: true,
      giftCode: {
        id: giftCode.id,
        code: giftCode.code,
        type: giftCode.type,
        value: giftCode.value ? parseFloat(giftCode.value.toString()) : null,
        discountPercentage: giftCode.discountPercentage,
        organization: giftCode.organization,
        vision: giftCode.vision,
        description,
        ticketsIncluded,
      },
    });
  } catch (error) {
    logger.error('Error validating gift code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar código' },
      { status: 500 }
    );
  }
}

// Función para validar PaymentCodes (códigos de cobro en efectivo)
async function validatePaymentCode(code: string, organizationId?: string) {
  const paymentCode = await prisma.paymentCode.findUnique({
    where: { code },
    include: {
      organization: {
        select: {
          id: true,
          name: true,
        },
      },
      vision: {
        select: {
          id: true,
          nombre: true,
        },
      },
    },
  });

  if (!paymentCode) {
    return NextResponse.json(
      { success: false, error: 'Código inválido o no existe' },
      { status: 404 }
    );
  }

  // Verificar organización si se especificó
  if (organizationId && paymentCode.organizationId !== parseInt(organizationId)) {
    return NextResponse.json(
      { success: false, error: 'Este código no es válido para esta organización' },
      { status: 400 }
    );
  }

  // Verificar estado
  if (paymentCode.status === 'REDEEMED') {
    return NextResponse.json(
      { success: false, error: 'Este código ya ha sido utilizado' },
      { status: 400 }
    );
  }

  if (paymentCode.status === 'CANCELLED') {
    return NextResponse.json(
      { success: false, error: 'Este código ha sido cancelado' },
      { status: 400 }
    );
  }

  if (paymentCode.status === 'EXPIRED') {
    return NextResponse.json(
      { success: false, error: 'Este código ha expirado' },
      { status: 400 }
    );
  }

  // Nota: PaymentCode no tiene campo expiresAt, la expiración se maneja por status

  // Código válido - devolver como tipo CASH_PAYMENT
  const amount = Number(paymentCode.amount);
  
  return NextResponse.json({
    success: true,
    giftCode: {
      id: paymentCode.id,
      code: paymentCode.code,
      type: 'CASH_PAYMENT', // Nuevo tipo para pagos en efectivo
      value: amount,
      discountPercentage: null,
      organization: {
        id: paymentCode.organization?.id,
        name: paymentCode.organization?.name,
      },
      vision: paymentCode.vision,
      description: `💵 Pago en Efectivo - $${amount.toLocaleString('es-MX')} MXN`,
      ticketsIncluded: ['BASIC'], // Por defecto cubre básico
      reference: paymentCode.reference,
      isCashPayment: true,
    },
  });
}
