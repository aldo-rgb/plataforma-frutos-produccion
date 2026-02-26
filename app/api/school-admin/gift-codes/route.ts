import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import logger from '@/lib/logger';

// GET - Obtener todos los códigos de regalo de la organización
export async function GET() {
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
        organizationId: true 
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN' || !user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para ver códigos de regalo' },
        { status: 403 }
      );
    }

    const giftCodes = await prisma.giftCode.findMany({
      where: {
        organizationId: user.organizationId,
      },
      include: {
        vision: {
          select: {
            id: true,
            nombre: true,
          },
        },
        creator: {
          select: {
            id: true,
            nombre: true,
          },
        },
        user: {
          select: {
            id: true,
            nombre: true,
            email: true,
          },
        },
        tickets: {
          select: {
            id: true,
            level: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({
      success: true,
      giftCodes: giftCodes.map(gc => ({
        id: gc.id,
        code: gc.code,
        type: gc.type,
        status: gc.status,
        value: gc.value ? parseFloat(gc.value.toString()) : null,
        discountPercentage: gc.discountPercentage,
        vision: gc.vision,
        creator: gc.creator,
        usedBy: gc.user,
        usedAt: gc.usedAt?.toISOString() || null,
        expiresAt: gc.expiresAt?.toISOString() || null,
        notes: gc.notes,
        ticketsGenerated: gc.tickets.length,
        createdAt: gc.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    logger.error('Error fetching gift codes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener códigos de regalo' },
      { status: 500 }
    );
  }
}

// POST - Crear nuevo código de regalo
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
        organizationId: true 
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN' || !user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para crear códigos de regalo' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { type, visionId, quantity = 1, expiresAt, notes, discountPercentage } = body;

    // Validar tipo de código
    const validTypes = ['GOLDEN', 'GOLDEN_DISCOUNT', 'PLATINUM'];
    if (!type || !validTypes.includes(type)) {
      return NextResponse.json(
        { success: false, error: 'Tipo de código inválido' },
        { status: 400 }
      );
    }

    // Validar porcentaje de descuento si es GOLDEN_DISCOUNT
    if (type === 'GOLDEN_DISCOUNT') {
      if (!discountPercentage || discountPercentage < 5 || discountPercentage > 95) {
        return NextResponse.json(
          { success: false, error: 'El porcentaje de descuento debe estar entre 5% y 95%' },
          { status: 400 }
        );
      }
    }

    // Generar códigos
    const codes: string[] = [];
    let prefix = type === 'GOLDEN' ? 'GOLDEN' : type === 'PLATINUM' ? 'PLATINUM' : `GOLDEN${discountPercentage}`;

    for (let i = 0; i < quantity; i++) {
      const randomPart = crypto.randomBytes(4).toString('hex').toUpperCase();
      codes.push(`${prefix}-${randomPart}`);
    }

    // Obtener valor del código basado en precios configurados
    let codeValue = null;
    const defaultPrices = await prisma.defaultPrice.findMany({
      where: { organizationId: user.organizationId },
    });

    if (type === 'GOLDEN') {
      // GOLDEN = Solo Básico ($6,500)
      const basicPrice = defaultPrices.find(p => p.levelType === 'BASIC');
      codeValue = Number(basicPrice?.basePrice) || 6500;
    } else if (type === 'GOLDEN_DISCOUNT') {
      // Valor = descuento aplicado (porcentaje del precio básico)
      const basicPrice = defaultPrices.find(p => p.levelType === 'BASIC');
      const baseValue = Number(basicPrice?.basePrice) || 6500;
      // El valor almacenado es el DESCUENTO (lo que se ahorra el usuario)
      codeValue = Math.round(baseValue * (discountPercentage / 100));
    } else {
      // PLATINUM = COMBO_FULL (Básico + Avanzado + PL)
      const comboPrice = defaultPrices.find(p => p.levelType === 'COMBO_FULL');
      codeValue = Number(comboPrice?.basePrice) || 27000;
    }

    // Crear códigos en batch
    const createdCodes = await prisma.giftCode.createMany({
      data: codes.map(code => ({
        code,
        type: type as 'GOLDEN' | 'GOLDEN_DISCOUNT' | 'PLATINUM',
        organizationId: user.organizationId!,
        visionId: visionId || null,
        status: 'ACTIVE',
        value: codeValue,
        discountPercentage: type === 'GOLDEN_DISCOUNT' ? discountPercentage : null,
        createdBy: user.id,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        notes: notes || null,
        updatedAt: new Date(),
      })),
    });

    // Obtener los códigos creados
    const newCodes = await prisma.giftCode.findMany({
      where: {
        code: { in: codes },
      },
      select: {
        id: true,
        code: true,
        type: true,
        value: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${quantity} código(s) ${type} creado(s) exitosamente`,
      codes: newCodes.map(c => ({
        id: c.id,
        code: c.code,
        type: c.type,
        value: c.value ? parseFloat(c.value.toString()) : null,
      })),
    });
  } catch (error) {
    logger.error('Error creating gift codes:', error);
    return NextResponse.json(
      { success: false, error: 'Error al crear códigos de regalo' },
      { status: 500 }
    );
  }
}

// DELETE - Cancelar código de regalo
export async function DELETE(request: Request) {
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
        organizationId: true 
      },
    });

    if (!user || user.rol !== 'SCHOOL_ADMIN' || !user.organizationId) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const codeId = searchParams.get('id');

    if (!codeId) {
      return NextResponse.json(
        { success: false, error: 'ID de código requerido' },
        { status: 400 }
      );
    }

    const giftCode = await prisma.giftCode.findFirst({
      where: {
        id: parseInt(codeId),
        organizationId: user.organizationId,
      },
    });

    if (!giftCode) {
      return NextResponse.json(
        { success: false, error: 'Código no encontrado' },
        { status: 404 }
      );
    }

    if (giftCode.status === 'USED') {
      return NextResponse.json(
        { success: false, error: 'No se puede cancelar un código ya usado' },
        { status: 400 }
      );
    }

    await prisma.giftCode.update({
      where: { id: giftCode.id },
      data: { status: 'CANCELLED' },
    });

    return NextResponse.json({
      success: true,
      message: 'Código cancelado exitosamente',
    });
  } catch (error) {
    logger.error('Error cancelling gift code:', error);
    return NextResponse.json(
      { success: false, error: 'Error al cancelar código' },
      { status: 500 }
    );
  }
}
