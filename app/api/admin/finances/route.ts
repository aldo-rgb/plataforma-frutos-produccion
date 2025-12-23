import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/finances
 * Panel financiero para administradores
 * Muestra todas las transacciones y métricas de revenue
 */
export async function GET() {
  try {
    // Verificar autenticación y rol de administrador
    const session = await getServerSession(authOptions);
    
    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    // Verificar que sea ADMIN
    if (session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'Acceso denegado. Solo administradores.' }, { status: 403 });
    }

    // 1. Obtener todas las transacciones con detalles completos
    const transactions = await prisma.transaction.findMany({
      include: {
        booking: {
          include: {
            Usuario_CallBooking_mentorIdToUsuario: { 
              select: { 
                id: true,
                nombre: true,
                email: true
              } 
            },
            Usuario_CallBooking_studentIdToUsuario: { 
              select: { 
                id: true,
                nombre: true,
                email: true
              } 
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // 2. Calcular estadísticas financieras
    const stats = transactions.reduce(
      (acc: { 
        totalSales: number; 
        platformProfit: number; 
        mentorPayouts: number;
        held: number;
        released: number;
        refunded: number;
      }, tx: typeof transactions[number]) => {
        acc.totalSales += tx.amountTotal;
        acc.platformProfit += tx.platformFee;
        acc.mentorPayouts += tx.mentorEarnings;

        // Desglosar por estado
        if (tx.status === 'HELD') {
          acc.held += tx.mentorEarnings;
        } else if (tx.status === 'RELEASED') {
          acc.released += tx.mentorEarnings;
        } else if (tx.status === 'REFUNDED') {
          acc.refunded += tx.amountTotal;
        }

        return acc;
      },
      { 
        totalSales: 0, 
        platformProfit: 0, 
        mentorPayouts: 0,
        held: 0,
        released: 0,
        refunded: 0
      }
    );

    // 3. Transformar datos para respuesta (agregar full_name)
    const transactionsFormatted = transactions.map((tx: typeof transactions[number]) => ({
      ...tx,
      booking: {
        ...tx.booking,
        mentor: {
          id: tx.booking.Usuario_CallBooking_mentorIdToUsuario.id,
          email: tx.booking.Usuario_CallBooking_mentorIdToUsuario.email,
          full_name: tx.booking.Usuario_CallBooking_mentorIdToUsuario.nombre
        },
        student: {
          id: tx.booking.Usuario_CallBooking_studentIdToUsuario.id,
          email: tx.booking.Usuario_CallBooking_studentIdToUsuario.email,
          full_name: tx.booking.Usuario_CallBooking_studentIdToUsuario.nombre
        }
      }
    }));

    return NextResponse.json({ 
      transactions: transactionsFormatted, 
      stats,
      count: transactions.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error calculando finanzas:', error);
    return NextResponse.json(
      { error: 'Error calculando finanzas' }, 
      { status: 500 }
    );
  }
}
