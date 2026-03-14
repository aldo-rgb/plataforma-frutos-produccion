import { NextRequest, NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET - Obtener el ticket más reciente de un usuario por email (para mostrar después de registro)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email requerido' }, { status: 400 });
    }

    // Buscar usuario por email
    const usuario = await prisma.usuario.findUnique({
      where: { email },
      select: {
        id: true,
        nombre: true,
        email: true,
      }
    });

    if (!usuario) {
      return NextResponse.json({ success: false, error: 'Usuario no encontrado' }, { status: 404 });
    }

    // Buscar el ticket más reciente del usuario
    const ticket = await prisma.ticket.findFirst({
      where: { userId: usuario.id },
      orderBy: { createdAt: 'desc' },
      include: {
        Vision: {
          select: {
            id: true,
            nombre: true,
            startDate: true,
            Organization: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        }
      }
    });

    if (!ticket) {
      return NextResponse.json({ success: false, error: 'Ticket no encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      ticket: {
        id: ticket.id,
        ticketCode: ticket.ticketCode,
        level: ticket.level,
        status: ticket.status,
        visionName: ticket.Vision?.nombre || 'Sin visión',
        organizationName: ticket.Vision?.Organization?.name || 'Impacto Cuántico',
        userName: usuario.nombre,
        userEmail: usuario.email,
        startDate: ticket.Vision?.startDate?.toISOString() || null,
      }
    });
  } catch (error) {
    console.error('Error fetching ticket by email:', error);
    return NextResponse.json({ success: false, error: 'Error interno' }, { status: 500 });
  }
}
