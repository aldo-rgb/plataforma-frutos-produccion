import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

const ALLOWED_ROLES = ['SCHOOL_ADMIN', 'COORDINADOR', 'COORDINATOR_BASIC', 'COORDINATOR_ADVANCED'];

/**
 * POST /api/treasury/payment-codes
 * Genera un código de pago en efectivo
 * "Todo Código Generado es una Deuda del Coordinador hacia la Escuela"
 */
export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true, nombre: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para generar códigos' },
        { status: 403 }
      );
    }

    if (!user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'Usuario sin organización asignada' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { amount, reference, visionId } = body;

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Monto inválido' },
        { status: 400 }
      );
    }

    // Generar código único: Q-XXXX-MONTO
    const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 4);
    const code = `CASH-${randomPart}-${amount}`;

    // Crear el código de pago
    const paymentCode = await prisma.paymentCode.create({
      data: {
        code,
        amount,
        reference: reference || null,
        status: 'ACTIVE',
        organizationId: user.organizationId,
        visionId: visionId ? parseInt(visionId) : null,
        createdById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Código generado: ${code}`,
      paymentCode: {
        id: paymentCode.id,
        code: paymentCode.code,
        amount: paymentCode.amount,
        reference: paymentCode.reference,
        status: paymentCode.status,
        createdAt: paymentCode.createdAt,
      },
    });
  } catch (error) {
    console.error('Error generating payment code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar código' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/treasury/payment-codes
 * Lista los códigos de pago del coordinador
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true, organizationId: true },
    });

    if (!user || !ALLOWED_ROLES.includes(user.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status'); // ACTIVE, REDEEMED, ALL
    const coordinatorId = searchParams.get('coordinatorId');
    const visionId = searchParams.get('visionId');

    // Construir filtros
    const where: any = {
      organizationId: user.organizationId,
    };

    // Si no es admin, solo ver sus propios códigos
    if (user.rol !== 'SCHOOL_ADMIN') {
      where.createdById = user.id;
    } else if (coordinatorId) {
      where.createdById = parseInt(coordinatorId);
    }

    if (status && status !== 'ALL') {
      where.status = status;
    }

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    const paymentCodes = await prisma.paymentCode.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, nombre: true },
        },
        redeemedBy: {
          select: { id: true, nombre: true, email: true },
        },
        vision: {
          select: { id: true, nombre: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Calcular totales
    const totalGenerated = paymentCodes.reduce(
      (sum, code) => sum + Number(code.amount),
      0
    );
    const totalRedeemed = paymentCodes
      .filter((code) => code.status === 'REDEEMED')
      .reduce((sum, code) => sum + Number(code.amount), 0);
    const totalPending = paymentCodes
      .filter((code) => code.status === 'ACTIVE')
      .reduce((sum, code) => sum + Number(code.amount), 0);

    return NextResponse.json({
      success: true,
      paymentCodes: paymentCodes.map((code) => ({
        id: code.id,
        code: code.code,
        amount: Number(code.amount),
        reference: code.reference,
        status: code.status,
        createdAt: code.createdAt,
        redeemedAt: code.redeemedAt,
        createdBy: code.createdBy,
        redeemedBy: code.redeemedBy,
        vision: code.vision,
        batchId: code.batchId,
      })),
      summary: {
        totalGenerated,
        totalRedeemed,
        totalPending,
        count: paymentCodes.length,
      },
    });
  } catch (error) {
    console.error('Error fetching payment codes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener códigos' },
      { status: 500 }
    );
  }
}
