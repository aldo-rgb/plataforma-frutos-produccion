import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

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
      select: { id: true, nombre: true },
    });

    if (!currentUser) {
      return NextResponse.json(
        { success: false, error: 'Usuario no encontrado' },
        { status: 404 }
      );
    }

    // Buscar ticket con todas las relaciones necesarias
    const ticket = await prisma.ticket.findUnique({
      where: { id: ticketId },
      include: {
        vision: {
          select: {
            id: true,
            startDate: true,
            name: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
            transfersEnabled: true,
            transferDeadlineDays: true,
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

    // Validar que la organización permita transferencias
    if (!ticket.organization?.transfersEnabled) {
      return NextResponse.json(
        { success: false, error: 'Esta organización no permite transferencias de tickets' },
        { status: 400 }
      );
    }

    // RE-VALIDAR todas las condiciones (seguridad)
    if (ticket.ownerId !== currentUser.id) {
      return NextResponse.json(
        { success: false, error: 'No tienes permiso para transferir este ticket' },
        { status: 403 }
      );
    }

    // Solo tickets BASIC pueden iniciar una transferencia
    if (ticket.level !== 'BASIC') {
      return NextResponse.json(
        { success: false, error: 'Solo puedes transferir desde el ticket Básico' },
        { status: 400 }
      );
    }

    if (ticket.status !== 'ACTIVE') {
      return NextResponse.json(
        { success: false, error: 'Solo puedes transferir tickets activos' },
        { status: 400 }
      );
    }

    if (!ticket.isTransferable) {
      return NextResponse.json(
        { success: false, error: 'Este ticket ya no es transferible' },
        { status: 400 }
      );
    }

    const now = new Date();
    const visionStartDate = new Date(ticket.vision.startDate);
    const deadlineDays = ticket.organization.transferDeadlineDays || 0;
    const transferDeadline = new Date(visionStartDate.getTime() - (deadlineDays * 24 * 60 * 60 * 1000));

    if (now > transferDeadline) {
      return NextResponse.json(
        { success: false, error: 'El tiempo para transferir ha expirado' },
        { status: 400 }
      );
    }

    if (recipientEmail.toLowerCase() === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { success: false, error: 'No puedes transferir un ticket a ti mismo' },
        { status: 400 }
      );
    }

    // Buscar o crear usuario receptor
    let recipient = await prisma.usuario.findUnique({
      where: { email: recipientEmail.toLowerCase() },
    });

    if (!recipient) {
      // Crear shadow user (usuario invitado que aún no se ha registrado)
      const tempPassword = crypto.randomBytes(32).toString('hex');
      const recipientName = recipientEmail.split('@')[0];

      recipient = await prisma.usuario.create({
        data: {
          email: recipientEmail.toLowerCase(),
          nombre: recipientName,
          password: tempPassword, // Deberán establecer su propia contraseña al registrarse
          tipo: 'PARTICIPANTE',
          status: 'PENDIENTE', // Estado especial para shadow users
          organizationId: ticket.organizationId, // Misma organización que el ticket
        },
      });
    }

    // Buscar TODOS los tickets activos del usuario para la misma visión
    const allUserTickets = await prisma.ticket.findMany({
      where: {
        ownerId: currentUser.id,
        visionId: ticket.visionId,
        status: 'ACTIVE',
      },
      select: { id: true, level: true },
    });

    // Transferir TODOS los tickets del usuario para esta visión
    const transferredTickets = await prisma.$transaction(
      allUserTickets.map((t) =>
        prisma.ticket.update({
          where: { id: t.id },
          data: {
            ownerId: recipient!.id,
            status: 'TRANSFERRED',
            isTransferable: false,
            transferredAt: now,
            transferredTo: recipient!.id,
          },
        })
      )
    );

    // Obtener info del ticket principal actualizado para la respuesta
    const updatedTicket = await prisma.ticket.findUnique({
      where: { id: ticketId },
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

    // Crear lista de niveles transferidos
    const transferredLevels = allUserTickets.map(t => t.level);

    // TODO: Aquí deberías enviar un email al receptor notificándole que recibió tickets
    // Ejemplo:
    // await sendTicketTransferNotification({
    //   recipientEmail: recipient.email,
    //   recipientName: recipient.nombre,
    //   senderName: currentUser.nombre,
    //   ticketLevels: transferredLevels,
    //   visionName: updatedTicket?.vision.nombre,
    //   visionDate: updatedTicket?.vision.startDate,
    //   isNewUser: !recipient,
    // });

    return NextResponse.json({
      success: true,
      message: `${transferredTickets.length} ticket(s) transferido(s) exitosamente`,
      ticketsTransferred: transferredTickets.length,
      levels: transferredLevels,
      ticket: updatedTicket ? {
        id: updatedTicket.id,
        level: updatedTicket.level,
        newOwner: {
          name: updatedTicket.owner.nombre,
          email: updatedTicket.owner.email,
        },
        vision: {
          name: updatedTicket.vision.nombre,
          startDate: updatedTicket.vision.startDate,
        },
      } : null,
    });
  } catch (error) {
    console.error('Error executing transfer:', error);
    return NextResponse.json(
      { success: false, error: 'Error al transferir ticket' },
      { status: 500 }
    );
  }
}
