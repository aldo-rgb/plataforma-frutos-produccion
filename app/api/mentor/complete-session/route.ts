import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAndAwardBadges } from '@/lib/badgeSystem';

export const dynamic = 'force-dynamic';

/**
 * POST /api/mentor/complete-session
 * 
 * Completa una sesión de mentoría:
 * 1. Marca CallBooking como COMPLETED
 * 2. Libera el pago (Transaction status → RELEASED)
 * 3. Actualiza insignias del mentor
 * 4. Registra fecha de completado
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea mentor
    if (session.user.rol !== 'MENTOR') {
      return NextResponse.json({ error: 'Solo mentores pueden completar sesiones' }, { status: 403 });
    }

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json({ error: 'bookingId requerido' }, { status: 400 });
    }

    // Verificar que la sesión pertenece al mentor
    const existingBooking = await prisma.callBooking.findUnique({
      where: { id: Number(bookingId) },
      select: { 
        mentorId: true, 
        status: true,
        type: true,
        scheduledAt: true
      }
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Sesión no encontrada' }, { status: 404 });
    }

    if (existingBooking.mentorId !== session.user.id) {
      return NextResponse.json({ error: 'Esta sesión no te pertenece' }, { status: 403 });
    }

    if (existingBooking.status === 'COMPLETED') {
      return NextResponse.json({ error: 'Esta sesión ya está completada' }, { status: 400 });
    }

    // Verificar que la fecha ya pasó
    if (new Date(existingBooking.scheduledAt) > new Date()) {
      return NextResponse.json({ 
        error: 'No puedes completar una sesión que aún no ha ocurrido' 
      }, { status: 400 });
    }

    console.log(`📋 Completando sesión ${bookingId} del mentor ${session.user.id}`);

    // TRANSACCIÓN ATÓMICA: Todo o nada
    const result = await prisma.$transaction(async (tx) => {
      // 1. Marcar Booking como COMPLETADA
      const updatedBooking = await tx.callBooking.update({
        where: { id: Number(bookingId) },
        data: { 
          status: 'COMPLETED',
          completedAt: new Date()
        },
        include: {
          Transaction: true,
          Usuario_CallBooking_studentIdToUsuario: {
            select: { nombre: true }
          }
        }
      });

      // 2. Liberar el Dinero (Solo si es MENTORSHIP pagada)
      let paymentReleased = false;
      let amountReleased = 0;

      if (updatedBooking.type === 'MENTORSHIP' && updatedBooking.Transaction) {
        await tx.transaction.update({
          where: { id: updatedBooking.Transaction.id },
          data: { 
            status: 'RELEASED',
            releasedAt: new Date()
          }
        });
        
        paymentReleased = true;
        amountReleased = updatedBooking.Transaction.mentorEarnings;
        
        console.log(`💰 Pago liberado: $${amountReleased} para mentor ${session.user.id}`);
      }

      return {
        booking: updatedBooking,
        paymentReleased,
        amountReleased
      };
    });

    // 3. AUTOMATIZACIONES (Fire and forget - no bloqueamos la respuesta)
    // Actualizar insignias en segundo plano
    checkAndAwardBadges(session.user.id)
      .then((badges) => {
        if (badges && badges.length > 0) {
          console.log(`🏅 Insignias actualizadas para mentor ${session.user.id}:`, badges);
        }
      })
      .catch((error) => {
        console.error('❌ Error actualizando insignias:', error);
      });

    // Respuesta exitosa
    return NextResponse.json({
      success: true,
      message: 'Sesión completada exitosamente',
      booking: {
        id: result.booking.id,
        status: result.booking.status,
        completedAt: result.booking.completedAt
      },
      payment: result.paymentReleased ? {
        released: true,
        amount: result.amountReleased,
        message: `Se liberaron $${result.amountReleased} a tu cuenta`
      } : {
        released: false,
        message: 'Esta sesión no tiene pago asociado (llamada de disciplina)'
      },
      student: {
        name: result.booking.Usuario_CallBooking_studentIdToUsuario.nombre,
        message: 'El estudiante ahora puede calificarte'
      }
    });

  } catch (error: any) {
    console.error('❌ Error completando sesión:', error);
    
    return NextResponse.json(
      { 
        error: 'Error al completar la sesión',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
