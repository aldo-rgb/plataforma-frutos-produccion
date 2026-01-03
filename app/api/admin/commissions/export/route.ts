import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generatePayoutReport } from '@/lib/commissionCalculator';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/commissions/export
 * 
 * Exporta comisiones seleccionadas a CSV para pago bancario
 * Query params: ids[] (array de ledger IDs)
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || session.user.rol !== 'ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const ids = searchParams.getAll('ids');

    if (!ids || ids.length === 0) {
      return NextResponse.json({ error: 'No hay IDs para exportar' }, { status: 400 });
    }

    // Generar reporte CSV
    const csvData = await generatePayoutReport(ids);

    // Convertir a CSV string
    const headers = Object.keys(csvData[0] || {}).join(',');
    const rows = csvData.map(row => 
      Object.values(row).map(val => `"${val}"`).join(',')
    );
    const csv = [headers, ...rows].join('\n');

    // Retornar como archivo CSV
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="payouts-${new Date().toISOString().split('T')[0]}.csv"`
      }
    });

  } catch (error: any) {
    console.error('❌ Error exporting CSV:', error);
    return NextResponse.json(
      { error: 'Error exportando CSV', details: error.message },
      { status: 500 }
    );
  }
}
