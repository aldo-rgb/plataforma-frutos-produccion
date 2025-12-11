import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Obtener todas las metas extraordinarias
export async function GET(request: NextRequest) {
  try {
    const metas = await prisma.metaExtraordinaria.findMany({
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json(metas);

  } catch (error) {
    console.error('Error al obtener metas:', error);
    return NextResponse.json(
      { error: 'Error al obtener metas extraordinarias' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// POST - Crear nueva meta extraordinaria
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // TODO: Obtener el ID del coordinador autenticado
    // Por ahora usamos un ID temporal
    const creadoPor = 1;

    const nuevaMeta = await prisma.metaExtraordinaria.create({
      data: {
        titulo: body.titulo,
        descripcion: body.descripcion,
        puntosReward: body.puntosReward,
        tipoAsignacion: body.tipoAsignacion,
        visionObjetivo: body.visionObjetivo,
        usuarioId: body.usuarioId,
        fechaInicio: new Date(body.fechaInicio),
        fechaFin: new Date(body.fechaFin),
        activa: true,
        creadoPor: creadoPor
      }
    });

    return NextResponse.json(nuevaMeta, { status: 201 });

  } catch (error) {
    console.error('Error al crear meta:', error);
    return NextResponse.json(
      { error: 'Error al crear meta extraordinaria' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
