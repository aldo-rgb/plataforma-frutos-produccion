import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/checkout/validate-code
 * Valida cualquier tipo de código: Gift Code o Cash Code
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Código requerido' },
        { status: 400 }
      );
    }

    const cleanCode = code.toUpperCase().trim();

    // Primero intentar como Cash Code (CASH-XXXX-MONTO)
    if (cleanCode.startsWith('CASH-')) {
      const paymentCode = await prisma.paymentCode.findUnique({
        where: { code: cleanCode },
        include: {
          vision: { select: { id: true, nombre: true } },
          organization: { select: { id: true, name: true } },
        },
      });

      if (!paymentCode) {
        return NextResponse.json(
          { success: false, error: 'Código de efectivo no encontrado' },
          { status: 404 }
        );
      }

      if (paymentCode.status !== 'ACTIVE') {
        const statusMessages: Record<string, string> = {
          REDEEMED: 'Este código ya fue utilizado',
          CANCELLED: 'Este código fue cancelado',
          EXPIRED: 'Este código ha expirado',
        };
        return NextResponse.json(
          { success: false, error: statusMessages[paymentCode.status] || 'Código no disponible' },
          { status: 400 }
        );
      }

      return NextResponse.json({
        success: true,
        codeType: 'CASH',
        paymentCode: {
          id: paymentCode.id,
          code: paymentCode.code,
          type: 'CASH',
          amount: Number(paymentCode.amount),
          reference: paymentCode.reference,
          vision: paymentCode.vision,
          organization: paymentCode.organization,
        },
      });
    }

    // Si no es CASH, intentar como Gift Code
    const giftCode = await prisma.giftCode.findUnique({
      where: { code: cleanCode },
      include: {
        Vision: { select: { id: true, nombre: true } },
        Organization: { select: { id: true, name: true } },
      },
    });

    if (!giftCode) {
      return NextResponse.json(
        { success: false, error: 'Código no encontrado' },
        { status: 404 }
      );
    }

    if (giftCode.status !== 'ACTIVE') {
      const statusMessages: Record<string, string> = {
        USED: 'Este código ya fue utilizado',
        CANCELLED: 'Este código fue cancelado',
        EXPIRED: 'Este código ha expirado',
      };
      return NextResponse.json(
        { success: false, error: statusMessages[giftCode.status] || 'Código no disponible' },
        { status: 400 }
      );
    }

    // Verificar expiración
    if (giftCode.expiresAt && new Date(giftCode.expiresAt) < new Date()) {
      return NextResponse.json(
        { success: false, error: 'Este código ha expirado' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      codeType: 'GIFT',
      giftCode: {
        code: giftCode.code,
        type: giftCode.type,
        value: giftCode.value ? Number(giftCode.value) : null,
        discountPercentage: giftCode.discountPercentage,
        organizationName: giftCode.Organization.name,
        visionName: giftCode.Vision?.nombre || null,
        tickets: giftCode.type === 'PLATINUM' 
          ? [
              { level: 'BASIC', name: 'Entrenamiento Básico' },
              { level: 'ADVANCED', name: 'Avanzado' },
              { level: 'PL', name: 'Quantum Leadership' },
            ]
          : [{ level: 'BASIC', name: 'Entrenamiento Básico' }],
      },
    });
  } catch (error) {
    logger.error('Error validating code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar código' },
      { status: 500 }
    );
  }
}
