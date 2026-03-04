import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * API de Integraciones Point - Mercado Pago
 * Documentación: https://www.mercadopago.com.mx/developers/es/docs/mp-point/integration-api
 * 
 * Esta API permite:
 * - Enviar intenciones de pago a terminales Point (Smart, Pro, etc.)
 * - Consultar dispositivos vinculados
 * - Cancelar intenciones de pago
 * - Consultar estado de pagos
 */

const MP_API_BASE = 'https://api.mercadopago.com';

// GET - Obtener dispositivos Point vinculados o estado de pago
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action') || 'devices';
    const paymentIntentId = searchParams.get('paymentIntentId');

    // Obtener credenciales de Mercado Pago de la organización
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true, nombre: true },
    });

    logger.debug('[MP Point] Usuario:', { 
      sessionUserId: session.user.id, 
      organizationId: usuario?.organizationId,
      nombre: usuario?.nombre 
    });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    const mpConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { 
        organizationId: usuario.organizationId,
        provider: 'MERCADOPAGO',
        isActive: true,
      },
    });

    logger.debug('[MP Point] Gateway config:', { 
      found: !!mpConfig, 
      hasSecretKey: !!mpConfig?.secretKey,
      orgId: usuario.organizationId
    });

    if (!mpConfig?.secretKey) {
      return NextResponse.json({ 
        error: 'Mercado Pago no está configurado para esta organización',
        configured: false,
        debug: { orgId: usuario.organizationId, userId: session.user.id }
      }, { status: 400 });
    }

    const accessToken = mpConfig.secretKey;

    // Acción: Listar dispositivos Point
    if (action === 'devices') {
      const response = await fetch(`${MP_API_BASE}/point/integration-api/devices`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        logger.error('[MP Point] Error obteniendo dispositivos:', errorData);
        return NextResponse.json({ 
          error: 'Error al obtener dispositivos Point',
          details: errorData 
        }, { status: response.status });
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        devices: data.devices || [],
        configured: true,
      });
    }

    // Acción: Consultar estado de un pago
    if (action === 'status' && paymentIntentId) {
      const response = await fetch(
        `${MP_API_BASE}/point/integration-api/payment-intents/${paymentIntentId}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return NextResponse.json({ 
          error: 'Error al consultar estado del pago',
          details: errorData 
        }, { status: response.status });
      }

      const data = await response.json();
      
      return NextResponse.json({
        success: true,
        paymentIntent: data,
      });
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    logger.error('[MP Point] Error GET:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}

// POST - Crear intención de pago en dispositivo Point
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const body = await request.json();
    const { 
      deviceId,           // ID del dispositivo Point (ej: "PAX_A910__SMARTPOS1234567890")
      amount,             // Monto en pesos (ej: 1500.00)
      description,        // Descripción del cobro
      externalReference,  // Referencia externa (opcional)
      // Datos adicionales para tracking interno
      participantId,
      participantName,
      visionId,
      ticketLevel,
    } = body;

    // Validaciones
    if (!deviceId) {
      return NextResponse.json({ error: 'Device ID es requerido' }, { status: 400 });
    }
    if (!amount || amount <= 0) {
      return NextResponse.json({ error: 'Monto debe ser mayor a 0' }, { status: 400 });
    }

    // Obtener credenciales de Mercado Pago
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    console.log('[MP Point POST] Usuario:', { sessionUserId: session.user.id, orgId: usuario?.organizationId });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    const mpConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { 
        organizationId: usuario.organizationId,
        provider: 'MERCADOPAGO',
        isActive: true,
      },
    });

    console.log('[MP Point POST] Config encontrada:', { 
      found: !!mpConfig, 
      hasSecretKey: !!mpConfig?.secretKey,
      provider: mpConfig?.provider
    });

    if (!mpConfig?.secretKey) {
      return NextResponse.json({ 
        error: 'Mercado Pago no está configurado' 
      }, { status: 400 });
    }

    const accessToken = mpConfig.secretKey;

    // Generar referencia externa única si no se proporciona
    const reference = externalReference || `QM-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Crear intención de pago en Mercado Pago Point
    // Documentación: https://www.mercadopago.com.mx/developers/es/reference/integrations_api/_point_integration-api_devices_deviceid_payment-intents/post
    // NOTA: La API de Point solo acepta 'amount' y 'additional_info', NO acepta 'description' ni 'external_reference' directamente
    const paymentIntentPayload = {
      amount: Math.round(amount * 100) / 100, // Asegurar 2 decimales
      additional_info: {
        external_reference: reference,
        print_on_terminal: true,
      },
    };

    console.log('[MP Point POST] Enviando a MP:', {
      url: `${MP_API_BASE}/point/integration-api/devices/${deviceId}/payment-intents`,
      payload: paymentIntentPayload
    });

    const response = await fetch(
      `${MP_API_BASE}/point/integration-api/devices/${deviceId}/payment-intents`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentIntentPayload),
      }
    );

    const data = await response.json();

    console.log('[MP Point POST] Respuesta de MP:', { 
      status: response.status, 
      ok: response.ok,
      data 
    });

    if (!response.ok) {
      logger.error('[MP Point] Error creando intención de pago:', data);
      return NextResponse.json({ 
        error: data.message || 'Error al crear intención de pago',
        details: data 
      }, { status: response.status });
    }

    logger.debug('[MP Point] Intención de pago creada:', data);

    // Guardar tracking interno (opcional - para seguimiento)
    // Puedes crear una tabla PaymentIntent si necesitas persistir esto

    return NextResponse.json({
      success: true,
      paymentIntent: {
        id: data.id,
        status: data.state || 'OPEN',
        amount: amount,
        reference: reference,
        deviceId: deviceId,
        createdAt: new Date().toISOString(),
      },
      message: 'Intención de pago enviada a terminal Point',
    });

  } catch (error: any) {
    logger.error('[MP Point] Error POST:', error);
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error.message 
    }, { status: 500 });
  }
}

// DELETE - Cancelar intención de pago
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const deviceId = searchParams.get('deviceId');
    const paymentIntentId = searchParams.get('paymentIntentId');

    if (!deviceId || !paymentIntentId) {
      return NextResponse.json({ 
        error: 'deviceId y paymentIntentId son requeridos' 
      }, { status: 400 });
    }

    // Obtener credenciales
    const usuario = await prisma.usuario.findUnique({
      where: { id: session.user.id },
      select: { organizationId: true },
    });

    if (!usuario?.organizationId) {
      return NextResponse.json({ error: 'No perteneces a ninguna organización' }, { status: 404 });
    }

    const mpConfig = await prisma.paymentGatewayConfig.findFirst({
      where: { 
        organizationId: usuario.organizationId,
        provider: 'MERCADOPAGO',
        isActive: true,
      },
    });

    if (!mpConfig?.secretKey) {
      return NextResponse.json({ error: 'Mercado Pago no está configurado' }, { status: 400 });
    }

    const accessToken = mpConfig.secretKey;

    // Cancelar intención de pago
    const response = await fetch(
      `${MP_API_BASE}/point/integration-api/devices/${deviceId}/payment-intents/${paymentIntentId}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      logger.error('[MP Point] Error cancelando intención:', errorData);
      return NextResponse.json({ 
        error: 'Error al cancelar intención de pago',
        details: errorData 
      }, { status: response.status });
    }

    return NextResponse.json({
      success: true,
      message: 'Intención de pago cancelada',
    });

  } catch (error: any) {
    logger.error('[MP Point] Error DELETE:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
