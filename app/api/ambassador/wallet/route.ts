import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { 
  getAmbassadorWalletSummary, 
  requestWithdrawal,
  useBalanceAsCredit,
  PRODUCT_TYPE_LABELS
} from '@/lib/ambassador-engine';

// GET: Obtener resumen del wallet del embajador
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const walletData = await getAmbassadorWalletSummary(session.user.id);

    if (!walletData) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ...walletData
    });

  } catch (error) {
    console.error('Error fetching ambassador wallet:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

// POST: Acciones del wallet (retiro, usar como crédito)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case 'request_withdrawal': {
        const { amount, bankClabe, bankName, accountHolder } = body;
        
        if (!amount || !bankClabe) {
          return NextResponse.json({ 
            success: false, 
            error: 'Se requiere monto y CLABE' 
          }, { status: 400 });
        }

        const result = await requestWithdrawal({
          ambassadorId: session.user.id,
          amount: parseFloat(amount),
          bankClabe,
          bankName,
          accountHolder
        });

        return NextResponse.json(result);
      }

      case 'use_as_credit': {
        const { amount, description } = body;
        
        if (!amount || !description) {
          return NextResponse.json({ 
            success: false, 
            error: 'Se requiere monto y descripción' 
          }, { status: 400 });
        }

        const result = await useBalanceAsCredit({
          ambassadorId: session.user.id,
          amount: parseFloat(amount),
          description
        });

        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ 
          success: false, 
          error: 'Acción no válida' 
        }, { status: 400 });
    }

  } catch (error) {
    console.error('Error processing ambassador wallet action:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}
