import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    console.log('🛒 Iniciando proceso de checkout...');
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.error('❌ No hay sesión activa o falta user.id');
      return NextResponse.json(
        { success: false, error: 'No autenticado' },
        { status: 401 }
      );
    }

    console.log('✅ Usuario autenticado:', session.user.email);

    // Verificar que el usuario es director
    const user = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      include: {
        ManagedOrganization: true,
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      console.error('❌ Usuario no es SCHOOL_ADMIN:', user?.rol);
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 403 }
      );
    }

    console.log('✅ Usuario verificado como SCHOOL_ADMIN');

    const body = await req.json();
    const { orderId, paymentMethod, proofUrl } = body;

    console.log('📦 Datos recibidos:', { orderId, paymentMethod, proofUrl: proofUrl ? '✅' : '❌' });

    if (!orderId || !paymentMethod) {
      console.error('❌ Datos incompletos');
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    console.log('🔍 Buscando orden:', orderId);

    // Buscar la orden
    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: true,
      },
    });

    console.log('📋 Orden encontrada:', order ? '✅' : '❌');

    if (!order) {
      return NextResponse.json(
        { success: false, error: 'Orden no encontrada' },
        { status: 404 }
      );
    }

    // Verificar que la orden pertenece al director
    if (order.requestedBy !== user.id) {
      return NextResponse.json(
        { success: false, error: 'No autorizado para esta orden' },
        { status: 403 }
      );
    }

    // Verificar que la orden está pendiente
    if (order.status !== 'PENDING') {
      return NextResponse.json(
        { success: false, error: 'Esta orden ya ha sido procesada' },
        { status: 400 }
      );
    }

    // Procesar según el método de pago
    if (paymentMethod === 'transfer') {
      console.log('💸 Procesando pago por transferencia...');
      
      // Para transferencia, solo actualizamos el método de pago y guardamos el comprobante
      // El director recibirá instrucciones por correo/pantalla
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'PROCESSING', // Cambiar a PROCESSING en lugar de PENDING
          paymentData: {
            method: 'transfer',
            proofUrl: proofUrl || null, // URL del comprobante
            uploadedAt: new Date().toISOString(),
            instructions: {
              bank: 'BBVA',
              account: '0123456789',
              clabe: '012345678901234567',
              beneficiary: 'Frutos del Espíritu A.C.',
              reference: orderId,
            },
          },
        },
      });

      console.log('✅ Orden actualizada a PROCESSING');

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        paymentMethod: 'transfer',
        instructions: {
          bank: 'BBVA',
          account: '0123456789',
          clabe: '012345678901234567',
          beneficiary: 'Frutos del Espíritu A.C.',
          reference: orderId,
          amount: order.amount,
        },
      });
    } else if (paymentMethod === 'stripe') {
      // Integración con Stripe
      const paymentUrl = `https://checkout.stripe.com/pay/${orderId}`;

      await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          paymentUrl,
          paymentData: {
            method: 'stripe',
            status: 'initiated',
          },
        },
      });

      return NextResponse.json({
        success: true,
        paymentUrl,
        order,
      });
    } else if (paymentMethod === 'paypal') {
      // Integración con PayPal
      const paymentUrl = `https://www.paypal.com/checkoutnow?token=${orderId}`;

      await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          paymentUrl,
          paymentData: {
            method: 'paypal',
            status: 'initiated',
          },
        },
      });

      return NextResponse.json({
        success: true,
        paymentUrl,
        order,
      });
    } else if (paymentMethod === 'mercadopago') {
      // Integración con Mercado Pago
      const paymentUrl = `https://www.mercadopago.com.mx/checkout/v1/payment/${orderId}`;

      await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          paymentUrl,
          paymentData: {
            method: 'mercadopago',
            status: 'initiated',
          },
        },
      });

      return NextResponse.json({
        success: true,
        paymentUrl,
        order,
      });
    } else {
      return NextResponse.json(
        { success: false, error: 'Método de pago no soportado' },
        { status: 400 }
      );
    }
  } catch (error: any) {
    console.error('❌ Error en checkout:', error);
    console.error('Stack trace:', error.stack);
    return NextResponse.json(
      {
        success: false,
        error: 'Error al procesar el pago',
        details: error.message || 'Error desconocido',
      },
      { status: 500 }
    );
  }
}
