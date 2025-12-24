import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session || !session.user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = session.user as any;

    // Verificar que el usuario sea ADMINISTRADOR
    if (user.rol !== 'ADMINISTRADOR') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    // Obtener órdenes de pago en estado PROCESSING (comprobante subido, pendiente de aprobación)
    const pendingPayments = await prisma.licenseOrder.findMany({
      where: {
        status: 'PROCESSING'
      },
      include: {
        Organization: {
          select: {
            id: true,
            name: true,
            contactEmail: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    });

    return NextResponse.json({
      success: true,
      pendingPayments,
      count: pendingPayments.length
    });

  } catch (error) {
    console.error('Error al obtener pagos pendientes:', error);
    return NextResponse.json(
      { error: 'Error al obtener pagos pendientes' },
      { status: 500 }
    );
  }
}
