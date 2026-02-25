import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import logger from '@/lib/logger';
import bcrypt from 'bcryptjs';
import { 
  sendPaymentApprovedMessage, 
  sendPaymentRejectedMessage,
  generateTemporaryPassword 
} from '@/lib/whatsapp';

export const dynamic = 'force-dynamic';

interface TransferOrder {
  id: string;
  orderReference: string;
  organizationId: number;
  visionId: number | null;
  amount: number;
  ticketSelection: string;
  status: string;
  userEmail: string;
  userName: string;
  userPhone: string | null;
  userApodo: string | null;
  userData: string | null;
  appliedCodes: string | null;
  receiptImageUrl: string | null;
  receiptMediaId: string | null;
  receiptReceivedAt: Date | null;
  whatsappPhone: string | null;
  rejectionReason: string | null;
  rejectionCount: number;
  confirmedAt: Date | null;
  confirmedBy: number | null;
  transactionRef: string | null;
  createdAt: Date;
  expiresAt: Date;
  Organization: {
    id: number;
    name: string;
    logo?: string | null;
  };
  Vision?: {
    id: number;
    name: string;
  } | null;
}

/**
 * GET /api/admin/transfer-orders
 * 
 * Obtiene las órdenes de transferencia pendientes de revisión
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que es admin
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        Organization: true,
      }
    });

    if (!user || !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    const searchParams = request.nextUrl.searchParams;
    const status = searchParams.get('status') || 'RECEIPT_RECEIVED';
    const organizationId = user.role === 'SUPER_ADMIN' 
      ? searchParams.get('organizationId') 
        ? parseInt(searchParams.get('organizationId')!)
        : undefined
      : user.organizationId;

    // Obtener órdenes
    const orders = await prisma.pendingTransferOrder.findMany({
      where: {
        status: status === 'all' ? undefined : status,
        ...(organizationId && { organizationId }),
      },
      include: {
        Organization: {
          select: { name: true, logo: true }
        },
        Vision: {
          select: { name: true }
        }
      },
      orderBy: [
        { receiptReceivedAt: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 100,
    });

    // Formatear datos
    const formattedOrders = orders.map(order => ({
      id: order.id,
      orderReference: order.orderReference,
      status: order.status,
      amount: order.amount,
      ticketSelection: order.ticketSelection,
      userName: order.userName,
      userEmail: order.userEmail,
      userPhone: order.userPhone,
      receiptImageUrl: order.receiptImageUrl,
      receiptReceivedAt: order.receiptReceivedAt,
      rejectionReason: order.rejectionReason,
      rejectionCount: order.rejectionCount,
      createdAt: order.createdAt,
      expiresAt: order.expiresAt,
      organization: order.Organization.name,
      vision: order.Vision?.name || null,
    }));

    // Stats rápidas
    const stats = await prisma.pendingTransferOrder.groupBy({
      by: ['status'],
      where: organizationId ? { organizationId } : undefined,
      _count: { status: true }
    });

    return NextResponse.json({
      success: true,
      orders: formattedOrders,
      stats: stats.reduce((acc, s) => {
        acc[s.status] = s._count.status;
        return acc;
      }, {} as Record<string, number>),
    });

  } catch (error: any) {
    logger.error('❌ [transfer-orders] Error:', error);
    return NextResponse.json(
      { error: 'Error al obtener órdenes', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/transfer-orders
 * 
 * Aprobar o rechazar una orden de transferencia
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    // Verificar que es admin
    const adminUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { Organization: true }
    });

    if (!adminUser || !['SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(adminUser.role)) {
      return NextResponse.json({ error: 'No tienes permisos para esta acción' }, { status: 403 });
    }

    const body = await request.json();
    const { orderId, action, rejectionReason, transactionRef } = body;

    if (!orderId || !action) {
      return NextResponse.json({ error: 'orderId y action son requeridos' }, { status: 400 });
    }

    // Obtener la orden
    const order = await prisma.pendingTransferOrder.findUnique({
      where: { id: orderId },
      include: {
        Organization: true,
        Vision: true,
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Orden no encontrada' }, { status: 404 });
    }

    // Verificar permisos sobre la organización
    if (adminUser.role !== 'SUPER_ADMIN' && order.organizationId !== adminUser.organizationId) {
      return NextResponse.json({ error: 'No tienes permisos sobre esta orden' }, { status: 403 });
    }

    // ===== APROBAR =====
    if (action === 'approve') {
      return await approveOrder(order, adminUser, transactionRef);
    }
    
    // ===== RECHAZAR =====
    else if (action === 'reject') {
      if (!rejectionReason) {
        return NextResponse.json({ error: 'Se requiere motivo de rechazo' }, { status: 400 });
      }
      return await rejectOrder(order, adminUser, rejectionReason);
    }

    return NextResponse.json({ error: 'Acción no válida' }, { status: 400 });

  } catch (error: any) {
    logger.error('❌ [transfer-orders] Error:', error);
    return NextResponse.json(
      { error: 'Error al procesar orden', details: error.message },
      { status: 500 }
    );
  }
}

/**
 * Aprueba una orden y crea el usuario
 */
async function approveOrder(order: any, adminUser: any, transactionRef?: string) {
  // Parse userData
  const userData = order.userData ? JSON.parse(order.userData) : {};
  const appliedCodes = order.appliedCodes ? JSON.parse(order.appliedCodes) : [];

  // Generar contraseña temporal
  const tempPassword = generateTemporaryPassword();
  const hashedPassword = await bcrypt.hash(tempPassword, 10);

  // Crear usuario en transacción
  const result = await prisma.$transaction(async (tx) => {
    // Verificar si el email ya existe
    const existingUser = await tx.user.findUnique({
      where: { email: order.userEmail }
    });

    if (existingUser) {
      throw new Error('El email ya está registrado');
    }

    // Crear el usuario
    const newUser = await tx.user.create({
      data: {
        email: order.userEmail,
        name: order.userName,
        apodo: order.userApodo || userData.apodo,
        phone: order.userPhone,
        password: hashedPassword,
        organizationId: order.organizationId,
        visionId: order.visionId,
        role: 'STUDENT',
        status: 'ACTIVE',
        hasBoleto: true,
        hasFullVision: order.ticketSelection === 'FULL_VISION',
        paymentMethod: 'TRANSFER',
        paymentDate: new Date(),
        licenseCode: order.orderReference,
        stripeCustomerId: null,
        stripePaymentIntentId: null,
      }
    });

    // Crear el boleto
    await tx.ticket.create({
      data: {
        ownerId: newUser.id,
        organizationId: order.organizationId,
        visionId: order.visionId || null,
        level: 'BASIC', // Por defecto BASIC, el ticketSelection determina hasFullVision en el user
        type: 'STANDARD',
        status: 'ACTIVE',
        paymentStatus: 'PAID',
        costAtPurchase: order.amount,
        amountPaid: order.amount,
        isTransferable: false,
      }
    });

    // TODO: Procesar códigos promocionales de referidos si hay
    // Por ahora solo logueamos
    if (appliedCodes.length > 0) {
      logger.info('📋 [transfer-orders] Códigos aplicados:', appliedCodes);
    }

    // Actualizar la orden como confirmada
    await tx.pendingTransferOrder.update({
      where: { id: order.id },
      data: {
        status: 'CONFIRMED',
        confirmedAt: new Date(),
        confirmedBy: adminUser.id,
        transactionRef: transactionRef || null,
        createdUserId: newUser.id,
      }
    });

    return newUser;
  });

  logger.info('✅ [transfer-orders] Orden aprobada:', {
    orderReference: order.orderReference,
    userId: result.id,
    approvedBy: adminUser.email,
  });

  // Enviar WhatsApp de confirmación
  if (order.userPhone || order.whatsappPhone) {
    const phone = order.userPhone || order.whatsappPhone;
    try {
      await sendPaymentApprovedMessage(
        phone,
        order.userName,
        order.orderReference,
        order.userEmail,
        tempPassword
      );
      logger.info('🤖 [Pay-Bot] Mensaje de aprobación enviado');
    } catch (whatsappError) {
      logger.error('❌ [Pay-Bot] Error enviando aprobación:', whatsappError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Orden aprobada y usuario creado',
    userId: result.id,
    email: order.userEmail,
    tempPassword, // Para mostrarlo en el admin si es necesario
  });
}

/**
 * Rechaza una orden y notifica al usuario
 */
async function rejectOrder(order: any, adminUser: any, rejectionReason: string) {
  // Actualizar orden como rechazada
  await prisma.pendingTransferOrder.update({
    where: { id: order.id },
    data: {
      status: 'REJECTED',
      rejectionReason,
      rejectionCount: { increment: 1 },
      receiptImageUrl: null, // Limpiar para que pueda subir otro
      receiptMediaId: null,
      receiptReceivedAt: null,
    }
  });

  logger.info('❌ [transfer-orders] Orden rechazada:', {
    orderReference: order.orderReference,
    reason: rejectionReason,
    rejectedBy: adminUser.email,
  });

  // Enviar WhatsApp de rechazo
  if (order.userPhone || order.whatsappPhone) {
    const phone = order.userPhone || order.whatsappPhone;
    try {
      await sendPaymentRejectedMessage(
        phone,
        order.userName,
        order.orderReference,
        rejectionReason
      );
      logger.info('🤖 [Pay-Bot] Mensaje de rechazo enviado');
    } catch (whatsappError) {
      logger.error('❌ [Pay-Bot] Error enviando rechazo:', whatsappError);
    }
  }

  return NextResponse.json({
    success: true,
    message: 'Orden rechazada. El usuario puede enviar otro comprobante.',
    rejectionCount: order.rejectionCount + 1,
  });
}
