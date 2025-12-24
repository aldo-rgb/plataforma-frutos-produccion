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
      console.log('💳 Procesando pago con Stripe (simulación)...');
      
      // Para Stripe simulado, marcamos como COMPLETED y generamos créditos
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'stripe',
          paidAt: new Date(),
          paymentData: {
            method: 'stripe',
            status: 'completed',
            paidAt: new Date().toISOString(),
            transactionId: `STRIPE-${orderId.slice(0, 8)}-${Date.now()}`,
          },
        },
      });

      console.log('✅ Orden marcada como COMPLETED con Stripe');

      // Actualizar o crear los créditos de licencia
      console.log(`🎫 Agregando ${order.quantity} créditos para organización ${order.organizationId}...`);
      
      // Buscar crédito existente o crear uno nuevo
      const existingCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          isActive: true,
        },
      });

      let creditRecord;
      if (existingCredit) {
        // Actualizar crédito existente
        creditRecord = await prisma.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: existingCredit.totalPurchased + order.quantity,
            totalPaid: existingCredit.totalPaid + order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
          },
        });
      } else {
        // Crear nuevo registro de crédito
        creditRecord = await prisma.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: order.tier as any,
            totalPurchased: order.quantity,
            totalAllocated: 0,
            unitPrice: order.amount / order.quantity,
            totalPaid: order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            isActive: true,
            notes: `Pago con Stripe - Orden ${orderId}`,
          },
        });
      }

      console.log(`✅ Créditos actualizados: ${creditRecord.totalPurchased} total`);

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        creditsGenerated: order.quantity,
        totalCredits: creditRecord.totalPurchased,
        message: 'Pago procesado exitosamente con Stripe',
      });
    } else if (paymentMethod === 'paypal') {
      console.log('💳 Procesando pago con PayPal (simulación)...');
      
      // Para PayPal simulado, marcamos como COMPLETED y generamos créditos
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'paypal',
          paidAt: new Date(),
          paymentData: {
            method: 'paypal',
            status: 'completed',
            paidAt: new Date().toISOString(),
            transactionId: `PAYPAL-${orderId.slice(0, 8)}-${Date.now()}`,
          },
        },
      });

      console.log('✅ Orden marcada como COMPLETED con PayPal');

      // Actualizar o crear los créditos de licencia
      console.log(`🎫 Agregando ${order.quantity} créditos para organización ${order.organizationId}...`);
      
      // Buscar crédito existente o crear uno nuevo
      const existingCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          isActive: true,
        },
      });

      let creditRecord;
      if (existingCredit) {
        // Actualizar crédito existente
        creditRecord = await prisma.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: existingCredit.totalPurchased + order.quantity,
            totalPaid: existingCredit.totalPaid + order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
          },
        });
      } else {
        // Crear nuevo registro de crédito
        creditRecord = await prisma.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: order.tier as any,
            totalPurchased: order.quantity,
            totalAllocated: 0,
            unitPrice: order.amount / order.quantity,
            totalPaid: order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            isActive: true,
            notes: `Pago con PayPal - Orden ${orderId}`,
          },
        });
      }

      console.log(`✅ Créditos actualizados: ${creditRecord.totalPurchased} total`);

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        creditsGenerated: order.quantity,
        totalCredits: creditRecord.totalPurchased,
        message: 'Pago procesado exitosamente con PayPal',
      });
    } else if (paymentMethod === 'mercadopago') {
      console.log('💳 Procesando pago con Mercado Pago (simulación)...');
      
      // Para Mercado Pago simulado, marcamos como COMPLETED y generamos créditos
      const updatedOrder = await prisma.licenseOrder.update({
        where: { id: orderId },
        data: {
          status: 'COMPLETED',
          paymentMethod: 'mercadopago',
          paidAt: new Date(),
          paymentData: {
            method: 'mercadopago',
            status: 'completed',
            paidAt: new Date().toISOString(),
            transactionId: `MP-${orderId.slice(0, 8)}-${Date.now()}`,
          },
        },
      });

      console.log('✅ Orden marcada como COMPLETED con Mercado Pago');

      // Actualizar o crear los créditos de licencia
      console.log(`🎫 Agregando ${order.quantity} créditos para organización ${order.organizationId}...`);
      
      // Buscar crédito existente o crear uno nuevo
      const existingCredit = await prisma.schoolCredit.findFirst({
        where: {
          organizationId: order.organizationId,
          isActive: true,
        },
      });

      let creditRecord;
      if (existingCredit) {
        // Actualizar crédito existente
        creditRecord = await prisma.schoolCredit.update({
          where: { id: existingCredit.id },
          data: {
            totalPurchased: existingCredit.totalPurchased + order.quantity,
            totalPaid: existingCredit.totalPaid + order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // Extender 1 año
          },
        });
      } else {
        // Crear nuevo registro de crédito
        creditRecord = await prisma.schoolCredit.create({
          data: {
            organizationId: order.organizationId,
            planType: order.tier as any,
            totalPurchased: order.quantity,
            totalAllocated: 0,
            unitPrice: order.amount / order.quantity,
            totalPaid: order.amount,
            expirationDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 año
            isActive: true,
            notes: `Pago con Mercado Pago - Orden ${orderId}`,
          },
        });
      }

      console.log(`✅ Créditos actualizados: ${creditRecord.totalPurchased} total`);

      return NextResponse.json({
        success: true,
        order: updatedOrder,
        creditsGenerated: order.quantity,
        totalCredits: creditRecord.totalPurchased,
        message: 'Pago procesado exitosamente con Mercado Pago',
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
