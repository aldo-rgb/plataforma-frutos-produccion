import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import logger from '@/lib/logger';

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
      select: { 
        id: true, 
        rol: true, 
        organizationId: true, 
        nombre: true
      },
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

    // Obtener organización para branding
    const organization = await prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: {
        name: true,
        logoUrl: true,
        brandColor: true
      }
    });

    const body = await request.json();
    const { amount, reference, visionId } = body;

    logger.debug('Creating PaymentCode with:', { amount, reference, visionId, organizationId: user.organizationId, createdById: user.id });

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { success: false, error: 'Monto inválido' },
        { status: 400 }
      );
    }

    // Generar código único: CASH-XXXXXX-MONTO (más caracteres para evitar colisiones)
    const generateUniqueCode = async (): Promise<string> => {
      for (let attempt = 0; attempt < 5; attempt++) {
        const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 6);
        const code = `CASH-${randomPart}-${amount}`;
        
        // Verificar que no exista
        const existing = await prisma.paymentCode.findUnique({
          where: { code },
          select: { id: true }
        });
        
        if (!existing) {
          return code;
        }
      }
      // Si después de 5 intentos no se puede, usar timestamp
      const timestamp = Date.now().toString(36).toUpperCase();
      return `CASH-${timestamp}-${amount}`;
    };

    const code = await generateUniqueCode();

    // Validar visionId si se proporciona
    let parsedVisionId: number | null = null;
    if (visionId) {
      parsedVisionId = parseInt(visionId);
      if (isNaN(parsedVisionId)) {
        return NextResponse.json(
          { success: false, error: 'ID de visión inválido' },
          { status: 400 }
        );
      }
      
      // Verificar que la visión existe y pertenece a la organización
      const vision = await prisma.vision.findFirst({
        where: { 
          id: parsedVisionId,
          organizationId: user.organizationId
        }
      });
      
      if (!vision) {
        return NextResponse.json(
          { success: false, error: 'Visión no encontrada o no pertenece a tu organización' },
          { status: 400 }
        );
      }
    }

    // Crear el código de pago
    const paymentCodeId = crypto.randomUUID(); // Generar ID único
    const paymentCode = await prisma.paymentCode.create({
      data: {
        id: paymentCodeId,
        code,
        amount,
        reference: reference || null,
        status: 'ACTIVE',
        organizationId: user.organizationId,
        visionId: parsedVisionId,
        createdById: user.id,
      },
    });

    return NextResponse.json({
      success: true,
      message: `Código generado: ${code}`,
      paymentCode: {
        id: paymentCode.id,
        code: paymentCode.code,
        amount: Number(paymentCode.amount),
        reference: paymentCode.reference,
        status: paymentCode.status,
        createdAt: paymentCode.createdAt.toISOString(),
      },
      organization: {
        nombre: organization?.name || 'Organización',
        logoUrl: organization?.logoUrl || null,
        brandColor: organization?.brandColor || '#10B981',
      },
    });
  } catch (error: any) {
    logger.error('Error generating payment code:', error);
    
    // Si es un error de Prisma de código duplicado
    if (error?.code === 'P2002') {
      return NextResponse.json(
        { success: false, error: 'Error: código duplicado, intenta de nuevo' },
        { status: 409 }
      );
    }
    
    return NextResponse.json(
      { success: false, error: error?.message || 'Error al generar código' },
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
    logger.error('Error fetching payment codes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener códigos' },
      { status: 500 }
    );
  }
}
