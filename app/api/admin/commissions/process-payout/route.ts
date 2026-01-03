import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { markCommissionsAsPaid } from '@/lib/commissionCalculator';
import { nanoid } from 'nanoid';

export const dynamic = 'force-dynamic';

/**
 * POST /api/admin/commissions/process-payout
 * 
 * Marca comisiones como pagadas
 * Body: {
 *   ledgerIds: string[],
 *   paymentMethod: 'transfer' | 'stripe' | 'paypal',
 *   paymentReference?: string
 * }
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { ledgerIds, paymentMethod, paymentReference } = await request.json();

    if (!ledgerIds || ledgerIds.length === 0) {
      return NextResponse.json({ error: 'ledgerIds requerido' }, { status: 400 });
    }

    if (!paymentMethod) {
      return NextResponse.json({ error: 'paymentMethod requerido' }, { status: 400 });
    }

    // Generar ID único para el batch
    const payoutBatchId = `PAYOUT-${nanoid(10)}`;

    console.log(`💸 Processing payout batch ${payoutBatchId} for ${ledgerIds.length} commissions`);

    // Marcar como pagadas
    const result = await markCommissionsAsPaid(
      ledgerIds,
      payoutBatchId,
      paymentMethod,
      paymentReference
    );

    return NextResponse.json({
      success: true,
      count: result.count,
      batchId: payoutBatchId,
      message: `${result.count} comisiones marcadas como pagadas`
    });

  } catch (error: any) {
    console.error('❌ Error processing payout:', error);
    return NextResponse.json(
      { error: 'Error procesando pago', details: error.message },
      { status: 500 }
    );
  }
}
