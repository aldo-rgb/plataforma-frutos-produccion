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

    // Solo coordinadores pueden generar códigos
    if (!user || !['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const body = await req.json();
    const { ticketId, visionId, amount, currency = 'MXN', metadata } = body;

    if (!ticketId || !visionId || !amount) {
      return NextResponse.json(
        { error: 'ticketId, visionId y amount son requeridos' },
        { status: 400 }
      );
    }

    // Verificar que el ticket existe
    const ticket = await prisma.visionTicket.findUnique({
      where: { id: ticketId },
    });

    if (!ticket) {
      return NextResponse.json({ error: 'Ticket no encontrado' }, { status: 404 });
    }

    // Generar código único
    const code = generateAccessCode();

    // Crear código de acceso
    const accessCode = await prisma.accessCode.create({
      data: {
        code,
        ticketId,
        visionId,
        generatedBy: user.id,
        amount,
        currency,
        status: 'ACTIVE',
        metadata,
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 días
      },
    });

    return NextResponse.json({
      success: true,
      code: accessCode.code,
      expiresAt: accessCode.expiresAt,
      message: 'Código de acceso generado exitosamente',
    });
  } catch (error) {
    console.error('Error generando código de acceso:', error);
    return NextResponse.json(
      { error: 'Error al generar código' },
      { status: 500 }
    );
  }
}

function generateAccessCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    if (i < 2) code += '-';
  }
  return code;
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 });
    }

    const user = await prisma.usuario.findUnique({
      where: { email: session.user.email },
      select: { id: true, rol: true }
    });

    if (!user || !['COORDINATOR_BASIC', 'COORDINATOR_ADVANCED', 'TRAINER', 'COORDINADOR', 'SCHOOL_ADMIN', 'SUPER_ADMIN'].includes(user.rol)) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const visionId = searchParams.get('visionId');

    const where: any = {
      generatedBy: user.id,
    };

    if (visionId) {
      where.visionId = parseInt(visionId);
    }

    const codes = await prisma.accessCode.findMany({
      where,
      include: {
        VisionTicket: true,
        UsedBy: {
          select: { id: true, nombre: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });

    return NextResponse.json({ codes });
  } catch (error) {
    console.error('Error obteniendo códigos:', error);
    return NextResponse.json(
      { error: 'Error al obtener códigos' },
      { status: 500 }
    );
  }
}
