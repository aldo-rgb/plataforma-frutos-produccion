// 🔄 Utilidad para cancelar sesiones y manejar reembolso de créditos
import { prisma } from '@/lib/prisma';
import { refundSessionCredit } from '@/lib/packageSessionManager';

/**
 * Cancela una sesión y reembolsa el crédito si es de un paquete
 */
export async function cancelBookingWithRefund(bookingId: number) {
  try {
    // Obtener la sesión
    const booking = await prisma.callBooking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        packageOrderId: true,
        type: true,
        studentId: true,
        mentorId: true,
      },
    });

    if (!booking) {
      throw new Error(`Sesión ${bookingId} no encontrada`);
    }

    if (booking.status === 'CANCELLED') {
      console.log(`⚠️ La sesión ${bookingId} ya está cancelada`);
      return { alreadyCancelled: true, booking };
    }

    // Cancelar la sesión
    const cancelledBooking = await prisma.callBooking.update({
      where: { id: bookingId },
      data: {
        status: 'CANCELLED',
        updatedAt: new Date(),
      },
    });

    console.log(`❌ Sesión ${bookingId} cancelada`);

    // Si tiene packageOrderId, reembolsar crédito
    if (booking.packageOrderId) {
      try {
        await refundSessionCredit(booking.packageOrderId);
        console.log(`🔄 Crédito reembolsado para paquete ${booking.packageOrderId}`);
        return {
          cancelled: true,
          creditRefunded: true,
          booking: cancelledBooking,
        };
      } catch (error) {
        console.error(`⚠️ Error al reembolsar crédito:`, error);
        // No fallar si el reembolso falla
        return {
          cancelled: true,
          creditRefunded: false,
          error: 'No se pudo reembolsar el crédito',
          booking: cancelledBooking,
        };
      }
    }

    return {
      cancelled: true,
      creditRefunded: false,
      booking: cancelledBooking,
    };
  } catch (error) {
    console.error(`❌ Error al cancelar sesión ${bookingId}:`, error);
    throw error;
  }
}

/**
 * Cancela múltiples sesiones con reembolso de créditos
 */
export async function cancelMultipleBookingsWithRefund(bookingIds: number[]) {
  const results = {
    cancelled: [] as number[],
    failed: [] as number[],
    creditsRefunded: [] as string[],
  };

  for (const bookingId of bookingIds) {
    try {
      const result = await cancelBookingWithRefund(bookingId);
      
      if (result.cancelled) {
        results.cancelled.push(bookingId);
        
        if (result.creditRefunded && result.booking.packageOrderId) {
          results.creditsRefunded.push(result.booking.packageOrderId);
        }
      }
    } catch (error) {
      console.error(`❌ Error cancelando sesión ${bookingId}:`, error);
      results.failed.push(bookingId);
    }
  }

  console.log(`✅ Canceladas: ${results.cancelled.length}, Fallidas: ${results.failed.length}`);
  console.log(`🔄 Créditos reembolsados: ${results.creditsRefunded.length} paquetes`);

  return results;
}

/**
 * Previene la doble comisión para sesiones de paquetes
 * Modifica onMentorshipSessionCompleted para NO registrar comisión si es de paquete
 */
export function shouldSkipCommissionRegistration(booking: { packageOrderId: string | null }) {
  if (booking.packageOrderId) {
    console.log(`⚠️ Sesión de paquete detectada. Saltando registro de comisión (ya pagada en compra del paquete)`);
    return true;
  }
  return false;
}
