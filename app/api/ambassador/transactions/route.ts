import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET: Obtener lista de transacciones/comisiones del embajador
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
    }

    // Obtener todas las transacciones del embajador con info del referido
    const transactions = await prisma.ambassador_wallet_transactions.findMany({
      where: { ambassadorId: session.user.id },
      include: {
        referredUser: {
          select: {
            id: true,
            nombre: true,
            email: true,
            imagen: true,
            profileImage: true,
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    // Formatear las transacciones para el frontend
    const formattedTransactions = transactions.map(t => ({
      id: t.id,
      referredUser: t.referredUser ? {
        id: t.referredUser.id,
        nombre: t.referredUser.nombre,
        email: t.referredUser.email,
        imagen: t.referredUser.profileImage || t.referredUser.imagen
      } : null,
      productType: t.productType,
      productLabel: getProductLabel(t.productType),
      saleAmount: Number(t.saleAmount),
      commissionPercent: Number(t.commissionPercent),
      commissionAmount: Number(t.commissionAmount),
      status: t.status,
      statusLabel: getStatusLabel(t.status),
      notes: t.notes,
      createdAt: t.createdAt.toISOString(),
    }));

    // Calcular resumen
    const summary = {
      totalTransactions: transactions.length,
      totalEarned: transactions.reduce((sum, t) => sum + Number(t.commissionAmount), 0),
      byProductType: {
        training: transactions.filter(t => ['BASIC', 'COMBO', 'ADVANCED', 'PL'].includes(t.productType)).length,
        workshop: transactions.filter(t => t.productType === 'WORKSHOP').length,
      }
    };

    return NextResponse.json({
      success: true,
      transactions: formattedTransactions,
      summary
    });

  } catch (error) {
    console.error('Error fetching ambassador transactions:', error);
    return NextResponse.json({ success: false, error: 'Error del servidor' }, { status: 500 });
  }
}

function getProductLabel(productType: string): string {
  const labels: Record<string, string> = {
    'BASIC': 'Entrenamiento Básico',
    'COMBO': 'Jornada Completa',
    'ADVANCED': 'Entrenamiento Avanzado',
    'PL': 'Liderato (PL)',
    'WORKSHOP': 'Taller'
  };
  return labels[productType] || productType;
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    'PENDING': 'Pendiente',
    'CLEARED': 'Disponible',
    'WITHDRAWN': 'Retirado',
    'SPENT': 'Usado'
  };
  return labels[status] || status;
}
