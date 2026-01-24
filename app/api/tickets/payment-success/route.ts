import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/tickets/payment-success
 * 
 * Callback cuando el pago de un ticket pendiente es exitoso.
 * Actualiza el ticket y la inscripción correspondiente.
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const dataParam = searchParams.get('data');
    const paymentId = searchParams.get('payment_id');
    const status = searchParams.get('status');
    const collectionStatus = searchParams.get('collection_status');

    console.log('📨 Payment success callback (ticket) received');
    console.log('   Payment ID:', paymentId);
    console.log('   Status:', status);

    // Parse order data
    let orderData: any = null;
    
    if (dataParam) {
      try {
        orderData = JSON.parse(decodeURIComponent(dataParam));
      } catch (e) {
        console.error('Error parsing data param:', e);
      }
    }

    if (!orderData || !orderData.ticketId || !orderData.userId) {
      console.error('Missing order data');
      return NextResponse.redirect(
        new URL('/dashboard/my-tickets?payment=error&reason=datos-incompletos', request.url)
      );
    }

    const { ticketId, userId, amount, level, visionId } = orderData;

    // Verify payment status
    if (status !== 'approved' && collectionStatus !== 'approved') {
      console.log('Payment not approved:', status, collectionStatus);
      return NextResponse.redirect(
        new URL(`/dashboard/checkout-ticket?ticketId=${ticketId}&payment=failed&status=${status || collectionStatus}`, request.url)
      );
    }

    console.log(`✅ Pago de ticket aprobado`);
    console.log(`   Ticket: ${ticketId}`);
    console.log(`   Usuario: ${userId}`);
    console.log(`   Monto: $${amount} MXN`);

    // Get ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.redirect(
        new URL('/dashboard/my-tickets?payment=error&reason=ticket-no-encontrado', request.url)
      );
    }

    // Verify ownership
    if (ticket.ownerId !== userId) {
      return NextResponse.redirect(
        new URL('/dashboard/my-tickets?payment=error&reason=sin-acceso', request.url)
      );
    }

    // Calculate new amount paid
    const currentAmountPaid = ticket.amountPaid ? parseFloat(ticket.amountPaid.toString()) : 0;
    const costAtPurchase = ticket.costAtPurchase ? parseFloat(ticket.costAtPurchase.toString()) : 0;
    const newAmountPaid = currentAmountPaid + amount;
    const isFullyPaid = newAmountPaid >= costAtPurchase;

    // Update ticket
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        amountPaid: newAmountPaid,
        status: isFullyPaid ? 'ACTIVE' : ticket.status,
        paymentStatus: isFullyPaid ? 'PAID' : 'PARTIAL',
        updatedAt: new Date(),
      },
    });

    console.log(`✅ Ticket actualizado: ${ticketId}`);
    console.log(`   Monto anterior: $${currentAmountPaid}`);
    console.log(`   Monto agregado: $${amount}`);
    console.log(`   Monto total: $${newAmountPaid}`);
    console.log(`   Pagado completo: ${isFullyPaid}`);

    // If ticket is for PL and now fully paid, also update the enrollment
    if (isFullyPaid && ticket.level === 'PL' && visionId) {
      await prisma.vision_enrollments.updateMany({
        where: {
          userId: userId,
          visionId: visionId,
          level: 'PL',
        },
        data: {
          enrollmentStatus: 'ACTIVE',
          paymentStatus: 'PAID',
          updatedAt: new Date(),
        },
      });

      console.log(`✅ Enrollment PL actualizado a ACTIVE`);
    }

    // Redirect to success
    return NextResponse.redirect(
      new URL('/dashboard/my-tickets?payment=success', request.url)
    );

  } catch (error: any) {
    console.error('❌ Error processing ticket payment:', error);
    return NextResponse.redirect(
      new URL(`/dashboard/my-tickets?payment=error&reason=${encodeURIComponent(error.message)}`, request.url)
    );
  }
}
