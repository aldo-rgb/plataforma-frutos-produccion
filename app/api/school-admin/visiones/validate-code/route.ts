import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';

/**
 * POST /api/school-admin/visiones/validate-code
 * 
 * Valida un código de paquete de llamadas para aplicar en el checkout de mentorías
 */
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email! },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN') {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 });
    }

    const body = await req.json();
    const { code, orderId } = body;

    if (!code) {
      return NextResponse.json({ 
        success: false, 
        error: 'Código requerido' 
      }, { status: 400 });
    }

    // Buscar el código
    const codigoAcceso = await prisma.codigoAcceso.findUnique({
      where: { codigo: code.toUpperCase().trim() },
    });

    if (!codigoAcceso) {
      return NextResponse.json({ 
        success: false, 
        error: 'Código no encontrado' 
      });
    }

    // Verificar que sea de tipo PAQUETE_LLAMADAS
    if (codigoAcceso.tipo !== 'PAQUETE_LLAMADAS') {
      return NextResponse.json({ 
        success: false, 
        error: 'Este código no es válido para pago de mentorías' 
      });
    }

    // Verificar que esté disponible
    if (codigoAcceso.estado !== 'DISPONIBLE') {
      return NextResponse.json({ 
        success: false, 
        error: codigoAcceso.estado === 'CANJEADO' 
          ? 'Este código ya fue utilizado' 
          : 'Este código ya no está disponible' 
      });
    }

    // Obtener la orden para calcular el descuento
    if (!orderId) {
      return NextResponse.json({ 
        success: false, 
        error: 'ID de orden requerido' 
      }, { status: 400 });
    }

    const order = await prisma.licenseOrder.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      return NextResponse.json({ 
        success: false, 
        error: 'Orden no encontrada' 
      }, { status: 404 });
    }

    // Parsear paymentData para obtener info de la orden
    let paymentData: any = {};
    try {
      if (order.paymentData) {
        paymentData = typeof order.paymentData === 'string' 
          ? JSON.parse(order.paymentData) 
          : order.paymentData;
      }
    } catch (e) {
      logger.error('Error parseando paymentData:', e);
    }

    // Calcular descuento basado en llamadas del código
    const callsInCode = codigoAcceso.cantidadLlamadas || 0;
    const totalStudents = paymentData.totalStudents || order.quantity || 0;
    const callsPerStudent = 18; // 18 llamadas por estudiante (paquete estándar)
    const totalCallsNeeded = totalStudents * callsPerStudent;
    
    // Calcular el precio por llamada basado en el total
    const pricePerCall = order.amount / totalCallsNeeded;
    
    // Calcular cuántas llamadas aplican (máximo las que necesita)
    const callsToApply = Math.min(callsInCode, totalCallsNeeded);
    const discount = Math.round(callsToApply * pricePerCall);
    const newTotal = Math.max(0, order.amount - discount);
    
    // Si el código cubre todo, el pago es $0
    const fullyCovered = callsToApply >= totalCallsNeeded;

    logger.debug('🎫 Código validado:', {
      code,
      callsInCode,
      totalStudents,
      totalCallsNeeded,
      callsToApply,
      pricePerCall,
      discount,
      newTotal,
      fullyCovered,
    });

    return NextResponse.json({
      success: true,
      code: codigoAcceso.codigo,
      codeId: codigoAcceso.id,
      callsInCode,
      callsToApply,
      discount,
      originalAmount: order.amount,
      newTotal,
      fullyCovered,
      message: fullyCovered 
        ? `¡El código cubre el total! ${callsToApply} llamadas aplicadas.`
        : `Código válido: ${callsToApply} llamadas = $${discount.toLocaleString()} MXN de descuento`,
    });

  } catch (error: any) {
    logger.error('❌ Error validando código:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar código', details: error.message },
      { status: 500 }
    );
  }
}
