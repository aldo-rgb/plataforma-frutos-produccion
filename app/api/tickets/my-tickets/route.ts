import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    // Buscar usuario
    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Obtener todos los tickets del usuario
    const tickets = await prisma.ticket.findMany({
      where: {
        ownerId: user.id,
      },
      include: {
        vision: {
          select: {
            nombre: true,
            startDate: true,
            endDate: true,
          },
        },
        organization: {
          select: {
            name: true,
            logoUrl: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return NextResponse.json({
      success: true,
      tickets: tickets.map(ticket => ({
        id: ticket.id,
        type: ticket.type,
        level: ticket.level,
        status: ticket.status,
        paymentStatus: ticket.paymentStatus,
        isTransferable: ticket.isTransferable,
        validUntil: ticket.validUntil?.toISOString() || null,
        purchasePrice: ticket.purchasePrice ? parseFloat(ticket.purchasePrice.toString()) : null,
        createdAt: ticket.createdAt.toISOString(),
        vision: {
          nombre: ticket.vision.nombre,
          startDate: ticket.vision.startDate?.toISOString() || '',
          endDate: ticket.vision.endDate?.toISOString() || null,
        },
        organization: {
          name: ticket.organization.name,
          logoUrl: ticket.organization.logoUrl,
        },
      })),
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return NextResponse.json(
      { success: false, error: 'Error al obtener tickets' },
      { status: 500 }
    );
  }
}
