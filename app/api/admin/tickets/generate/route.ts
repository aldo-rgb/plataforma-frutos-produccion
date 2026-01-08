import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

/**
 * POST /api/admin/tickets/generate
 * Genera tickets para usuarios (solo DIRECTOR, STAFF, COORDINADOR)
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

    // Buscar usuario admin
    const admin = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        id: true, 
        rol: true,
        organizationId: true 
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Validar permisos (solo DIRECTOR, STAFF, COORDINADOR)
    const allowedRoles = ['DIRECTOR', 'STAFF', 'COORDINADOR'];
    if (!allowedRoles.includes(admin.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos para generar tickets' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { 
      userEmail,
      visionId,
      level,
      type = 'STANDARD',
      purchasePrice,
      paymentStatus = 'PAID',
      validUntil
    } = body;

    // Validaciones
    if (!userEmail || !visionId || !level) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos: userEmail, visionId y level son requeridos' },
        { status: 400 }
      );
    }

    // Buscar usuario destinatario
    const user = await prisma.usuario.findUnique({
      where: { email: userEmail },
      select: { 
        id: true, 
        organizationId: true 
      },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: `Usuario con email ${userEmail} no encontrado` },
        { status: 404 }
      );
    }

    // Buscar visión
    const vision = await prisma.vision.findUnique({
      where: { id: parseInt(visionId) },
      select: { 
        id: true, 
        nombre: true,
        startDate: true,
        organizationId: true 
      },
    });

    if (!vision) {
      return NextResponse.json(
        { success: false, error: 'Visión no encontrada' },
        { status: 404 }
      );
    }

    // Validar que la visión pertenece a la organización del admin
    if (admin.organizationId && vision.organizationId !== admin.organizationId) {
      return NextResponse.json(
        { success: false, error: 'La visión no pertenece a tu organización' },
        { status: 403 }
      );
    }

    // Calcular validUntil si no se proporciona
    const ticketValidUntil = validUntil 
      ? new Date(validUntil)
      : new Date(vision.startDate.getTime() + 24 * 60 * 60 * 1000); // +1 día después del inicio

    // Crear ticket
    const ticket = await prisma.ticket.create({
      data: {
        ownerId: user.id,
        organizationId: vision.organizationId,
        visionId: vision.id,
        level: level,
        type: type,
        status: paymentStatus === 'PAID' ? 'ACTIVE' : 'PENDING_PAYMENT',
        isTransferable: true,
        validUntil: ticketValidUntil,
        paymentStatus: paymentStatus,
        purchasePrice: purchasePrice || 0,
      },
      include: {
        owner: {
          select: {
            nombre: true,
            email: true,
          },
        },
        vision: {
          select: {
            nombre: true,
            startDate: true,
          },
        },
      },
    });

    return NextResponse.json({
      success: true,
      message: 'Ticket generado exitosamente',
      ticket: {
        id: ticket.id,
        level: ticket.level,
        type: ticket.type,
        status: ticket.status,
        owner: {
          name: ticket.owner.nombre,
          email: ticket.owner.email,
        },
        vision: {
          name: ticket.vision.nombre,
          startDate: ticket.vision.startDate,
        },
        validUntil: ticket.validUntil,
        paymentStatus: ticket.paymentStatus,
      },
    });
  } catch (error) {
    console.error('Error generating ticket:', error);
    return NextResponse.json(
      { success: false, error: 'Error al generar ticket' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/admin/tickets/generate
 * Obtiene configuración de precios disponibles
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

    const admin = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { 
        rol: true,
        organizationId: true 
      },
    });

    if (!admin) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    const allowedRoles = ['DIRECTOR', 'STAFF', 'COORDINADOR'];
    if (!allowedRoles.includes(admin.rol)) {
      return NextResponse.json(
        { success: false, error: 'No tienes permisos' },
        { status: 403 }
      );
    }

    // Obtener configuración de precios de la organización
    const priceConfigs = await prisma.ticketPriceConfig.findMany({
      where: {
        organizationId: admin.organizationId || undefined,
      },
    });

    return NextResponse.json({
      success: true,
      priceConfigs: priceConfigs.map(config => ({
        level: config.level,
        regularPrice: config.regularPrice.toString(),
        promoPrice: config.promoPrice?.toString(),
        comboAdvPL: config.comboAdvPL?.toString(),
        partialPayment: config.partialPayment?.toString(),
      })),
    });
  } catch (error) {
    console.error('Error fetching price configs:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener configuración' },
      { status: 500 }
    );
  }
}
