import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// GET - Obtener datos de un checkout abandonado para pagar anticipo
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const checkoutId = url.searchParams.get('id');
    const email = url.searchParams.get('email');

    if (!checkoutId && !email) {
      return NextResponse.json(
        { success: false, error: 'Se requiere id o email del checkout' },
        { status: 400 }
      );
    }

    // Buscar el checkout
    const checkout = await prisma.abandonedCheckout.findFirst({
      where: checkoutId
        ? { id: checkoutId }
        : {
            email: email!,
            status: { in: ['EMAIL_SENT', 'IN_CHECKOUT'] },
          },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
          },
        },
        organization: true,
        user: {
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!checkout) {
      return NextResponse.json(
        { success: false, error: 'Checkout no encontrado o ya completado' },
        { status: 404 }
      );
    }

    // Verificar que no esté completado (usar los estados reales del enum)
    if (checkout.status === 'CONVERTED_ANTICIPO' || checkout.status === 'CONVERTED_FULL' || checkout.status === 'EXPIRED') {
      return NextResponse.json(
        { success: false, error: 'Este checkout ya fue procesado' },
        { status: 400 }
      );
    }

    // Buscar ticket pendiente
    const pendingTicket = checkout.userId
      ? await prisma.ticket.findFirst({
          where: {
            ownerId: checkout.userId,
            visionId: checkout.visionId,
            paymentStatus: 'PENDING',
          },
          select: { id: true },
        })
      : null;

    const anticipoAmount = checkout.organization.anticipoAmount?.toNumber() || 2000;
    const originalPrice = checkout.originalPrice?.toNumber() || 6500;

    return NextResponse.json({
      success: true,
      checkout: {
        id: checkout.id,
        email: checkout.email,
        firstName: checkout.firstName || 'Participante',
        lastName: checkout.lastName || '',
        phone: checkout.phone,
        visionId: checkout.visionId,
        visionName: checkout.vision?.nombre || 'el programa',
        organizationId: checkout.organizationId,
        organizationName: checkout.organization.name,
        logoUrl: checkout.organization.logoUrl,
        website: (checkout.organization as any).website || null,
        originalPrice,
        anticipoAmount,
        remaining: originalPrice - anticipoAmount,
        deadline: checkout.organization.anticipoDeadlineHours || 72,
        ticketId: pendingTicket?.id || null,
        userId: checkout.userId,
      },
    });
  } catch (error: any) {
    console.error('Error fetching checkout data:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno' },
      { status: 500 }
    );
  }
}
