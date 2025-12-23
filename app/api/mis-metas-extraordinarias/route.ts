import { NextRequest, NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET - Obtener metas activas para un usuario específico
export async function GET(request: NextRequest) {
  try {
    // TODO: Obtener el usuario autenticado y su visión
    // Por ahora, asumimos el primer usuario
    const usuario = await prisma.usuario.findFirst({
      select: {
        id: true,
        vision: true
      }
    });

    if (!usuario) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 });
    }

    const fechaActual = new Date();

    // Buscar metas extraordinarias activas para este usuario
    // Ya sea por visión o asignación individual
    const metas = await prisma.metaExtraordinaria.findMany({
      where: {
        activa: true,
        fechaInicio: { lte: fechaActual },
        fechaFin: { gte: fechaActual },
        OR: [
          { 
            tipoAsignacion: 'VISION',
            visionObjetivo: usuario.vision || undefined
          },
          {
            tipoAsignacion: 'INDIVIDUAL',
            usuarioId: usuario.id
          }
        ]
      },
      orderBy: { fechaFin: 'asc' }
    });

    return NextResponse.json(metas);

  } catch (error) {
    console.error('Error al obtener metas del usuario:', error);
    return NextResponse.json(
      { error: 'Error al obtener metas' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
