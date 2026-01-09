import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json(
        { success: false, error: 'No autorizado' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ticketId, recipientEmail } = body;

    if (!ticketId || !recipientEmail) {
      return NextResponse.json(
        { success: false, error: 'Datos incompletos' },
        { status: 400 }
      );
    }

    // Buscar usuario actual
    const currentUser = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Buscar ticket
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vision: {
          select: {
            startDate: true,
          },
        },
      },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, error: 'Ticket no encontrado' },
        { status: 404 }
      );
    }

    // Validar que el ticket pertenece al usuario
    if (ticket.ownerId !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para transferir este ticket' },
        { status: 403 }
      );
    }

    // Validar estado del ticket
    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Solo puedes transferir tickets activos' },
        { status: 400 }
      );
    }

    // Validar que sea transferible
    if (!ticket.isTransferable) {
      return NextResponse.json(
        { success: false, error: 'Este ticket ya fue transferido una vez y no puede transferirse de nuevo' },
        { status: 400 }
      );
    }

    // Validar tiempo límite (1 hora después del inicio)
    const now = new Date();
    const visionStartDate = new Date(ticket.vision.startDate);
    const transferDeadline = new Date(visionStartDate.getTime() + (60 * 60 * 1000)); // +1 hora

    if (now > transferDeadline) {
      return NextResponse.json(
        { success: false, error: 'El tiempo para transferir este ticket ha expirado (1 hora después del inicio del evento)' },
        { status: 400 }
      );
    }

    // Validar que no se transfiera a sí mismo
    if (recipientEmail.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'No puedes transferir un ticket a ti mismo' },
        { status: 400 }
      );
    }

    // Buscar o crear usuario receptor
    let recipient = await prisma.usuario.findUnique({
      where: { email: recipientEmail.toLowerCase() },
      select: {
        id: true,
        nombre: true,
        email: true,
      },
    });

    let recipientName = '';
    if (recipient) {
      recipientName = recipient.nombre;
    } else {
      // Usuario no existe, devolver info para crear shadow user
      recipientName = recipientEmail.split('@')[0];
    }

    return NextResponse.json({
      success: true,
      recipient: {
        name: recipientName,
        email: recipientEmail,
        exists: !!recipient,
      },
      transferDeadline: transferDeadline.toISOString(),
    });
  } catch (error) {
    console.error('Error validating transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al validar transferencia' },
      { status: 500 }
    );
  }
}
