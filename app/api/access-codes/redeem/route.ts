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
      select: { id: true, rol: true, currentVisionLevel: true }
    });

    if (!user) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const body = await req.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json({ error: 'Código requerido' }, { status: 400 });
    }

    // Buscar código
    const accessCode = await prisma.accessCode.findUnique({
      where: { code: code.toUpperCase().trim() },
      include: {
        VisionTicket: true,
      },
    });

    if (!accessCode) {
      return NextResponse.json({ error: 'Código inválido' }, { status: 404 });
    }

    // Validar estado del código
    if (accessCode.status !== 'ACTIVE') {
      return NextResponse.json({ error: 'Código ya utilizado o expirado' }, { status: 400 });
    }

    // Validar expiración
    if (accessCode.expiresAt && new Date(accessCode.expiresAt) < new Date()) {
      await prisma.accessCode.update({
        where: { id: accessCode.id },
        data: { status: 'EXPIRED' },
      });
      return NextResponse.json({ error: 'Código expirado' }, { status: 400 });
    }

    // Verificar que el ticket aún tiene cupo
    if (accessCode.VisionTicket.vendidos >= accessCode.VisionTicket.cupo) {
      return NextResponse.json({ error: 'Ticket agotado' }, { status: 400 });
    }

    // Transacción para canjear código
    const result = await prisma.$transaction(async (tx) => {
      // Marcar código como usado
      await tx.accessCode.update({
        where: { id: accessCode.id },
        data: {
          status: 'USED',
          usedBy: user.id,
          usedAt: new Date(),
        },
      });

      // Incrementar contador de vendidos
      await tx.visionTicket.update({
        where: { id: accessCode.ticketId },
        data: { vendidos: { increment: 1 } },
      });

      // Registrar compra
      const purchase = await tx.ticketPurchase.create({
        data: {
          ticketId: accessCode.ticketId,
          userId: user.id,
          visionId: accessCode.visionId,
          amount: accessCode.amount,
          currency: accessCode.currency,
          paymentMethod: 'cash',
          status: 'COMPLETED',
          metadata: {
            accessCode: code,
            generatedBy: accessCode.generatedBy,
          },
        },
      });

      // Actualizar estado del estudiante según el nivel
      const level = accessCode.VisionTicket.level;
      let studentStatus = null;
      let currentVisionLevel = null;

      switch (level) {
        case 'BASIC':
          studentStatus = 'BASIC_STUDENT';
          currentVisionLevel = 'BASIC';
          break;
        case 'ADVANCED':
          studentStatus = 'ADVANCED_STUDENT';
          currentVisionLevel = 'ADVANCED';
          break;
        case 'PL':
          studentStatus = 'PL_STUDENT';
          currentVisionLevel = 'PL';
          break;
      }

      await tx.usuario.update({
        where: { id: user.id },
        data: {
          studentStatus,
          currentVisionLevel,
          isActive: true,
        },
      });

      return purchase;
    });

    return NextResponse.json({
      success: true,
      purchase: result,
      level: accessCode.VisionTicket.level,
      message: 'Código canjeado exitosamente',
    });
  } catch (error) {
    console.error('Error canjeando código:', error);
    return NextResponse.json(
      { error: 'Error al canjear código' },
      { status: 500 }
    );
  }
}
