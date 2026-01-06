import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || (user.rol !== 'SCHOOL_ADMIN' && user.rol !== 'SUPER_ADMIN')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      enabledLevels,
      visionName,
      description,
      startDate,
      endDate,
      maxParticipants,
      tickets,
      coordinators,
      platformFeePercent
    } = body;

    // Validaciones
    if (!visionName || !enabledLevels || enabledLevels.length === 0) {
      return NextResponse.json(
        { error: 'Nombre de visión y niveles son requeridos' },
        { status: 400 }
      );
    }

    // Crear visión con niveles habilitados
    const vision = await prisma.vision.create({
      data: {
        nombre: visionName,
        descripcion: description,
        coordinadorId: user.id,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        maxParticipantes: maxParticipants,
        enabledLevels: enabledLevels,
        platformFeePercent: platformFeePercent || 0,
        isActive: true,
      },
    });

    // Crear tickets si se proporcionaron
    if (tickets && tickets.length > 0) {
      await prisma.visionTicket.createMany({
        data: tickets.map((ticket: any) => ({
          visionId: vision.id,
          level: ticket.level,
          nombre: ticket.nombre,
          nombreEn: ticket.nombreEn,
          descripcion: ticket.descripcion,
          descripcionEn: ticket.descripcionEn,
          precio: ticket.precio,
          precioUSD: ticket.precioUSD,
          cupo: ticket.cupo,
          isActive: true,
          requiresPayment: ticket.requiresPayment !== false,
        })),
      });
    }

    // TODO: Asignar coordinadores específicos por nivel

    return NextResponse.json({
      success: true,
      vision,
      message: 'Visión multi-nivel creada exitosamente',
    });
  } catch (error) {
    console.error('Error creando visión multi-nivel:', error);
    return NextResponse.json(
      { error: 'Error al crear visión' },
      { status: 500 }
    );
  }
}
