import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * GET /api/mentor/disponibilidad?mentorId=123
 * Obtiene la disponibilidad configurada del mentor para el programa intensivo
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const mentorId = searchParams.get('mentorId');

    if (!mentorId) {
      return NextResponse.json(
        { error: 'mentorId es requerido' },
        { status: 400 }
      );
    }

    // Obtener disponibilidad del mentor para tipo DISCIPLINE (programa intensivo)
    const disponibilidad = await prisma.callAvailability.findMany({
      where: {
        mentorId: parseInt(mentorId),
        type: 'DISCIPLINE',
        isActive: true
      },
      select: {
        id: true,
        dayOfWeek: true,
        startTime: true,
        endTime: true
      },
      orderBy: [
        { dayOfWeek: 'asc' },
        { startTime: 'asc' }
      ]
    });

    return NextResponse.json({
      disponibilidad
    });

  } catch (error) {
    console.error('❌ Error al obtener disponibilidad del mentor:', error);
    return NextResponse.json(
      { error: 'Error al obtener disponibilidad' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
