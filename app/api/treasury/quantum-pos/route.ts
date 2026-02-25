import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

const MERCADO_PAGO_API = 'https://api.mercadopago.com';

/**
 * API para integración con Mercado Pago Point (Terminal física)
 * 
 * Endpoints:
 * - GET: Lista dispositivos vinculados
 * - POST: Crear Payment Intent (enviar cobro a terminal)
 * - DELETE: Cancelar Payment Intent
 */

// GET - Listar dispositivos Point vinculados
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Mercado Pago no configurado',
        configured: false 
      }, { status: 400 });
    }

    // Listar dispositivos Point
    const response = await fetch(`${MERCADO_PAGO_API}/point/integration-api/devices`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error fetching devices:', errorData);
      return NextResponse.json({ 
        error: 'Error al obtener dispositivos',
        details: errorData
      }, { status: response.status });
    }

    const data = await response.json();
    
    return NextResponse.json({
      success: true,
      configured: true,
      devices: data.devices || []
    });

  } catch (error) {
    console.error('Error in Quantum POS GET:', error);
    return NextResponse.json(
      { error: 'Error al conectar con Mercado Pago' },
      { status: 500 }
    );
  }
}

// POST - Crear Payment Intent (enviar cobro a terminal)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      deviceId, 
      amount, 
      description, 
      participantId, 
      participantName,
      visionId,
      ticketLevel,
      externalReference 
    } = body;

    if (!deviceId || !amount) {
      return NextResponse.json({ 
        error: 'deviceId y amount son requeridos' 
      }, { status: 400 });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Mercado Pago no configurado' 
      }, { status: 400 });
    }

    // Generar referencia externa única
    const reference = externalReference || `QP-${Date.now()}-${participantId || 'ANON'}`;

    // Crear Payment Intent
    const paymentIntentBody = {
      amount: Math.round(amount * 100) / 100, // Asegurar 2 decimales
      description: description || `Pago Impacto Cuántico - ${participantName || 'Participante'}`,
      payment: {
        type: 'credit_card' // También acepta debit_card
      },
      additional_info: {
        external_reference: reference,
        print_on_terminal: true
      }
    };

    const response = await fetch(
      `${MERCADO_PAGO_API}/point/integration-api/devices/${deviceId}/payment-intents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'X-Idempotency-Key': reference // Evitar cobros duplicados
        },
        body: JSON.stringify(paymentIntentBody)
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('Error creating payment intent:', errorData);
      return NextResponse.json({ 
        error: 'Error al crear intención de pago',
        details: errorData
      }, { status: response.status });
    }

    const paymentIntent = await response.json();

    // Guardar el Payment Intent en la base de datos para tracking
    await prisma.quantumPOSTransaction.create({
      data: {
        paymentIntentId: paymentIntent.id,
        deviceId,
        amount: amount,
        status: 'PENDING',
        participantId: participantId ? parseInt(participantId) : null,
        visionId: visionId ? parseInt(visionId) : null,
        ticketLevel: ticketLevel || null,
        externalReference: reference,
        description: description || null,
        createdById: Number(session.user.id),
        metadata: JSON.stringify({
          participantName,
          createdAt: new Date().toISOString()
        })
      }
    });

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: paymentIntent.id,
        status: paymentIntent.status,
        amount: amount,
        reference: reference
      },
      message: 'Cobro enviado a terminal. Esperando pago...'
    });

  } catch (error: any) {
    console.error('Error in Quantum POS POST:', error);
    
    // Si el error es porque no existe la tabla, retornar mensaje específico
    if (error?.code === 'P2021' || error?.message?.includes('does not exist')) {
      return NextResponse.json({
        success: false,
        error: 'Tabla QuantumPOSTransaction no existe. Ejecutar migración.',
        migrationNeeded: true
      }, { status: 500 });
    }
    
    return NextResponse.json(
      { error: 'Error al procesar el pago' },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar Payment Intent
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const deviceId = searchParams.get('deviceId');
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!deviceId || !paymentIntentId) {
      return NextResponse.json({ 
        error: 'deviceId y paymentIntentId son requeridos' 
      }, { status: 400 });
    }

    const accessToken = process.env.MERCADO_PAGO_ACCESS_TOKEN;
    if (!accessToken) {
      return NextResponse.json({ 
        error: 'Mercado Pago no configurado' 
      }, { status: 400 });
    }

    // Cancelar el Payment Intent
    const response = await fetch(
      `${MERCADO_PAGO_API}/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );

    if (!response.ok && response.status !== 204) {
      const errorData = await response.json().catch(() => ({}));
      return NextResponse.json({ 
        error: 'Error al cancelar intención de pago',
        details: errorData
      }, { status: response.status });
    }

    // Actualizar en BD
    await prisma.quantumPOSTransaction.updateMany({
      where: { paymentIntentId },
      data: { 
        status: 'CANCELLED',
        updatedAt: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      message: 'Intención de pago cancelada'
    });

  } catch (error) {
    console.error('Error in Quantum POS DELETE:', error);
    return NextResponse.json(
      { error: 'Error al cancelar el pago' },
      { status: 500 }
    );
  }
}
